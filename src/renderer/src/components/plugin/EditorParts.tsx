import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import type { ParamType, PluginParameter } from '../../types/plugin'
import { defaultText } from './param-types'

type ExpandableCardProps = Readonly<{
  // The name the card shows and its expand control is announced by
  name: string
  // The count beside the name, e.g. "(2 args)"
  summary: string
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  children: ReactNode
}>

/**
A command or struct card: a header that opens and closes it, and its content while open
*/
export function ExpandableCard({
  name,
  summary,
  expanded,
  onToggle,
  onDelete,
  children
}: ExpandableCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header: the expand button's ::after covers the whole row, so a click anywhere on it
          toggles the card; the delete button sits above that layer */}
      <div className="relative flex cursor-pointer items-center gap-2 p-3">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={name}
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left after:absolute after:inset-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1">
            <span className="font-medium">{name}</span>
            <span className="ml-2 text-sm text-muted-foreground">{summary}</span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="relative z-10 h-8 w-8 text-destructive hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation()
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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type FieldProps = Readonly<{
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
}>

type FieldRowHeaderProps = FieldProps &
  Readonly<{
    types: readonly Readonly<{ value: ParamType; label: string }>[]
    namePlaceholder: string
    expanded: boolean
    onToggle: () => void
    onRemove: () => void
  }>

/**
A command argument's or struct field's row: open toggle, name, type and remove button
*/
export function FieldRowHeader({
  param,
  onUpdate,
  types,
  namePlaceholder,
  expanded,
  onToggle,
  onRemove
}: FieldRowHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </Button>

      <Input
        value={param.name}
        onChange={(event) => {
          onUpdate({ name: event.target.value })
        }}
        placeholder={namePlaceholder}
        className="h-8 flex-1"
      />

      <Select
        value={param.type}
        onValueChange={(value: ParamType) => {
          onUpdate({ type: value })
        }}
      >
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {types.map((t) => (
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
  )
}

/**
The default value control of a command argument or struct field: a switch for a boolean
*/
export function FieldDefaultInput({ param, onUpdate }: FieldProps) {
  if (param.type === 'boolean') {
    return (
      <div className="flex items-center h-8">
        <Switch
          checked={param.default === true || param.default === 'true'}
          onCheckedChange={(checked) => {
            onUpdate({ default: checked })
          }}
        />
      </div>
    )
  }
  return (
    <Input
      value={defaultText(param.default)}
      onChange={(event) => {
        const value = param.type === 'number' ? Number(event.target.value) : event.target.value
        onUpdate({ default: value })
      }}
      type={param.type === 'number' ? 'number' : 'text'}
      placeholder="Default"
      className="h-8"
    />
  )
}

type LimitInputProps = Readonly<{
  label: string
  value: number | undefined
  placeholder: string
  onChange: (text: string) => void
  className?: string
  min?: number
}>

/**
A small labelled number input for a min, max or decimals limit
*/
export function LimitInput({
  label,
  value,
  placeholder,
  onChange,
  className = 'space-y-1',
  min
}: LimitInputProps) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={placeholder}
        min={min}
        className="h-8"
      />
    </div>
  )
}
