import { useMemo, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Switch } from '../ui/switch'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import type { TemplateField } from '../../lib/generator/templates'
import { getClassesGrouped, getClassMethods } from '../../lib/generator/class-registry'

type FieldValues = Readonly<Record<string, unknown>>

type FieldProps = Readonly<{
  field: TemplateField
  values: FieldValues
  onChange: (fieldId: string, value: unknown) => void
}>

type Ranked = Readonly<{ name: string; popularity?: number }>

// Most popular first, then by name
const byPopularity = (a: Ranked, b: Ranked): number => {
  const popA = a.popularity ?? 0
  const popB = b.popularity ?? 0
  return popB === popA ? a.name.localeCompare(b.name) : popB - popA
}

const hasText = (text: string | undefined): text is string => text !== undefined && text !== ''

const orFallback = (text: string | undefined, fallback: string): string =>
  hasText(text) ? text : fallback

// A value the field's control can show: a value of another kind shows as empty
const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

function HelpTip({ help }: Readonly<{ help: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{help}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// The label with its required mark and help tip, the control, then the help text
function FieldShell({ field, children }: Readonly<{ field: TemplateField; children: ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
        {field.label}
        {field.required === true && <span className="text-destructive ml-0.5">*</span>}
        {hasText(field.help) && <HelpTip help={field.help} />}
      </Label>
      {children}
      {hasText(field.help) && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  )
}

function TextField({ field, values, onChange }: FieldProps) {
  return (
    <FieldShell field={field}>
      <Input
        id={field.id}
        value={textOf(values[field.id])}
        onChange={(event) => {
          onChange(field.id, event.target.value)
        }}
        placeholder={field.placeholder}
        className="h-9"
      />
    </FieldShell>
  )
}

function NumberField({ field, values, onChange }: FieldProps) {
  const value = values[field.id]
  return (
    <FieldShell field={field}>
      <Input
        id={field.id}
        type="number"
        value={typeof value === 'number' ? value : ''}
        onChange={(event) => {
          onChange(field.id, Number(event.target.value))
        }}
        placeholder={field.placeholder}
        className="h-9"
      />
    </FieldShell>
  )
}

function BooleanField({ field, values, onChange }: FieldProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card/50 p-3">
      <div className="space-y-0.5">
        <Label htmlFor={field.id} className="text-sm font-medium flex items-center gap-1.5">
          {field.label}
          {hasText(field.help) && <HelpTip help={field.help} />}
        </Label>
      </div>
      <Switch
        id={field.id}
        checked={values[field.id] === true}
        onCheckedChange={(checked) => {
          onChange(field.id, checked)
        }}
      />
    </div>
  )
}

type PickerProps = FieldProps &
  Readonly<{
    placeholder: string
    contentClassName?: string
    disabled?: boolean
    children: ReactNode
  }>

// A select over the field's value; an empty value shows the placeholder
function Picker({
  field,
  values,
  onChange,
  placeholder,
  contentClassName,
  disabled = false,
  children
}: PickerProps) {
  return (
    <FieldShell field={field}>
      <Select
        value={textOf(values[field.id])}
        onValueChange={(value) => {
          onChange(field.id, value)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>{children}</SelectContent>
      </Select>
    </FieldShell>
  )
}

function OptionsField({ field, values, onChange }: FieldProps) {
  return (
    <Picker
      field={field}
      values={values}
      onChange={onChange}
      placeholder={orFallback(field.placeholder, 'Select...')}
    >
      {field.options?.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </Picker>
  )
}

function ClassField({ field, values, onChange }: FieldProps) {
  // The class dictionary by category, each sorted by popularity
  const groups = useMemo(
    () =>
      Object.entries(getClassesGrouped()).map(([category, classes]) => ({
        category,
        label: category.charAt(0).toUpperCase() + category.slice(1),
        names: classes.toSorted(byPopularity).map((entry) => entry.name)
      })),
    []
  )
  return (
    <Picker
      field={field}
      values={values}
      onChange={onChange}
      placeholder={orFallback(field.placeholder, 'Select a class...')}
      contentClassName="max-h-80"
    >
      {groups.map((group) => (
        <SelectGroup key={group.category}>
          <SelectLabel className="text-xs font-semibold text-muted-foreground">
            {group.label}
          </SelectLabel>
          {group.names.map((name) => (
            <SelectItem key={name} value={name} className="font-mono text-sm">
              {name}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </Picker>
  )
}

function MethodField({ field, values, onChange }: FieldProps) {
  const className = textOf(values['className'])
  // The picked class's methods, sorted by popularity
  const methods = useMemo(
    () => (className === '' ? [] : getClassMethods(className).toSorted(byPopularity)),
    [className]
  )
  return (
    <Picker
      field={field}
      values={values}
      onChange={onChange}
      placeholder={
        methods.length === 0
          ? 'Select a class first...'
          : orFallback(field.placeholder, 'Select a method...')
      }
      contentClassName="max-h-80"
      disabled={methods.length === 0}
    >
      {methods.map((method) => (
        <SelectItem key={method.name} value={method.name} className="font-mono text-sm">
          {`${method.name}(${method.params.join(', ')})`}
        </SelectItem>
      ))}
    </Picker>
  )
}

function KeyField({ field, values, onChange }: FieldProps) {
  return (
    <Picker
      field={field}
      values={values}
      onChange={onChange}
      placeholder={orFallback(field.placeholder, 'Select a key...')}
    >
      <SelectGroup>
        <SelectLabel>Letter Keys</SelectLabel>
        <SelectItem value="q">Q</SelectItem>
        <SelectItem value="w">W</SelectItem>
        <SelectItem value="e">E</SelectItem>
        <SelectItem value="r">R</SelectItem>
        <SelectItem value="t">T</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Modifier Keys</SelectLabel>
        <SelectItem value="shift">Shift</SelectItem>
        <SelectItem value="control">Control</SelectItem>
        <SelectItem value="tab">Tab</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Navigation Keys</SelectLabel>
        <SelectItem value="pageup">Page Up</SelectItem>
        <SelectItem value="pagedown">Page Down</SelectItem>
      </SelectGroup>
    </Picker>
  )
}

const FIELD_CONTROLS = {
  text: TextField,
  number: NumberField,
  boolean: BooleanField,
  select: OptionsField,
  'class-select': ClassField,
  'method-select': MethodField,
  'key-select': KeyField
} as const satisfies Record<TemplateField['type'], (fieldProps: FieldProps) => ReactNode>

// A field that depends on another shows while that one has a value, or the value it names
function isFieldVisible(field: TemplateField, values: FieldValues): boolean {
  if (field.dependsOn === undefined) return true
  const dependencyValue = values[field.dependsOn.field]
  return field.dependsOn.value === undefined
    ? dependencyValue !== undefined && dependencyValue !== ''
    : dependencyValue === field.dependsOn.value
}

/**
The template's fields, each with its control, but for a field the one it depends on does not call
for
*/
export function TemplateFieldList({
  fields,
  values,
  onChange
}: Readonly<{
  fields: readonly TemplateField[]
  values: FieldValues
  onChange: (fieldId: string, value: unknown) => void
}>) {
  return fields
    .filter((field) => isFieldVisible(field, values))
    .map((field) => {
      const Control = FIELD_CONTROLS[field.type]
      return <Control key={field.id} field={field} values={values} onChange={onChange} />
    })
}
