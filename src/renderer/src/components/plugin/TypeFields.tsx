import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { PluginParameter, ParamType, PluginStruct } from '../../types/plugin'
import { normalizeOptions, optionsText, parseOptions } from '../../lib/select-options'
import { useTypedText } from '../../lib/typed-text'
import { cn } from '../../lib/utilities'
import { StructDefaultEditor } from './StructDefaultEditor'

interface TypeFieldsProps {
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  /**
  The structs a struct or struct array can hold
  */
  structNames: string[]
  /**
  Given, a struct also edits its default, so picking another struct clears the old one
  */
  structDefaults?: PluginStruct[]
  /**
  Smaller fields for the rows of a command argument or a struct field
  */
  compact?: boolean
  className?: string
}

interface Sizes {
  label?: string
  field: string
  trigger?: string
  gap: string
  rows: number
}

const FULL: Sizes = { field: 'space-y-2', gap: 'gap-4', rows: 4 }
const COMPACT: Sizes = {
  label: 'text-xs',
  field: 'space-y-1',
  trigger: 'h-8',
  gap: 'gap-2',
  rows: 3
}

/**
The types an array element can have, in the order its picker lists them
*/
const ARRAY_ELEMENT_TYPES: readonly { value: ParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'note', label: 'Note (Multiline)' },
  { value: 'select', label: 'Select/Combo' },
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
  { value: 'struct', label: 'Struct' }
]

/**
The fields a parameter, command argument or struct field needs for its type to be written:
the options of a select or combo, the struct of a struct, the element type of an array.
*/
export function TypeFields({
  param,
  onUpdate,
  structNames,
  structDefaults,
  compact = false,
  className
}: Readonly<TypeFieldsProps>) {
  const sizes = compact ? COMPACT : FULL

  if (param.type === 'select' || param.type === 'combo') {
    return <OptionsEditor param={param} onUpdate={onUpdate} sizes={sizes} className={className} />
  }

  if (param.type === 'struct') {
    const structDefinition =
      param.structType === undefined || param.structType === ''
        ? undefined
        : structDefaults?.find((s) => s.name === param.structType)
    return (
      <div className={cn('space-y-3', className)}>
        <StructPicker
          value={param.structType}
          structNames={structNames}
          sizes={sizes}
          onPick={(value) => {
            onUpdate(structDefaults ? { structType: value, default: '' } : { structType: value })
          }}
        />
        {structDefinition && (
          <StructDefaultEditor
            struct={structDefinition}
            value={typeof param.default === 'string' ? param.default : ''}
            onChange={(jsonString) => {
              onUpdate({ default: jsonString })
            }}
          />
        )}
      </div>
    )
  }

  if (param.type === 'array') {
    return (
      <ArrayTypeFields
        param={param}
        onUpdate={onUpdate}
        structNames={structNames}
        sizes={sizes}
        className={className}
      />
    )
  }

  return null
}

function ArrayTypeFields({
  param,
  onUpdate,
  structNames,
  sizes,
  className
}: Readonly<{
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  structNames: string[]
  sizes: Sizes
  className: string | undefined
}>) {
  return (
    <div className={cn('grid grid-cols-2', sizes.gap, className)}>
      <div className={sizes.field}>
        <Label className={sizes.label}>Array Element Type</Label>
        <Select
          value={param.arrayType ?? 'string'}
          onValueChange={(value) => {
            const picked = ARRAY_ELEMENT_TYPES.find((option) => option.value === value)
            if (picked) onUpdate({ arrayType: picked.value })
          }}
        >
          <SelectTrigger className={sizes.trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARRAY_ELEMENT_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* If array of structs, show struct type selector */}
      {param.arrayType === 'struct' && (
        <StructPicker
          value={param.structType}
          structNames={structNames}
          sizes={sizes}
          onPick={(value) => {
            onUpdate({ structType: value })
          }}
        />
      )}
    </div>
  )
}

function StructPicker({
  value = '',
  structNames,
  sizes,
  onPick
}: Readonly<{
  value: string | undefined
  structNames: string[]
  sizes: Sizes
  onPick: (value: string) => void
}>) {
  return (
    <div className={sizes.field}>
      <Label className={sizes.label}>Struct Type</Label>
      <Select value={value} onValueChange={onPick}>
        <SelectTrigger className={sizes.trigger}>
          <SelectValue placeholder="Select struct..." />
        </SelectTrigger>
        <SelectContent>
          {structNames.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
Options editor that keeps the text as typed so a value|label is not eaten on keystroke
*/
function OptionsEditor({
  param,
  onUpdate,
  sizes,
  className
}: Readonly<{
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  sizes: Sizes
  className: string | undefined
}>) {
  const [optionsTyped, setOptionsTyped] = useTypedText(optionsText(param.options), normalizeOptions)

  return (
    <div className={cn(sizes.field, className)}>
      <Label className={sizes.label}>
        Options (one per line, format: value|label or just label; write a | in a value as \|)
      </Label>
      <Textarea
        value={optionsTyped}
        onChange={(event) => {
          setOptionsTyped(event.target.value)
          onUpdate({ options: parseOptions(event.target.value) })
        }}
        placeholder={'option1|Option 1\noption2|Option 2'}
        rows={sizes.rows}
        className="font-mono text-sm"
      />
    </div>
  )
}
