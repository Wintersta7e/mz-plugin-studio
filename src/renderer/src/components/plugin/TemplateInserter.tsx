import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useId,
  type ReactNode,
  type RefObject
} from 'react'
import {
  X,
  GitBranch,
  PanelTop,
  Play,
  Tag,
  Terminal,
  Save,
  Keyboard,
  Swords,
  Search,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Code2,
  Map as MapIcon,
  Volume2,
  MessageSquare,
  Image,
  Menu,
  Users,
  Star,
  Clock,
  type LucideIcon
} from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { TooltipProvider } from '../ui/tooltip'
import { cn } from '../../lib/utils'
import { RAW_MODE_READ_ONLY_NOTICE } from '../../lib/raw-mode'
import {
  CATEGORIES,
  getTemplatesByCategory,
  getTemplateDefaults,
  getAllTemplates,
  getTemplate,
  validateTemplateValues,
  type CodeTemplate,
  type TemplateCategory
} from '../../lib/generator/templates'
import { useTemplateStore, useUIStore } from '../../stores'
import { HighlightedCode } from './CodeHighlight'
import { TemplateFieldList } from './TemplateFields'

// Import templates to register them
import '../../lib/generator/templates/method-alias'
import '../../lib/generator/templates/scene-hooks'
import '../../lib/generator/templates/custom-window'
import '../../lib/generator/templates/save-load'
import '../../lib/generator/templates/input-handler'
import '../../lib/generator/templates/database-extension'
import '../../lib/generator/templates/battle-system'
import '../../lib/generator/templates/plugin-commands'
import '../../lib/generator/templates/sprite-system'
import '../../lib/generator/templates/map-events'
import '../../lib/generator/templates/menu-system'
import '../../lib/generator/templates/audio-system'
import '../../lib/generator/templates/message-system'
import '../../lib/generator/templates/actor-party'

type TemplateInserterProps = Readonly<{
  open: boolean
  onClose: () => void
  onInsert: (code: string) => void
  // Raw mode: the code cannot be inserted
  readOnly?: boolean
}>

type ViewMode = 'category' | 'favorites' | 'recent' | 'all'
type FieldValues = Record<string, unknown>

// Map icon names to components
const ICON_MAP: Partial<Record<string, LucideIcon>> = {
  GitBranch,
  PanelTop,
  Play,
  Tag,
  Terminal,
  Save,
  Keyboard,
  Swords,
  Map: MapIcon,
  Volume2,
  MessageSquare,
  Image,
  Menu,
  Users
}

// The store's default category, opened when the saved one is no category this version has
const DEFAULT_CATEGORY: TemplateCategory = 'method-alias'

const knownCategory = (id: string): TemplateCategory =>
  CATEGORIES.find((category) => category.id === id)?.id ?? DEFAULT_CATEGORY

const categoryName = (id: TemplateCategory): string =>
  CATEGORIES.find((category) => category.id === id)?.name ?? id

const GENERATE_ERROR = '// Error generating code - please check field values'

type Preview = Readonly<{ code: string; errors: readonly string[] }>

const NO_PREVIEW: Preview = { code: '', errors: [] }

/**
The code a template writes from the values; values failing the template's own checks produce no
code, so nothing they would generate can be inserted or copied
*/
function buildPreview(template: CodeTemplate | undefined, values: FieldValues): Preview {
  if (template === undefined) return NO_PREVIEW
  const validation = validateTemplateValues(template.id, values)
  if (!validation.valid) return { code: '', errors: validation.errors }
  try {
    return { code: template.generate(values), errors: [] }
  } catch {
    return { code: GENERATE_ERROR, errors: [] }
  }
}

type Selection = Readonly<{ id: string | null; values: FieldValues }>

/**
The picked template and its field values: a template picked starts from its defaults, and a new
class clears the method picked for the old one
*/
function useTemplateSelection() {
  const [selection, setSelection] = useState<Selection>({ id: null, values: {} })
  const selectTemplate = useCallback((id: string | null) => {
    setSelection((current) =>
      current.id === id ? current : { id, values: id === null ? {} : getTemplateDefaults(id) }
    )
  }, [])
  const changeField = useCallback((fieldId: string, value: unknown) => {
    setSelection((current) => {
      const values = { ...current.values, [fieldId]: value }
      const isNewClass =
        fieldId === 'className' && value !== current.values['className'] && value !== ''
      return { id: current.id, values: isNewClass ? { ...values, methodName: '' } : values }
    })
  }, [])
  return { selection, selectTemplate, changeField }
}

