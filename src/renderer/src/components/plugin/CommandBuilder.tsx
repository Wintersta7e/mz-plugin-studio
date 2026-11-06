import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { usePluginStore } from '../../stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  type PluginCommand,
  type PluginParameter
} from '../../types/plugin'
import { generateCommandSkeleton } from '../../lib/generator'
import { RAW_MODE_HEADER_READ_ONLY_NOTICE, useIsHeaderReadOnly } from '../../lib/raw-mode'
import {
  ExpandableCard,
  FieldDefaultInput,
  FieldRowHeader,
  LimitInput,
  type FieldProps
} from './EditorParts'
import { ARG_TYPES, toLimit } from './param-types'
import { TypeFields } from './TypeFields'

/**
The parts of a command's skeleton that name it, escaped exactly as the skeleton writes them.
*/
function skeletonMarkers(command: PluginCommand): readonly [string, string, string] {
  const lines = generateCommandSkeleton(command).split('\n', 3)
  const register = lines.at(1) ?? ''
  const call = register.slice(
    register.indexOf('registerCommand('),
    register.lastIndexOf("', function(args) {") + 1
  )
  return [lines.at(0) ?? '', call, (lines.at(2) ?? '').trim()]
}

/**
The custom code with the command's skeleton renamed after `name`.
*/
function renameSkeleton(code: string, command: PluginCommand, name: string): string {
  const [header, call, todo] = skeletonMarkers(command)
  const [newHeader, newCall, newTodo] = skeletonMarkers({ ...command, name })
  // A function inserts the name literally: a string would expand $' $` $& in it
  return code
    .replace(header, () => newHeader)
    .replace(call, () => newCall)
    .replace(todo, () => newTodo)
}

/**
Adds an empty command and its skeleton at the end of the custom code; `onAdded` gets its id.
*/
function useAddCommand(onAdded: (id: string) => void): () => void {
  const addCommand = usePluginStore((s) => s.addCommand)
  const customCode = usePluginStore((s) => s.plugin.customCode)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)
  return () => {
    const command = createEmptyCommand()
    addCommand(command)
    onAdded(command.id)
    const skeleton = generateCommandSkeleton(command)
    const current = customCode ?? ''
    setCustomCode(current ? `${current}\n\n${skeleton}` : skeleton)
  }
}

/**
Updates a command; a new name also renames its skeleton in the custom code.
*/
function useUpdateCommand(command: PluginCommand): (updates: Partial<PluginCommand>) => void {
  const updateCommand = usePluginStore((s) => s.updateCommand)
  const customCode = usePluginStore((s) => s.plugin.customCode)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)
  return (updates) => {
    updateCommand(command.id, updates)
    if (updates.name === undefined || updates.name === command.name) return
    const current = customCode ?? ''
    const updated = renameSkeleton(current, command, updates.name)
    if (updated !== current) {
      setCustomCode(updated)
    }
  }
}

