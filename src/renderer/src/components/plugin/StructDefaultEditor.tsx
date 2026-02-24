import { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import {
  buildStructDefault,
  parseStructDefault,
  validateStructDefault,
  fillFromStructDefaults
} from '../../lib/struct-defaults'
import type { PluginStruct, PluginParameter } from '../../types/plugin'

interface StructDefaultEditorProps {
  struct: PluginStruct
  value: string
  onChange: (jsonStr: string) => void
}

const NUMERIC_TYPES = new Set([
  'number',
  'variable',
  'switch',
  'actor',
  'class',
  'skill',
  'item',
  'weapon',
  'armor',
  'enemy',
  'troop',
  'state',
  'animation',
  'tileset',
  'common_event',
  'icon',
  'map'
])

export function StructDefaultEditor({ struct, value, onChange }: StructDefaultEditorProps) {
  const [fields, setFields] = useState<Record<string, string>>(() =>
    parseStructDefault(typeof value === 'string' ? value : '')
  )

  useEffect(() => {
    setFields(parseStructDefault(typeof value === 'string' ? value : ''))
  }, [value, struct.id])

  const updateField = (name: string, val: string) => {
    const next = { ...fields, [name]: val }
    setFields(next)
    onChange(buildStructDefault(struct, next))
  }

  const handleFillDefaults = () => {
    const filled = fillFromStructDefaults(struct)
    setFields(filled)
    onChange(buildStructDefault(struct, filled))
  }

  const handleClear = () => {
    setFields({})
    onChange('')
  }

  const validation = validateStructDefault(typeof value === 'string' ? value : '', struct)

  const visibleFields = struct.parameters.filter((f) => f.type !== 'hidden')

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">Default Value</Label>

      {visibleFields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No visible fields in this struct. Add fields in the Structs tab.
        </p>
      ) : (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          {visibleFields.map((field) => (
            <StructFieldInput
              key={field.id}
              field={field}
              value={fields[field.name] ?? ''}
              onChange={(val) => updateField(field.name, val)}
            />
          ))}
        </div>
      )}

      {value && typeof value === 'string' && value.trim() !== '' && (
        <div className="flex items-center gap-1.5 text-xs">
          {validation.status === 'valid' && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600">Valid JSON</span>
            </>
          )}
          {validation.status === 'warning' && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-yellow-600">{validation.errors[0]}</span>
            </>
          )}
          {validation.status === 'error' && (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-red-600">{validation.errors[0]}</span>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={handleFillDefaults}>
          Fill from struct defaults
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleClear}
          disabled={!value}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

function StructFieldInput({
  field,
  value,
  onChange
}: {
  field: PluginParameter
  value: string
  onChange: (val: string) => void
}) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs">{field.text || field.name}</Label>
        <Switch
          checked={value === 'true'}
          onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
        />
      </div>
    )
  }

  if (field.type === 'select' && field.options && field.options.length > 0) {
    return (
      <div className="flex items-center gap-2">
        <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (NUMERIC_TYPES.has(field.type)) {
    return (
      <div className="flex items-center gap-2">
        <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            field.default !== undefined && field.default !== '' ? String(field.default) : '0'
          }
          className="h-8 text-xs"
          min={field.min}
          max={field.max}
        />
      </div>
    )
  }

  const isMultiline = field.type === 'note' || field.type === 'text'
  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={String(field.default ?? '')}
          className="h-16 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          rows={2}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === 'struct' ? '{"key":"value"}' : String(field.default ?? '')}
          className="h-8 text-xs"
        />
      )}
    </div>
  )
}
