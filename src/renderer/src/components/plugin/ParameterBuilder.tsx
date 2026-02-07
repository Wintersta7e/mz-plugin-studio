import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ScrollArea } from '../ui/scroll-area'
import { usePluginStore, useProjectStore } from '../../stores'
import { createEmptyParameter, type PluginParameter, type ParamType } from '../../types/plugin'
import { generateParameterComment } from '../../lib/generator'
import { cn } from '../../lib/utils'

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
  { value: 'struct', label: 'Struct' },
  { value: 'array', label: 'Array' }
]

export function ParameterBuilder() {
  const parameters = usePluginStore((s) => s.plugin.parameters)
  const structs = usePluginStore((s) => s.plugin.structs)
  const addParameter = usePluginStore((s) => s.addParameter)
  const updateParameter = usePluginStore((s) => s.updateParameter)
  const removeParameter = usePluginStore((s) => s.removeParameter)
  const switches = useProjectStore((s) => s.switches)
  const variables = useProjectStore((s) => s.variables)
  const actors = useProjectStore((s) => s.actors)
  const items = useProjectStore((s) => s.items)

  const customCode = usePluginStore((s) => s.plugin.customCode)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleAddParameter = () => {
    const param = createEmptyParameter()
    addParameter(param)
    setExpandedId(param.id)

    // Inject parameter usage comment into customCode
    const comment = generateParameterComment(param)
    const current = customCode || ''
    setCustomCode(current ? `${current}\n\n${comment}` : comment)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Create a minimal drag image
    const dragImage = document.createElement('div')
    dragImage.style.cssText = 'position:absolute;top:-1000px;width:200px;height:40px;background:#333;border-radius:8px;'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 100, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const fromIndex = parameters.findIndex((p) => p.id === draggedId)
    const toIndex = parameters.findIndex((p) => p.id === targetId)

    usePluginStore.getState().reorderParameters(fromIndex, toIndex)
    setDraggedId(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold">Parameters</h2>
        <Button size="sm" onClick={handleAddParameter}>
          <Plus className="mr-1 h-4 w-4" />
          Add Parameter
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {parameters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No parameters defined</p>
              <p className="text-sm">Click "Add Parameter" to create one</p>
            </div>
          ) : (
            parameters.map((param) => (
              <ParameterCard
                key={param.id}
                param={param}
                expanded={expandedId === param.id}
                onToggle={() => setExpandedId(expandedId === param.id ? null : param.id)}
                onUpdate={(updates) => {
                  updateParameter(param.id, updates)
                  // Sync comment in customCode when parameter name or type changes
                  if (
                    (updates.name !== undefined && updates.name !== param.name) ||
                    (updates.type !== undefined && updates.type !== param.type)
                  ) {
                    const current = customCode || ''
                    const oldComment = generateParameterComment(param)
                    const newComment = generateParameterComment({ ...param, ...updates } as PluginParameter)
                    const updated = current.replace(oldComment, newComment)
                    if (updated !== current) {
                      setCustomCode(updated)
                    }
                  }
                }}
                onDelete={() => removeParameter(param.id)}
                onDragStart={(e) => handleDragStart(e, param.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, param.id)}
                isDragging={draggedId === param.id}
                structs={structs.map((s) => s.name)}
                switches={switches}
                variables={variables}
                actors={actors}
                items={items}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface ParameterCardProps {
  param: PluginParameter
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<PluginParameter>) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  isDragging: boolean
  structs: string[]
  switches: { id: number; name: string }[]
  variables: { id: number; name: string }[]
  actors: { id: number; name: string }[]
  items: { id: number; name: string }[]
}

function ParameterCard({
  param,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  structs,
  switches,
  variables,
  actors,
  items
}: ParameterCardProps) {
  // Helper to get the appropriate game data array based on param type
  const getGameDataOptions = () => {
    switch (param.type) {
      case 'variable':
        return variables
      case 'switch':
        return switches
      case 'actor':
        return actors
      case 'item':
        return items
      default:
        return []
    }
  }

  const isGameDataType = ['variable', 'switch', 'actor', 'item'].includes(param.type)
  const gameDataOptions = getGameDataOptions()
  const hasProjectData = gameDataOptions.length > 0
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card transition-colors',
        isDragging && 'opacity-50'
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 p-3"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{param.text || param.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">({param.type})</span>
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
              <Label>Internal Name</Label>
              <Input
                value={param.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="paramName"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                value={param.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Parameter Label"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={param.desc}
              onChange={(e) => onUpdate({ desc: e.target.value })}
              placeholder="Help text for this parameter"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={param.type}
                onValueChange={(value: ParamType) => onUpdate({ type: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Default Value</Label>
              {isGameDataType ? (
                hasProjectData ? (
                  <Select
                    value={String(param.default ?? '')}
                    onValueChange={(v) => onUpdate({ default: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${param.type}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None (0)</SelectItem>
                      {gameDataOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {opt.id}: {opt.name || `(unnamed ${param.type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    disabled
                    placeholder="Load project first"
                    className="text-muted-foreground"
                  />
                )
              ) : param.type === 'boolean' ? (
                <div className="flex items-center h-10">
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
                  placeholder="Default value"
                />
              )}
            </div>
          </div>

          {/* Boolean-specific fields: @on/@off labels */}
          {param.type === 'boolean' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>On Label</Label>
                <Input
                  value={param.onLabel || ''}
                  onChange={(e) => onUpdate({ onLabel: e.target.value || undefined })}
                  placeholder="ON"
                />
              </div>
              <div className="space-y-2">
                <Label>Off Label</Label>
                <Input
                  value={param.offLabel || ''}
                  onChange={(e) => onUpdate({ offLabel: e.target.value || undefined })}
                  placeholder="OFF"
                />
              </div>
            </div>
          )}

          {/* Number-specific fields */}
          {param.type === 'number' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min</Label>
                <Input
                  type="number"
                  value={param.min ?? ''}
                  onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No min"
                />
              </div>
              <div className="space-y-2">
                <Label>Max</Label>
                <Input
                  type="number"
                  value={param.max ?? ''}
                  onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No max"
                />
              </div>
              <div className="space-y-2">
                <Label>Decimals</Label>
                <Input
                  type="number"
                  value={param.decimals ?? ''}
                  onChange={(e) => onUpdate({ decimals: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Select options */}
          {param.type === 'select' && (
            <div className="space-y-2">
              <Label>Options (one per line, format: value|label or just label)</Label>
              <Textarea
                value={
                  param.options?.map((o) => (o.value !== o.text ? `${o.value}|${o.text}` : o.text)).join('\n') || ''
                }
                onChange={(e) => {
                  const options = e.target.value.split('\n').filter(Boolean).map((line) => {
                    const [value, text] = line.includes('|') ? line.split('|') : [line, line]
                    return { value: value.trim(), text: (text || value).trim() }
                  })
                  onUpdate({ options })
                }}
                placeholder={"option1|Option 1\noption2|Option 2"}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Struct reference */}
          {param.type === 'struct' && (
            <div className="space-y-2">
              <Label>Struct Type</Label>
              <Select
                value={param.structType || ''}
                onValueChange={(value) => onUpdate({ structType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select struct..." />
                </SelectTrigger>
                <SelectContent>
                  {structs.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Array element type */}
          {param.type === 'array' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Array Element Type</Label>
                <Select
                  value={param.arrayType || 'string'}
                  onValueChange={(value) => onUpdate({ arrayType: value as ParamType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="note">Note (Multiline)</SelectItem>
                    <SelectItem value="select">Select/Combo</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="actor">Actor</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="weapon">Weapon</SelectItem>
                    <SelectItem value="armor">Armor</SelectItem>
                    <SelectItem value="enemy">Enemy</SelectItem>
                    <SelectItem value="troop">Troop</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="animation">Animation</SelectItem>
                    <SelectItem value="tileset">Tileset</SelectItem>
                    <SelectItem value="common_event">Common Event</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="struct">Struct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* If array of structs, show struct type selector */}
              {param.arrayType === 'struct' && (
                <div className="space-y-2">
                  <Label>Struct Type</Label>
                  <Select
                    value={param.structType || ''}
                    onValueChange={(value) => onUpdate({ structType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select struct..." />
                    </SelectTrigger>
                    <SelectContent>
                      {structs.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* File directory */}
          {param.type === 'file' && (
            <div className="space-y-2">
              <Label>Directory (relative to project)</Label>
              <Input
                value={param.dir || ''}
                onChange={(e) => onUpdate({ dir: e.target.value })}
                placeholder="img/pictures"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