export function CommandBuilder() {
  const commands = usePluginStore((s) => s.plugin.commands)
  const structs = usePluginStore((s) => s.plugin.structs)
  const structNames = useMemo(() => structs.map((s) => s.name), [structs])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const isHeaderReadOnly = useIsHeaderReadOnly()
  const handleAddCommand = useAddCommand(setExpandedId)

  return (
    <fieldset
      disabled={isHeaderReadOnly}
      title={isHeaderReadOnly ? RAW_MODE_HEADER_READ_ONLY_NOTICE : undefined}
      className="flex h-full min-w-0 flex-col"
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold">Plugin Commands</h2>
        <Button size="sm" data-testid="command-add" onClick={handleAddCommand}>
          <Plus className="mr-1 h-4 w-4" />
          Add Command
        </Button>
      </div>
      {isHeaderReadOnly && (
        <p className="px-4 pt-2 text-sm text-muted-foreground">
          {RAW_MODE_HEADER_READ_ONLY_NOTICE}
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No commands defined</p>
              <p className="text-sm">Click &quot;Add Command&quot; to create one</p>
            </div>
          ) : (
            commands.map((command) => (
              <CommandCard
                key={command.id}
                command={command}
                expanded={expandedId === command.id}
                structNames={structNames}
                onToggle={() => {
                  setExpandedId(expandedId === command.id ? null : command.id)
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </fieldset>
  )
}

interface CommandCardProps {
  command: PluginCommand
  expanded: boolean
  structNames: string[]
  onToggle: () => void
}

function CommandCard({ command, expanded, structNames, onToggle }: Readonly<CommandCardProps>) {
  const removeCommand = usePluginStore((s) => s.removeCommand)
  const count = command.args.length
  return (
    <ExpandableCard
      name={command.text || command.name}
      summary={`(${String(count)} arg${count === 1 ? '' : 's'})`}
      expanded={expanded}
      onToggle={onToggle}
      onDelete={() => {
        removeCommand(command.id)
      }}
    >
      <CommandDetails command={command} structNames={structNames} />
    </ExpandableCard>
  )
}

function CommandDetails({
  command,
  structNames
}: Readonly<Pick<CommandCardProps, 'command' | 'structNames'>>) {
  const onUpdate = useUpdateCommand(command)
  return (
    <div className="border-t border-border p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Command Name</Label>
          <Input
            value={command.name}
            onChange={(event) => {
              onUpdate({ name: event.target.value })
            }}
            placeholder="myCommand"
          />
        </div>
        <div className="space-y-2">
          <Label>Display Label</Label>
          <Input
            value={command.text}
            onChange={(event) => {
              onUpdate({ text: event.target.value })
            }}
            placeholder="My Command"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={command.desc}
          onChange={(event) => {
            onUpdate({ desc: event.target.value })
          }}
          placeholder="What this command does"
        />
      </div>

      <CommandArguments command={command} structNames={structNames} />
    </div>
  )
}

function CommandArguments({
  command,
  structNames
}: Readonly<Pick<CommandCardProps, 'command' | 'structNames'>>) {
  const addCommandArg = usePluginStore((s) => s.addCommandArg)
  const updateCommandArg = usePluginStore((s) => s.updateCommandArg)
  const removeCommandArg = usePluginStore((s) => s.removeCommandArg)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Arguments</Label>
        <Button
          variant="outline"
          size="sm"
          data-testid="command-arg-add"
          onClick={() => {
            addCommandArg(command.id, createEmptyParameter())
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Argument
        </Button>
      </div>

      {command.args.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No arguments defined</p>
      ) : (
        <div className="space-y-2">
          {command.args.map((arg) => (
            <ArgumentRow
              key={arg.id}
              arg={arg}
              structNames={structNames}
              onUpdate={(updates) => {
                updateCommandArg(command.id, arg.id, updates)
              }}
              onRemove={() => {
                removeCommandArg(command.id, arg.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ArgumentRowProps {
  arg: PluginParameter
  structNames: string[]
  onUpdate: (updates: Partial<PluginParameter>) => void
  onRemove: () => void
}

function ArgumentRow({ arg, structNames, onUpdate, onRemove }: Readonly<ArgumentRowProps>) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded border border-border bg-background p-2">
      <FieldRowHeader
        param={arg}
        onUpdate={onUpdate}
        types={ARG_TYPES}
        namePlaceholder="argName"
        expanded={expanded}
        onToggle={() => {
          setExpanded(!expanded)
        }}
        onRemove={onRemove}
      />

      {expanded && <ArgumentDetails param={arg} structNames={structNames} onUpdate={onUpdate} />}
    </div>
  )
}

function ArgumentDetails({
  param,
  structNames,
  onUpdate
}: FieldProps & Readonly<Pick<ArgumentRowProps, 'structNames'>>) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 pl-8">
      <div className="space-y-1">
        <Label className="text-xs">Display Label</Label>
        <Input
          value={param.text}
          onChange={(event) => {
            onUpdate({ text: event.target.value })
          }}
          placeholder="Argument Label"
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Default Value</Label>
        <FieldDefaultInput param={param} onUpdate={onUpdate} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Description</Label>
        <Input
          value={param.desc}
          onChange={(event) => {
            onUpdate({ desc: event.target.value })
          }}
          placeholder="Argument description"
          className="h-8"
        />
      </div>

      <TypeFields
        param={param}
        onUpdate={onUpdate}
        structNames={structNames}
        compact
        className="col-span-2"
      />

      {/* Boolean-specific: @on/@off labels */}
      {param.type === 'boolean' && <BooleanLabelFields param={param} onUpdate={onUpdate} />}

      {/* Number-specific: min, max, decimals */}
      {param.type === 'number' && <NumberLimitFields param={param} onUpdate={onUpdate} />}

      {/* File-specific: directory */}
      {param.type === 'file' && (
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Directory</Label>
          <Input
            value={param.dir ?? ''}
            onChange={(event) => {
              onUpdate({ dir: event.target.value || undefined })
            }}
            placeholder="img/pictures"
            className="h-8"
          />
        </div>
      )}
    </div>
  )
}

function BooleanLabelFields({ param, onUpdate }: FieldProps) {
  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">On Label</Label>
        <Input
          value={param.onLabel ?? ''}
          onChange={(event) => {
            onUpdate({ onLabel: event.target.value || undefined })
          }}
          placeholder="ON"
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Off Label</Label>
        <Input
          value={param.offLabel ?? ''}
          onChange={(event) => {
            onUpdate({ offLabel: event.target.value || undefined })
          }}
          placeholder="OFF"
          className="h-8"
        />
      </div>
    </>
  )
}

function NumberLimitFields({ param, onUpdate }: FieldProps) {
  return (
    <>
      <LimitInput
        label="Min"
        value={param.min}
        placeholder="No min"
        onChange={(text) => {
          onUpdate({ min: toLimit(text) })
        }}
      />
      <LimitInput
        label="Max"
        value={param.max}
        placeholder="No max"
        onChange={(text) => {
          onUpdate({ max: toLimit(text) })
        }}
      />
      <LimitInput
        label="Decimals"
        value={param.decimals}
        placeholder="0"
        min={0}
        className="col-span-2 space-y-1"
        onChange={(text) => {
          onUpdate({ decimals: toLimit(text) })
        }}
      />
    </>
  )
}
