import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ScrollArea } from '../ui/scroll-area'
import { usePluginStore } from '../../stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  type PluginCommand,
  type PluginParameter,
  type ParamType
} from '../../types/plugin'
import { generateCommandSkeleton } from '../../lib/generator'

const ARG_TYPES: { value: ParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select/Combo' },
  { value: 'note', label: 'Note (Multiline)' },
  { value: 'variable', label: 'Variable' },
  { value: 'switch', label: 'Switch' },
  { value: 'actor', label: 'Actor' },
  { value: 'class', label: 'Class' },
  { value: 'skill', label: 'Skill' },
  { value: 'item', label: 'Item' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'armor', label: 'Armor' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'troop', label: 'Troop' },
  { value: 'state', label: 'State' },
  { value: 'animation', label: 'Animation' },
  { value: 'tileset', label: 'Tileset' },
  { value: 'common_event', label: 'Common Event' },
  { value: 'file', label: 'File' },
  { value: 'struct', label: 'Struct' },
  { value: 'array', label: 'Array' }
]

export function CommandBuilder() {
  const commands = usePluginStore((s) => s.plugin.commands)
  const addCommand = usePluginStore((s) => s.addCommand)
  const updateCommand = usePluginStore((s) => s.updateCommand)
  const removeCommand = usePluginStore((s) => s.removeCommand)
  const addCommandArg = usePluginStore((s) => s.addCommandArg)
  const updateCommandArg = usePluginStore((s) => s.updateCommandArg)
  const removeCommandArg = usePluginStore((s) => s.removeCommandArg)

  const customCode = usePluginStore((s) => s.plugin.customCode)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleAddCommand = () => {
    const cmd = createEmptyCommand()
    addCommand(cmd)
    setExpandedId(cmd.id)

    // Inject command skeleton into customCode
    const skeleton = generateCommandSkeleton(cmd)
    const current = customCode || ''
    setCustomCode(current ? `${current}\n\n${skeleton}` : skeleton)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold">Plugin Commands</h2>
        <Button size="sm" onClick={handleAddCommand}>
          <Plus className="mr-1 h-4 w-4" />
          Add Command
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No commands defined</p>
              <p className="text-sm">Click "Add Command" to create one</p>
            </div>
          ) : (
            commands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                expanded={expandedId === cmd.id}
                onToggle={() => setExpandedId(expandedId === cmd.id ? null : cmd.id)}
                onUpdate={(updates) => {
                  updateCommand(cmd.id, updates)
                  // Sync skeleton in customCode when command name changes
                  if (updates.name !== undefined && updates.name !== cmd.name) {
                    const current = customCode || ''
                    const updated = current
                      .replace(`// --- ${cmd.name} ---`, `// --- ${updates.name} ---`)
                      .replace(`registerCommand(PLUGIN_NAME, '${cmd.name}'`, `registerCommand(PLUGIN_NAME, '${updates.name}'`)
                      .replace(`// TODO: Implement ${cmd.name} logic`, `// TODO: Implement ${updates.name} logic`)
                    if (updated !== current) {
                      setCustomCode(updated)
                    }
                  }
                }}
                onDelete={() => removeCommand(cmd.id)}
                onAddArg={() => addCommandArg(cmd.id, createEmptyParameter())}
                onUpdateArg={(argId, updates) => updateCommandArg(cmd.id, argId, updates)}
                onRemoveArg={(argId) => removeCommandArg(cmd.id, argId)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface CommandCardProps {
  command: PluginCommand
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<PluginCommand>) => void
  onDelete: () => void
  onAddArg: () => void
  onUpdateArg: (argId: string, updates: Partial<PluginParameter>) => void
  onRemoveArg: (argId: string) => void
}

function CommandCard({
  command,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddArg,
  onUpdateArg,
  onRemoveArg
}: CommandCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 p-3"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{command.text || command.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            ({command.args.length} arg{command.args.length !== 1 ? 's' : ''})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Command Name</Label>
              <Input
                value={command.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="myCommand"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                value={command.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="My Command"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={command.desc}
              onChange={(e) => onUpdate({ desc: e.target.value })}
              placeholder="What this command does"
            />
          </div>

          {/* Arguments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Arguments</Label>
              <Button variant="outline" size="sm" onClick={onAddArg}>
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
                    onUpdate={(updates) => onUpdateArg(arg.id, updates)}
                    onRemove={() => onRemoveArg(arg.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ArgumentRowProps {
  arg: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  onRemove: () => void
}

function ArgumentRow({ arg, onUpdate, onRemove }: ArgumentRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded border border-border bg-background p-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        <Input
          value={arg.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="argName"
          className="h-8 flex-1"
        />

        <Select
          value={arg.type}
          onValueChange={(value: ParamType) => onUpdate({ type: value })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARG_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-2 pl-8">
          <div className="space-y-1">
            <Label className="text-xs">Display Label</Label>
            <Input
              value={arg.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Argument Label"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default Value</Label>
            {arg.type === 'boolean' ? (
              <div className="flex items-center h-8">
                <Switch
                  checked={arg.default === true || arg.default === 'true'}
                  onCheckedChange={(checked) => onUpdate({ default: checked })}
                />
              </div>
            ) : (
              <Input
                value={String(arg.default || '')}
                onChange={(e) => {
                  const val = arg.type === 'number' ? Number(e.target.value) : e.target.value
                  onUpdate({ default: val })
                }}
                type={arg.type === 'number' ? 'number' : 'text'}
                placeholder="Default"
                className="h-8"
              />
            )}
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={arg.desc}
              onChange={(e) => onUpdate({ desc: e.target.value })}
              placeholder="Argument description"
              className="h-8"
            />
          </div>

          {/* Boolean-specific: @on/@off labels */}
          {arg.type === 'boolean' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">On Label</Label>
                <Input
                  value={arg.onLabel || ''}
                  onChange={(e) => onUpdate({ onLabel: e.target.value || undefined })}
                  placeholder="ON"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Off Label</Label>
                <Input
                  value={arg.offLabel || ''}
                  onChange={(e) => onUpdate({ offLabel: e.target.value || undefined })}
                  placeholder="OFF"
                  className="h-8"
                />
              </div>
            </>
          )}

          {/* Number-specific: min, max, decimals */}
          {arg.type === 'number' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Min</Label>
                <Input
                  type="number"
                  value={arg.min ?? ''}
                  onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No min"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  value={arg.max ?? ''}
                  onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No max"
                  className="h-8"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Decimals</Label>
                <Input
                  type="number"
                  value={arg.decimals ?? ''}
                  onChange={(e) => onUpdate({ decimals: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                  className="h-8"
                />
              </div>
            </>
          )}

          {/* File-specific: directory */}
          {arg.type === 'file' && (
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Directory</Label>
              <Input
                value={arg.dir || ''}
                onChange={(e) => onUpdate({ dir: e.target.value || undefined })}
                placeholder="img/pictures"
                className="h-8"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