function viewTemplates(
  viewMode: ViewMode,
  category: TemplateCategory,
  favorites: readonly string[],
  recentIds: readonly string[]
): CodeTemplate[] {
  switch (viewMode) {
    case 'all': {
      return getAllTemplates()
    }
    case 'favorites':
    case 'recent': {
      return (viewMode === 'favorites' ? favorites : recentIds)
        .map((id) => getTemplate(id))
        .filter((template) => template !== undefined)
    }
    case 'category': {
      return getTemplatesByCategory(category)
    }
  }
}

/**
The list the dialog shows: a category, the favourites, the recent templates or all of them,
narrowed by the search text; leaving a list or starting a search drops the picked template
*/
function useTemplateBrowser(selectTemplate: (id: string | null) => void) {
  const lastTemplateCategory = useUIStore((s) => s.lastTemplateCategory)
  const persistCategory = useUIStore((s) => s.setLastTemplateCategory)
  const [category, setCategory] = useState(() => knownCategory(lastTemplateCategory))
  const [viewMode, setViewMode] = useState<ViewMode>('category')
  const [searchQuery, setSearchQuery] = useState('')
  const store = useTemplateStore()

  useEffect(() => {
    persistCategory(category)
  }, [category, persistCategory])

  const templates = useMemo(() => {
    const recentIds = store.recentlyUsed.map((recent) => recent.id)
    const listed = viewTemplates(viewMode, category, store.favorites, recentIds)
    if (searchQuery.trim() === '') return listed
    const query = searchQuery.toLowerCase()
    return listed.filter(
      (t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
    )
  }, [viewMode, category, store.favorites, store.recentlyUsed, searchQuery])

  const showView = (mode: Exclude<ViewMode, 'category'>): void => {
    setViewMode(mode)
    selectTemplate(null)
    setSearchQuery('')
  }
  const showCategory = (id: TemplateCategory): void => {
    if (id !== category) {
      setCategory(id)
      selectTemplate(null)
      setSearchQuery('')
    }
    setViewMode('category')
  }
  const search = (value: string): void => {
    setSearchQuery(value)
    const hasQuery = value.trim() !== ''
    if (viewMode === 'category' && hasQuery) {
      setViewMode('all')
      selectTemplate(null)
    } else if (viewMode === 'all' && !hasQuery) {
      setViewMode('category')
    }
  }
  return { store, category, viewMode, searchQuery, templates, showView, showCategory, search }
}

// The Copy button reads Copied for two seconds after a copy
function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Cleanup copy timer on unmount (LEAK-01)
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    []
  )
  const markCopied = useCallback(() => {
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCopied(false)
    }, 2000)
  }, [])
  return [copied, markCopied]
}

// Cmd/Ctrl+Enter inserts; Escape and a press outside the panel close the dialog through its
// onOpenChange
function useInsertShortcut(insert: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) insert()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [insert])
}

type Tone = Readonly<{ button: string; badge: string }>

const PRIMARY_TONE: Tone = {
  button: 'bg-primary text-primary-foreground shadow-xs',
  badge: 'bg-primary-foreground/20 text-primary-foreground'
}

const QUICK_VIEWS = [
  {
    mode: 'favorites',
    icon: Star,
    label: 'Favorites',
    spacing: '',
    tone: { button: 'bg-amber-500 text-white shadow-xs', badge: 'bg-white/20 text-white' }
  },
  {
    mode: 'recent',
    icon: Clock,
    label: 'Recent',
    spacing: 'mt-0.5',
    tone: { button: 'bg-blue-500 text-white shadow-xs', badge: 'bg-white/20 text-white' }
  },
  { mode: 'all', icon: Search, label: 'All', spacing: 'mt-0.5', tone: PRIMARY_TONE }
] as const

type SidebarButtonProps = Readonly<{
  icon: LucideIcon
  label: string
  count: number
  isActive: boolean
  tone: Tone
  spacing: string
  onClick: () => void
}>

function SidebarButton({
  icon: Icon,
  label,
  count,
  isActive,
  tone,
  spacing,
  onClick
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all',
        spacing,
        isActive ? tone.button : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          isActive ? tone.badge : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )
}

type CategorySidebarProps = Readonly<{
  viewMode: ViewMode
  category: TemplateCategory
  counts: Readonly<Record<Exclude<ViewMode, 'category'>, number>>
  onView: (mode: Exclude<ViewMode, 'category'>) => void
  onCategory: (id: TemplateCategory) => void
}>

