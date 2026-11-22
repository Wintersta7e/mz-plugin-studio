import { useId, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import type { ParamType, PluginParameter } from '../../types/plugin'
import { cn } from '../../lib/utilities'
import { defaultText, toLimit } from './param-types'

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
          aria-label={`Delete ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded content */}
      <ExpandingContent expanded={expanded}>{children}</ExpandingContent>
    </div>
  )
}

/**
The content of a card while it is open, growing in when it opens and out when it closes
*/
export function ExpandingContent({
  expanded,
  children
}: Readonly<{ expanded: boolean; children: ReactNode }>) {
  return (
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
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={param.name ? `Details of ${param.name}` : 'Details'}
      >
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
        <SelectTrigger className="h-8 w-32" aria-label="Type">
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

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive"
        onClick={onRemove}
        aria-label={param.name ? `Remove ${param.name}` : 'Remove'}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

/**
The default value control of a parameter, command argument or struct field: a switch for a
boolean. Compact (the default) sizes it for an argument or field row; a parameter card's is full size
*/
export function FieldDefaultInput({
  param,
  onUpdate,
  id,
  compact = true
}: FieldProps & Readonly<{ id: string; compact?: boolean }>) {
  if (param.type === 'boolean') {
    return (
      <div className={compact ? 'flex items-center h-8' : 'flex items-center h-10'}>
        <Switch
          id={id}
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
      id={id}
      value={defaultText(param.default)}
      onChange={(event) => {
        const value = param.type === 'number' ? Number(event.target.value) : event.target.value
        onUpdate({ default: value })
      }}
      type={param.type === 'number' ? 'number' : 'text'}
      placeholder={compact ? 'Default' : 'Default value'}
      className={compact ? 'h-8' : undefined}
    />
  )
}

type LimitInputProps = Readonly<{
  label: string
  value: number | undefined
  placeholder: string
  onChange: (text: string) => void
  className?: string | undefined
  min?: number
}>

/**
A small labelled number input for a min, max or decimals limit
*/
function LimitInput({
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

/**
The min, max and decimals inputs of a number argument or struct field
*/
export function NumberLimitInputs({
  param,
  onUpdate,
  decimalsClassName
}: FieldProps & Readonly<{ decimalsClassName?: string }>) {
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
        className={decimalsClassName}
        onChange={(text) => {
          onUpdate({ decimals: toLimit(text) })
        }}
      />
    </>
  )
}

/**
A labelled text field in the details of a command argument or struct field
*/
export function FieldTextInput({
  label,
  value,
  placeholder,
  className,
  onChange
}: Readonly<{
  label: string
  value: string
  placeholder: string
  className?: string
  onChange: (value: string) => void
}>) {
  const id = useId()
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={placeholder}
        className="h-8"
      />
    </div>
  )
}
