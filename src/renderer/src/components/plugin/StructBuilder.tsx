import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { usePluginStore } from '../../stores'
import {
  createEmptyStruct,
  createEmptyParameter,
  type PluginStruct,
  type PluginParameter,
  type ParamType
} from '../../types/plugin'
import { RAW_MODE_HEADER_READ_ONLY_NOTICE, useIsHeaderReadOnly } from '../../lib/raw-mode'
import {
  ExpandableCard,
  FieldDefaultInput,
  FieldRowHeader,
  LimitInput,
  type FieldProps
} from './EditorParts'
import { toLimit } from './param-types'
import { TypeFields } from './TypeFields'

const PARAM_TYPES: { value: ParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'color', label: 'Color' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'text', label: 'Text (Multiline)' },
  { value: 'note', label: 'Note (Multiline)' },
  { value: 'select', label: 'Select' },
  { value: 'combo', label: 'Combo' },
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
  { value: 'map', label: 'Map' },
  { value: 'icon', label: 'Icon' },
  { value: 'file', label: 'File' },
  { value: 'struct', label: 'Struct' },
  { value: 'array', label: 'Array' }
]

export function StructBuilder() {
  const structs = usePluginStore((s) => s.plugin.structs)
  const addStruct = usePluginStore((s) => s.addStruct)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const isHeaderReadOnly = useIsHeaderReadOnly()

  const handleAddStruct = () => {
    const struct = createEmptyStruct(structs.map((s) => s.name))
    addStruct(struct)
    setExpandedId(struct.id)
  }

  return (
    <fieldset
      disabled={isHeaderReadOnly}
      title={isHeaderReadOnly ? RAW_MODE_HEADER_READ_ONLY_NOTICE : undefined}
      className="flex h-full min-w-0 flex-col"
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold">Structs</h2>
        <Button size="sm" onClick={handleAddStruct}>
          <Plus className="mr-1 h-4 w-4" />
          Add Struct
        </Button>
      </div>
      {isHeaderReadOnly && (
        <p className="px-4 pt-2 text-sm text-muted-foreground">
          {RAW_MODE_HEADER_READ_ONLY_NOTICE}
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {structs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No structs defined</p>
              <p className="text-sm">Click &quot;Add Struct&quot; to create one</p>
            </div>
          ) : (
            structs.map((struct) => (
              <StructCard
                key={struct.id}
                struct={struct}
                expanded={expandedId === struct.id}
                onToggle={() => {
                  setExpandedId(expandedId === struct.id ? null : struct.id)
                }}
                allStructs={structs}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </fieldset>
  )
}

interface StructCardProps {
  struct: PluginStruct
  expanded: boolean
  onToggle: () => void
  allStructs: PluginStruct[]
}

function StructCard({ struct, expanded, onToggle, allStructs }: Readonly<StructCardProps>) {
  const removeStruct = usePluginStore((s) => s.removeStruct)
  const count = struct.parameters.length
  return (
    <ExpandableCard
      name={struct.name}
      summary={`(${String(count)} field${count === 1 ? '' : 's'})`}
      expanded={expanded}
      onToggle={onToggle}
      onDelete={() => {
        removeStruct(struct.id)
      }}
    >
      <StructDetails struct={struct} allStructs={allStructs} />
    </ExpandableCard>
  )
}

function StructDetails({
  struct,
  allStructs
}: Readonly<Pick<StructCardProps, 'struct' | 'allStructs'>>) {
  const updateStruct = usePluginStore((s) => s.updateStruct)
  const addStructParam = usePluginStore((s) => s.addStructParam)
  const updateStructParam = usePluginStore((s) => s.updateStructParam)
  const removeStructParam = usePluginStore((s) => s.removeStructParam)
  return (
    <div className="border-t border-border p-4 space-y-4">
      <div className="space-y-2">
        <Label>Struct Name</Label>
        <Input
          value={struct.name}
          onChange={(event) => {
            updateStruct(struct.id, { name: event.target.value })
          }}
          placeholder="StructName"
        />
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Fields</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              addStructParam(struct.id, createEmptyParameter())
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Field
          </Button>
        </div>

        {struct.parameters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No fields defined</p>
        ) : (
          <div className="space-y-2">
            {struct.parameters.map((param) => (
              <StructParamRow
                key={param.id}
                param={param}
                onUpdate={(updates) => {
                  updateStructParam(struct.id, param.id, updates)
                }}
                onRemove={() => {
                  removeStructParam(struct.id, param.id)
                }}
                allStructs={allStructs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface StructParamRowProps {
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  onRemove: () => void
  allStructs: PluginStruct[]
}

function StructParamRow({ param, onUpdate, onRemove, allStructs }: Readonly<StructParamRowProps>) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded border border-border bg-background p-2">
      <FieldRowHeader
        param={param}
        onUpdate={onUpdate}
        types={PARAM_TYPES}
        namePlaceholder="fieldName"
        expanded={expanded}
        onToggle={() => {
          setExpanded(!expanded)
        }}
        onRemove={onRemove}
      />

      {expanded && <StructParamDetails param={param} onUpdate={onUpdate} allStructs={allStructs} />}
    </div>
  )
}

function StructParamDetails({
  param,
  onUpdate,
  allStructs
}: FieldProps & Readonly<Pick<StructParamRowProps, 'allStructs'>>) {
  return (
    <div className="mt-2 space-y-3 pl-8">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Display Label</Label>
          <Input
            value={param.text}
            onChange={(event) => {
              onUpdate({ text: event.target.value })
            }}
            placeholder="Field Label"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Default Value</Label>
          <FieldDefaultInput param={param} onUpdate={onUpdate} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input
          value={param.desc}
          onChange={(event) => {
            onUpdate({ desc: event.target.value })
          }}
          placeholder="Field description"
          className="h-8"
        />
      </div>

      {/* Number-specific fields */}
      {param.type === 'number' && <NumberLimitFields param={param} onUpdate={onUpdate} />}

      <TypeFields
        param={param}
        onUpdate={onUpdate}
        structNames={allStructs.map((s) => s.name)}
        compact
      />

      {/* File directory */}
      {param.type === 'file' && (
        <div className="space-y-1">
          <Label className="text-xs">Directory (relative to project)</Label>
          <Input
            value={param.dir ?? ''}
            onChange={(event) => {
              onUpdate({ dir: event.target.value })
            }}
            placeholder="img/pictures"
            className="h-8"
          />
        </div>
      )}
    </div>
  )
}

function NumberLimitFields({ param, onUpdate }: FieldProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
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
        onChange={(text) => {
          onUpdate({ decimals: toLimit(text) })
        }}
      />
    </div>
  )
}