function CategorySidebar({ viewMode, category, counts, onView, onCategory }: CategorySidebarProps) {
  const categories = useMemo(
    () =>
      CATEGORIES.map((info) => ({
        info,
        icon: ICON_MAP[info.icon] ?? Play,
        count: getTemplatesByCategory(info.id).length
      })),
    []
  )
  return (
    <div className="w-52 shrink-0 border-r border-border bg-card/50">
      <div className="p-3 pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Categories
        </span>
      </div>
      {/* Quick Access */}
      <div className="px-2 pb-1">
        {QUICK_VIEWS.map((view) => (
          <SidebarButton
            key={view.mode}
            icon={view.icon}
            label={view.label}
            count={counts[view.mode]}
            isActive={viewMode === view.mode}
            tone={view.tone}
            spacing={view.spacing}
            onClick={() => {
              onView(view.mode)
            }}
          />
        ))}
      </div>
      <div className="mx-3 my-1 border-t border-border" />
      <div className="space-y-0.5 px-2 pb-2">
        {categories.map(({ info, icon, count }) => (
          <SidebarButton
            key={info.id}
            icon={icon}
            label={info.name}
            count={count}
            isActive={viewMode === 'category' && category === info.id}
            tone={PRIMARY_TONE}
            spacing=""
            onClick={() => {
              onCategory(info.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}

const VIEW_BADGES = {
  favorites: { icon: Star, label: 'Favorites', color: 'text-amber-500' },
  recent: { icon: Clock, label: 'Recent', color: 'text-blue-500' },
  all: { icon: Search, label: 'All Templates', color: 'text-muted-foreground' }
} as const

const VIEW_PLACEHOLDERS = {
  favorites: 'Search favorites...',
  recent: 'Search recent...',
  all: 'Search all templates...'
} as const

type SearchBarProps = Readonly<{
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  viewMode: ViewMode
  category: TemplateCategory
  onSearch: (value: string) => void
}>

function SearchBar({ inputRef, query, viewMode, category, onSearch }: SearchBarProps) {
  const name = categoryName(category)
  const badge =
    viewMode === 'category'
      ? { icon: ChevronRight, label: name, color: 'text-muted-foreground' }
      : VIEW_BADGES[viewMode]
  const BadgeIcon = badge.icon
  return (
    <div className="border-b border-border bg-card/30 px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                onSearch(event.target.value)
              }}
              placeholder={
                viewMode === 'category'
                  ? `Search ${name.toLowerCase()} templates...`
                  : VIEW_PLACEHOLDERS[viewMode]
              }
              className="h-9 pl-9"
            />
          </div>
        </div>
        <div className={cn('hidden items-center gap-2 text-sm sm:flex', badge.color)}>
          <BadgeIcon className="h-4 w-4" />
          <span>{badge.label}</span>
        </div>
      </div>
    </div>
  )
}

type TemplateCardProps = Readonly<{
  template: CodeTemplate
  isSelected: boolean
  isFavorite: boolean
  showCategory: boolean
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
}>

function TemplateCard({
  template,
  isSelected,
  isFavorite,
  showCategory,
  onSelect,
  onToggleFavorite
}: TemplateCardProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => {
          onSelect(template.id)
        }}
        data-testid="template-card"
        className={cn(
          'w-full rounded-lg border p-3 text-left transition-all',
          isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <div className="flex items-start gap-2">
          <Code2
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              isSelected ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{template.name}</div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {template.description}
            </div>
            {showCategory && (
              <span className="mt-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {categoryName(template.category)}
              </span>
            )}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => {
          onToggleFavorite(template.id)
        }}
        className={cn(
          'absolute top-2 right-2 p-1 rounded-md transition-colors',
          isFavorite
            ? 'text-amber-400 hover:text-amber-500'
            : 'text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100'
        )}
        aria-label={
          isFavorite
            ? `Remove ${template.name} from favorites`
            : `Add ${template.name} to favorites`
        }
      >
        <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
      </button>
    </div>
  )
}

type TemplateListProps = Readonly<{
  templates: readonly CodeTemplate[]
  selectedId: string | null
  favorites: readonly string[]
  showCategory: boolean
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
}>

function TemplateList({ templates, selectedId, favorites, ...cardProps }: TemplateListProps) {
  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-border p-4">
      {templates.length > 0 ? (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedId === template.id}
              isFavorite={favorites.includes(template.id)}
              {...cardProps}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
          <Search className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm font-medium">No templates found</p>
          <p className="text-xs">Try a different search term</p>
        </div>
      )}
    </div>
  )
}

type TemplateConfigProps = Readonly<{
  template: CodeTemplate | undefined
  values: FieldValues
  onFieldChange: (fieldId: string, value: unknown) => void
}>

function TemplateConfig({ template, values, onFieldChange }: TemplateConfigProps) {
  if (template === undefined) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6">
        <div className="mb-4 rounded-full bg-muted/50 p-4">
          <Code2 className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium">Select a template</p>
        <p className="text-xs mt-1">Choose a template from the list to configure it</p>
      </div>
    )
  }
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold">{template.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
      </div>
      {template.fields.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>Configuration</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <TooltipProvider delayDuration={300}>
            <div className="grid gap-4">
              <TemplateFieldList
                fields={template.fields}
                values={values}
                onChange={onFieldChange}
              />
            </div>
          </TooltipProvider>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
          No configuration required for this template
        </div>
      )}
    </div>
  )
}

