import { useState } from 'react'
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
  onChange: (jsonString: string) => void
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

/**
The field values parsed from `value`, parsed again whenever the value or the struct changes
*/
function useStructFields(
  value: string,
  structId: string
): [Record<string, string>, (fields: Record<string, string>) => void] {
  const [fields, setFields] = useState<Record<string, string>>(() => parseStructDefault(value))
  const [parsedFrom, setParsedFrom] = useState({ value, structId })
  if (parsedFrom.value !== value || parsedFrom.structId !== structId) {
    setParsedFrom({ value, structId })
    setFields(parseStructDefault(value))
  }
  return [fields, setFields]
}

export function StructDefaultEditor({
  struct,
  value,
  onChange
}: Readonly<StructDefaultEditorProps>) {
  const text = typeof value === 'string' ? value : ''
  const [fields, setFields] = useStructFields(text, struct.id)

  const updateField = (name: string, value_: string) => {
    const next = { ...fields, [name]: value_ }
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
              onChange={(value_) => {
                updateField(field.name, value_)
              }}
            />
          ))}
        </div>
      )}

      {text.trim() !== '' && <ValidationNote value={text} struct={struct} />}

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

function ValidationNote({
  value,
  struct
}: Readonly<Pick<StructDefaultEditorProps, 'value' | 'struct'>>) {
  const validation = validateStructDefault(value, struct)
  return (
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
  )
}

type StructFieldInputProps = Readonly<{
  field: PluginParameter
  value: string
  onChange: (value_: string) => void
}>

function StructFieldInput({ field, value, onChange }: StructFieldInputProps) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs">{field.text || field.name}</Label>
        <Switch
          checked={value === 'true'}
          onCheckedChange={(checked) => {
            onChange(checked ? 'true' : 'false')
          }}
        />
      </div>
    )
  }
  if (field.type === 'select' && field.options && field.options.length > 0) {
    return (
      <SelectFieldInput field={field} options={field.options} value={value} onChange={onChange} />
    )
  }
  if (NUMERIC_TYPES.has(field.type)) {
    return <NumericFieldInput field={field} value={value} onChange={onChange} />
  }
  return <TextFieldInput field={field} value={value} onChange={onChange} />
}

// Radix Select crashes on value="" — use sentinel for empty state (BUG-14)
const EMPTY_SENTINEL = '__empty__'

function SelectFieldInput({
  field,
  options,
  value,
  onChange
}: StructFieldInputProps & Readonly<{ options: NonNullable<PluginParameter['options']> }>) {
  const selectValue = value || EMPTY_SENTINEL
  const synthBySentinel = new Map<string, string>()
  const sentinelFor = (opt: { value: string; text: string }): string => {
    if (opt.value) return opt.value
    const sentinel = `__val_${opt.text}`
    synthBySentinel.set(sentinel, '')
    return sentinel
  }
  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          onChange(v === EMPTY_SENTINEL || synthBySentinel.has(v) ? '' : v)
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_SENTINEL}>(none)</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value || `opt-${opt.text}`} value={sentinelFor(opt)}>
              {opt.text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function NumericFieldInput({ field, value, onChange }: StructFieldInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={field.default === '' ? '0' : String(field.default)}
        className="h-8 text-xs"
        min={field.min}
        max={field.max}
      />
    </div>
  )
}

function TextFieldInput({ field, value, onChange }: StructFieldInputProps) {
  const isMultiline = field.type === 'note' || field.type === 'text'
  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[80px] text-xs">{field.text || field.name}</Label>
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          placeholder={String(field.default)}
          className="h-16 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          rows={2}
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          placeholder={field.type === 'struct' ? '{"key":"value"}' : String(field.default)}
          className="h-8 text-xs"
        />
      )}
    </div>
  )
}
