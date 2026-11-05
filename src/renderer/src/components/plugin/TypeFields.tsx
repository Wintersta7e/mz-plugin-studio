import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { PluginParameter, ParamType, PluginStruct } from '../../types/plugin'
import { normalizeOptions, optionsText, parseOptions } from '../../lib/select-options'
import { useTypedText } from '../../lib/typed-text'
import { cn } from '../../lib/utils'
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
}: TypeFieldsProps) {
  const sizes = compact ? COMPACT : FULL

  if (param.type === 'select' || param.type === 'combo') {
    return <OptionsEditor param={param} onUpdate={onUpdate} sizes={sizes} className={className} />
  }

  if (param.type === 'struct') {
    const structDef = param.structType
      ? structDefaults?.find((s) => s.name === param.structType)
      : undefined
    return (
      <div className={cn('space-y-3', className)}>
        <StructPicker
          value={param.structType}
          structNames={structNames}
          sizes={sizes}
          onPick={(value) =>
            onUpdate(structDefaults ? { structType: value, default: '' } : { structType: value })
          }
        />
        {structDef && (
          <StructDefaultEditor
            struct={structDef}
            value={typeof param.default === 'string' ? param.default : ''}
            onChange={(jsonString) => onUpdate({ default: jsonString })}
          />
        )}
      </div>
    )
  }

  if (param.type === 'array') {
    return (
      <div className={cn('grid grid-cols-2', sizes.gap, className)}>
        <div className={sizes.field}>
          <Label className={sizes.label}>Array Element Type</Label>
          <Select
            value={param.arrayType || 'string'}
            onValueChange={(value) => onUpdate({ arrayType: value as ParamType })}
          >
            <SelectTrigger className={sizes.trigger}>
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
          <StructPicker
            value={param.structType}
            structNames={structNames}
            sizes={sizes}
            onPick={(value) => onUpdate({ structType: value })}
          />
        )}
      </div>
    )
  }

  return null
}

function StructPicker({
  value,
  structNames,
  sizes,
  onPick
}: {
  value: string | undefined
  structNames: string[]
  sizes: Sizes
  onPick: (value: string) => void
}) {
  return (
    <div className={sizes.field}>
      <Label className={sizes.label}>Struct Type</Label>
      <Select value={value || ''} onValueChange={onPick}>
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
}: {
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
  sizes: Sizes
  className?: string
}) {
  const [optionsTyped, setOptionsTyped] = useTypedText(optionsText(param.options), normalizeOptions)

  return (
    <div className={cn(sizes.field, className)}>
      <Label className={sizes.label}>
        Options (one per line, format: value|label or just label; write a | in a value as \|)
      </Label>
      <Textarea
        value={optionsTyped}
        onChange={(e) => {
          setOptionsTyped(e.target.value)
          onUpdate({ options: parseOptions(e.target.value) })
        }}
        placeholder={'option1|Option 1\noption2|Option 2'}
        rows={sizes.rows}
        className="font-mono text-sm"
      />
    </div>
  )
}
