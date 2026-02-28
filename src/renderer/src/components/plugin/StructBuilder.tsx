import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ScrollArea } from '../ui/scroll-area'
import { usePluginStore } from '../../stores'
import {
  createEmptyStruct,
  createEmptyParameter,
  type PluginStruct,
  type PluginParameter,
  type ParamType
} from '../../types/plugin'

const PARAM_TYPES: { value: ParamType; label: string }[] = [
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
  { value: 'color', label: 'Color' },
  { value: 'text', label: 'Text (Multiline)' },
  { value: 'struct', label: 'Struct' },
  { value: 'array', label: 'Array' }
]

export function StructBuilder() {
  const structs = usePluginStore((s) => s.plugin.structs)
  const addStruct = usePluginStore((s) => s.addStruct)
  const updateStruct = usePluginStore((s) => s.updateStruct)
  const removeStruct = usePluginStore((s) => s.removeStruct)
  const addStructParam = usePluginStore((s) => s.addStructParam)
  const updateStructParam = usePluginStore((s) => s.updateStructParam)
  const removeStructParam = usePluginStore((s) => s.removeStructParam)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleAddStruct = () => {
    const struct = createEmptyStruct()
    addStruct(struct)
    setExpandedId(struct.id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold">Structs</h2>
        <Button size="sm" onClick={handleAddStruct}>
          <Plus className="mr-1 h-4 w-4" />
          Add Struct
        </Button>
      </div>

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
                onToggle={() => setExpandedId(expandedId === struct.id ? null : struct.id)}
                onUpdate={(updates) => updateStruct(struct.id, updates)}
                onDelete={() => removeStruct(struct.id)}
                onAddParam={() => addStructParam(struct.id, createEmptyParameter())}
                onUpdateParam={(paramId, updates) => updateStructParam(struct.id, paramId, updates)}
                onRemoveParam={(paramId) => removeStructParam(struct.id, paramId)}
                allStructs={structs}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface StructCardProps {
  struct: PluginStruct
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<PluginStruct>) => void
  onDelete: () => void
  onAddParam: () => void
  onUpdateParam: (paramId: string, updates: Partial<PluginParameter>) => void
  onRemoveParam: (paramId: string) => void
  allStructs: PluginStruct[]
}

function StructCard({
  struct,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddParam,
  onUpdateParam,
  onRemoveParam,
  allStructs
}: StructCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex cursor-pointer items-center gap-2 p-3" onClick={onToggle}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{struct.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            ({struct.parameters.length} field{struct.parameters.length !== 1 ? 's' : ''})
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
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 space-y-4">
              <div className="space-y-2">
                <Label>Struct Name</Label>
                <Input
                  value={struct.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="StructName"
                />
              </div>

              {/* Parameters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button variant="outline" size="sm" onClick={onAddParam}>
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
                        onUpdate={(updates) => onUpdateParam(param.id, updates)}
                        onRemove={() => onRemoveParam(param.id)}
                        allStructs={allStructs}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface StructParamRowProps {
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  onRemove: () => void
  allStructs: PluginStruct[]
}

function StructParamRow({ param, onUpdate, onRemove, allStructs }: StructParamRowProps) {
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
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        <Input
          value={param.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="fieldName"
          className="h-8 flex-1"
        />

        <Select value={param.type} onValueChange={(value: ParamType) => onUpdate({ type: value })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARAM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-3 pl-8">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Display Label</Label>
              <Input
                value={param.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Field Label"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Value</Label>
              {param.type === 'boolean' ? (
                <div className="flex items-center h-8">
                  <Switch
                    checked={param.default === true || param.default === 'true'}
                    onCheckedChange={(checked) => onUpdate({ default: checked })}
                  />
                </div>
              ) : (
                <Input
                  value={String(param.default || '')}
                  onChange={(e) => {
                    const val = param.type === 'number' ? Number(e.target.value) : e.target.value
                    onUpdate({ default: val })
                  }}
                  type={param.type === 'number' ? 'number' : 'text'}
                  placeholder="Default"
                  className="h-8"
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={param.desc}
              onChange={(e) => onUpdate({ desc: e.target.value })}
              placeholder="Field description"
              className="h-8"
            />
          </div>

          {/* Number-specific fields */}
          {param.type === 'number' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min</Label>
                <Input
                  type="number"
                  value={param.min ?? ''}
                  onChange={(e) =>
                    onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="No min"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  value={param.max ?? ''}
                  onChange={(e) =>
                    onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="No max"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Decimals</Label>
                <Input
                  type="number"
                  value={param.decimals ?? ''}
                  onChange={(e) =>
                    onUpdate({ decimals: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="0"
                  min={0}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {/* Select options */}
          {param.type === 'select' && (
            <div className="space-y-1">
              <Label className="text-xs">
                Options (one per line, format: value|label or just label)
              </Label>
              <Textarea
                value={
                  param.options
                    ?.map((o) => (o.value !== o.text ? `${o.value}|${o.text}` : o.text))
                    .join('\n') || ''
                }
                onChange={(e) => {
                  const options = e.target.value
                    .split('\n')
                    .filter(Boolean)
                    .map((line) => {
                      const [value, text] = line.includes('|') ? line.split('|') : [line, line]
                      return { value: value.trim(), text: (text || value).trim() }
                    })
                  onUpdate({ options })
                }}
                placeholder={'option1|Option 1\noption2|Option 2'}
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Struct reference */}
          {param.type === 'struct' && (
            <div className="space-y-1">
              <Label className="text-xs">Struct Type</Label>
              <Select
                value={param.structType || ''}
                onValueChange={(value) => onUpdate({ structType: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select struct..." />
                </SelectTrigger>
                <SelectContent>
                  {allStructs.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File directory */}
          {param.type === 'file' && (
            <div className="space-y-1">
              <Label className="text-xs">Directory (relative to project)</Label>
              <Input
                value={param.dir || ''}
                onChange={(e) => onUpdate({ dir: e.target.value })}
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