// Each text keyed by itself and how often it came before, so a repeated text keeps a key of its own
function keyedByText(texts: readonly string[]): { key: string; text: string }[] {
  const seen = new Map<string, number>()
  return texts.map((text) => {
    const count = seen.get(text) ?? 0
    seen.set(text, count + 1)
    return { key: `${text}#${String(count)}`, text }
  })
}

function PreviewBody({
  preview,
  hasTemplate
}: Readonly<{ preview: Preview; hasTemplate: boolean }>) {
  if (preview.errors.length > 0) return null
  if (preview.code !== '') {
    return (
      <code className="font-mono text-[13px] leading-relaxed text-gray-300">
        <HighlightedCode code={preview.code} />
      </code>
    )
  }
  return (
    <p className="font-mono text-sm text-gray-500">
      {hasTemplate
        ? '// Configure the fields above to generate code'
        : '// Select a template to preview the generated code'}
    </p>
  )
}

type PreviewPaneProps = Readonly<{
  preview: Preview
  hasTemplate: boolean
  errorsId: string
  copied: boolean
  onCopy: () => void
}>

function PreviewPane({ preview, hasTemplate, errorsId, copied, onCopy }: PreviewPaneProps) {
  const CopyIcon = copied ? Check : Copy
  return (
    <div className="border-t border-border bg-card/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          disabled={preview.code === '' || preview.errors.length > 0}
          className="h-7 gap-1.5 text-xs"
        >
          <CopyIcon className="h-3 w-3" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="h-44 overflow-auto bg-[#1e1e2e] p-4">
        {/* Always rendered, so a screen reader announces errors as they appear */}
        <div id={errorsId} role="status" className="space-y-1.5 text-sm">
          {preview.errors.length > 0 && (
            <>
              <p className="text-gray-300">Fix these fields to see the code:</p>
              <ul className="list-disc space-y-0.5 pl-5 text-red-300">
                {keyedByText(preview.errors).map(({ key, text }) => (
                  <li key={key}>{text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <PreviewBody preview={preview} hasTemplate={hasTemplate} />
      </div>
    </div>
  )
}

type FooterProps = Readonly<{
  templateName: string | undefined
  readOnly: boolean
  isInsertable: boolean
  errorsId: string
  hasErrors: boolean
  onClose: () => void
  onInsert: () => void
}>

function InserterFooter({
  templateName,
  readOnly,
  isInsertable,
  errorsId,
  hasErrors,
  onClose,
  onInsert
}: FooterProps) {
  const notice = readOnly ? RAW_MODE_READ_ONLY_NOTICE : undefined
  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-4">
      <p className="text-xs text-muted-foreground">
        {templateName === undefined
          ? 'Select a template to get started'
          : `Template: ${templateName}`}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {/* A disabled button ignores the pointer, so its hint also sits on this wrapper */}
        <span title={notice} className="inline-flex">
          <Button
            onClick={onInsert}
            data-testid="template-insert"
            disabled={readOnly || !isInsertable}
            title={notice}
            // Read-only, the notice is why it stays disabled, not the field errors
            aria-describedby={!readOnly && hasErrors ? errorsId : undefined}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Insert Code
          </Button>
        </span>
      </div>
    </div>
  )
}

type DialogShellProps = Readonly<{
  templateCount: number
  focusRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onInsert: () => void
  children: ReactNode
}>

/**
A modal dialog: named by its title, focus held inside while open and handed back to the control
that opened it on close; Escape or a press on the backdrop closes it. Held open, the dialog only
ever asks to close, so onOpenChange is onClose
*/
function DialogShell({ templateCount, focusRef, onClose, onInsert, children }: DialogShellProps) {
  // What held focus when the dialog opened, to hand focus back to on close: the dialog has no
  // trigger of its own for Radix to return it to
  const openerRef = useRef<HTMLElement | null>(null)
  useInsertShortcut(onInsert)
  return (
    <DialogPrimitive.Root open onOpenChange={onClose}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
        <DialogPrimitive.Content
          aria-modal="true"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            const opener = document.activeElement
            openerRef.current = opener instanceof HTMLElement ? opener : null
            focusRef.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            openerRef.current?.focus()
          }}
          className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold">
                  Code Templates
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {templateCount} templates available
                </DialogPrimitive.Description>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="hidden rounded bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline-block">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to insert
              </kbd>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Root>
  )
}

type WorkspaceProps = Readonly<{
  browser: ReturnType<typeof useTemplateBrowser>
  templateCount: number
  searchRef: RefObject<HTMLInputElement | null>
  selection: Selection
  template: CodeTemplate | undefined
  preview: Preview
  errorsId: string
  copied: boolean
  onSelect: (id: string) => void
  onFieldChange: (fieldId: string, value: unknown) => void
  onCopy: () => void
}>

// The category sidebar, the search, the template list beside its fields, and the preview
function TemplateWorkspace({
  browser,
  templateCount,
  searchRef,
  selection,
  template,
  ...panes
}: WorkspaceProps) {
  const { store, viewMode, category } = browser
  return (
    <div className="flex flex-1 overflow-hidden">
      <CategorySidebar
        viewMode={viewMode}
        category={category}
        counts={{
          favorites: store.favorites.length,
          recent: store.recentlyUsed.length,
          all: templateCount
        }}
        onView={browser.showView}
        onCategory={browser.showCategory}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SearchBar
          inputRef={searchRef}
          query={browser.searchQuery}
          viewMode={viewMode}
          category={category}
          onSearch={browser.search}
        />
        <div className="flex flex-1 overflow-hidden">
          <TemplateList
            templates={browser.templates}
            selectedId={selection.id}
            favorites={store.favorites}
            showCategory={viewMode === 'all'}
            onSelect={panes.onSelect}
            onToggleFavorite={store.toggleFavorite}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TemplateConfig
              template={template}
              values={selection.values}
              onFieldChange={panes.onFieldChange}
            />
          </div>
        </div>
        <PreviewPane
          preview={panes.preview}
          hasTemplate={template !== undefined}
          errorsId={panes.errorsId}
          copied={panes.copied}
          onCopy={panes.onCopy}
        />
      </div>
    </div>
  )
}

export function TemplateInserter({
  open,
  onClose,
  onInsert,
  readOnly = false
}: TemplateInserterProps) {
  const { selection, selectTemplate, changeField } = useTemplateSelection()
  const browser = useTemplateBrowser(selectTemplate)
  const templateCount = useMemo(() => getAllTemplates().length, [])
  const searchRef = useRef<HTMLInputElement>(null)
  const errorsId = useId()
  const [copied, markCopied] = useCopied()
  const template = useMemo(
    () => (selection.id === null ? undefined : getTemplate(selection.id)),
    [selection.id]
  )
  const preview = useMemo(
    () => buildPreview(template, selection.values),
    [template, selection.values]
  )
  const hasErrors = preview.errors.length > 0
  const isInsertable = !hasErrors && preview.code !== '' && !preview.code.startsWith('// Error')
  const { addToRecent } = browser.store

  const insert = useCallback(() => {
    if (readOnly || !isInsertable) return
    if (selection.id !== null) addToRecent(selection.id)
    onInsert(preview.code)
    onClose()
  }, [readOnly, isInsertable, selection.id, addToRecent, onInsert, preview.code, onClose])

  if (!open) return null

  const copy = async (): Promise<void> => {
    if (hasErrors || preview.code === '') return
    await navigator.clipboard.writeText(preview.code)
    markCopied()
  }

  return (
    <DialogShell
      templateCount={templateCount}
      focusRef={searchRef}
      onClose={onClose}
      onInsert={insert}
    >
      <TemplateWorkspace
        browser={browser}
        templateCount={templateCount}
        searchRef={searchRef}
        selection={selection}
        template={template}
        preview={preview}
        errorsId={errorsId}
        copied={copied}
        onSelect={selectTemplate}
        onFieldChange={changeField}
        onCopy={() => {
          void copy()
        }}
      />
      <InserterFooter
        templateName={template?.name}
        readOnly={readOnly}
        isInsertable={isInsertable}
        errorsId={errorsId}
        hasErrors={hasErrors}
        onClose={onClose}
        onInsert={insert}
      />
    </DialogShell>
  )
}
