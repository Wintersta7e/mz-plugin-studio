import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Map,
  Volume2,
  MessageSquare,
  Image,
  Menu,
  Users,
  ExternalLink,
  Star,
  Clock,
  HelpCircle
} from 'lucide-react'
import { Button } from '../ui/button'
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip'
import { cn } from '../../lib/utils'
import {
  CATEGORIES,
  getTemplatesByCategory,
  getTemplateDefaults,
  getAllTemplates,
  getTemplate,
  type TemplateCategory,
  type TemplateField
} from '../../lib/generator/templates'
import { getMethodOptions, getClassesGrouped } from '../../lib/generator/class-registry'
import { useTemplateStore } from '../../stores'

// Import templates to register them
import '../../lib/generator/templates/method-alias'
import '../../lib/generator/templates/scene-hooks'
import '../../lib/generator/templates/custom-window'
import '../../lib/generator/templates/save-load'
import '../../lib/generator/templates/input-handler'
import '../../lib/generator/templates/database-ext'
import '../../lib/generator/templates/battle-system'
import '../../lib/generator/templates/plugin-commands'
import '../../lib/generator/templates/sprite-system'
import '../../lib/generator/templates/map-events'
import '../../lib/generator/templates/menu-system'
import '../../lib/generator/templates/audio-system'
import '../../lib/generator/templates/message-system'
import '../../lib/generator/templates/actor-party'

interface TemplateInserterProps {
  open: boolean
  onClose: () => void
  onInsert: (code: string) => void
}

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GitBranch,
  PanelTop,
  Play,
  Tag,
  Terminal,
  Save,
  Keyboard,
  Swords,
  Map,
  Volume2,
  MessageSquare,
  Image,
  Menu,
  Users
}

// Simple syntax highlighting for JavaScript
function highlightCode(code: string): React.ReactNode {
  if (!code) return null

  const lines = code.split('\n')

  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let partIndex = 0

    // Comments
    const commentMatch = remaining.match(/^(.*?)(\/\/.*)$/)
    if (commentMatch) {
      remaining = commentMatch[1]
      parts.push(
        <span key={`comment-${lineIndex}`} className="text-emerald-500">
          {commentMatch[2]}
        </span>
      )
    }

    // Process the non-comment part
    if (remaining) {
      // Keywords
      const keywordRegex =
        /\b(const|let|var|function|return|if|else|for|while|this|new|prototype|call|apply)\b/g
      // Strings
      const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g
      // Numbers
      const numberRegex = /\b(\d+)\b/g

      let lastIndex = 0
      const tokens: { start: number; end: number; type: string; text: string }[] = []

      // Collect all tokens
      let match
      while ((match = keywordRegex.exec(remaining)) !== null) {
        tokens.push({ start: match.index, end: match.index + match[0].length, type: 'keyword', text: match[0] })
      }
      while ((match = stringRegex.exec(remaining)) !== null) {
        tokens.push({ start: match.index, end: match.index + match[0].length, type: 'string', text: match[0] })
      }
      while ((match = numberRegex.exec(remaining)) !== null) {
        tokens.push({ start: match.index, end: match.index + match[0].length, type: 'number', text: match[0] })
      }

      // Sort by position
      tokens.sort((a, b) => a.start - b.start)

      // Filter overlapping tokens (strings take precedence)
      const filteredTokens: typeof tokens = []
      for (const token of tokens) {
        const overlaps = filteredTokens.some(
          (t) => (token.start >= t.start && token.start < t.end) || (token.end > t.start && token.end <= t.end)
        )
        if (!overlaps) {
          filteredTokens.push(token)
        }
      }

      // Build highlighted line
      for (const token of filteredTokens) {
        if (token.start > lastIndex) {
          parts.unshift(
            <span key={`text-${lineIndex}-${partIndex++}`}>{remaining.slice(lastIndex, token.start)}</span>
          )
        }
        const colorClass =
          token.type === 'keyword'
            ? 'text-purple-400'
            : token.type === 'string'
              ? 'text-amber-400'
              : 'text-blue-400'
        parts.unshift(
          <span key={`${token.type}-${lineIndex}-${partIndex++}`} className={colorClass}>
            {token.text}
          </span>
        )
        lastIndex = token.end
      }

      if (lastIndex < remaining.length) {
        parts.unshift(<span key={`rest-${lineIndex}`}>{remaining.slice(lastIndex)}</span>)
      }

      if (parts.length === 0 && remaining) {
        parts.unshift(<span key={`line-${lineIndex}`}>{remaining}</span>)
      }
    }

    return (
      <div key={lineIndex} className="whitespace-pre">
        {parts.length > 0 ? parts.reverse() : ' '}
      </div>
    )
  })
}

export function TemplateInserter({ open, onClose, onInsert }: TemplateInserterProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('method-alias')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [previewCode, setPreviewCode] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'category' | 'favorites' | 'recent'>('category')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const insertButtonRef = useRef<HTMLButtonElement>(null)

  const { favorites, recentlyUsed, toggleFavorite, addToRecent, isFavorite } = useTemplateStore()

  // Get template counts per category
  const templateCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      counts[cat.id] = getTemplatesByCategory(cat.id).length
    }
    return counts
  }, [])

  // Get templates for selected category
  const categoryTemplates = useMemo(
    () => getTemplatesByCategory(selectedCategory),
    [selectedCategory]
  )

  // Get favorite templates
  const favoriteTemplates = useMemo(() => {
    return favorites
      .map((id) => getTemplate(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
  }, [favorites])

  // Get recently used templates
  const recentTemplates = useMemo(() => {
    return recentlyUsed
      .map((r) => getTemplate(r.id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
  }, [recentlyUsed])

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    let baseTemplates = categoryTemplates
    if (viewMode === 'favorites') baseTemplates = favoriteTemplates
    else if (viewMode === 'recent') baseTemplates = recentTemplates

    if (!searchQuery.trim()) return baseTemplates
    const query = searchQuery.toLowerCase()
    return baseTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    )
  }, [viewMode, categoryTemplates, favoriteTemplates, recentTemplates, searchQuery])

  // Get selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return undefined
    return getTemplate(selectedTemplateId)
  }, [selectedTemplateId])

  // Get class options grouped by category
  const classOptionsGrouped = useMemo(() => {
    const grouped = getClassesGrouped()
    return Object.entries(grouped).map(([category, classes]) => ({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      options: classes.map((c) => ({ value: c.name, label: c.name }))
    }))
  }, [])

  // Get method options for selected class
  const methodOptions = useMemo(() => {
    const className = fieldValues.className as string
    if (!className) return []
    return getMethodOptions(className)
  }, [fieldValues.className])

  // Update preview when template or field values change
  useEffect(() => {
    if (selectedTemplate) {
      try {
        const code = selectedTemplate.generate(fieldValues)
        setPreviewCode(code)
      } catch {
        setPreviewCode('// Error generating code - please check field values')
      }
    } else {
      setPreviewCode('')
    }
  }, [selectedTemplate, fieldValues])

  // Initialize field values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const defaults = getTemplateDefaults(selectedTemplate.id)
      setFieldValues(defaults)
    } else {
      setFieldValues({})
    }
  }, [selectedTemplate])

  // Reset selection when category changes
  useEffect(() => {
    setSelectedTemplateId(null)
    setFieldValues({})
    setPreviewCode('')
    setSearchQuery('')
    setViewMode('category')
  }, [selectedCategory])

  // Reset method when class changes
  useEffect(() => {
    if (fieldValues.className) {
      setFieldValues((prev) => ({ ...prev, methodName: '' }))
    }
  }, [fieldValues.className])

  // Focus search on open
  useEffect(() => {
    if (open) {
      const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 100)
      return () => clearTimeout(focusTimer)
    }
    return undefined
  }, [open])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl+Enter to insert
        if (previewCode && !previewCode.startsWith('// Error')) {
          if (selectedTemplateId) {
            addToRecent(selectedTemplateId)
          }
          onInsert(previewCode)
          onClose()
        }
      }
    },
    [onClose, onInsert, previewCode, selectedTemplateId, addToRecent]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [open, handleKeyDown])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleInsert = () => {
    if (previewCode && !previewCode.startsWith('// Error')) {
      if (selectedTemplateId) {
        addToRecent(selectedTemplateId)
      }
      onInsert(previewCode)
      onClose()
    }
  }

  const handleCopyCode = async () => {
    if (previewCode) {
      await navigator.clipboard.writeText(previewCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  // Check if a field should be visible based on dependsOn
  const isFieldVisible = (field: TemplateField): boolean => {
    if (!field.dependsOn) return true
    const depValue = fieldValues[field.dependsOn.field]
    if (field.dependsOn.value === undefined) {
      return depValue !== undefined && depValue !== ''
    }
    return depValue === field.dependsOn.value
  }

  // Render a field based on its type
  const renderField = (field: TemplateField) => {
    if (!isFieldVisible(field)) return null

    const value = fieldValues[field.id]

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              id={field.id}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="h-9"
            />
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={(value as number) ?? ''}
              onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
              placeholder={field.placeholder}
              className="h-9"
            />
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      case 'boolean':
        return (
          <div
            key={field.id}
            className="flex items-center justify-between rounded-md border border-border bg-card/50 p-3"
          >
            <div className="space-y-0.5">
              <Label htmlFor={field.id} className="text-sm font-medium flex items-center gap-1.5">
                {field.label}
                {field.help && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{field.help}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Label>
            </div>
            <Switch
              id={field.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleFieldChange(field.id, v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      case 'class-select':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleFieldChange(field.id, v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={field.placeholder || 'Select a class...'} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {classOptionsGrouped.map((group) => (
                  <SelectGroup key={group.category}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </SelectLabel>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      case 'method-select':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleFieldChange(field.id, v)}
              disabled={methodOptions.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    methodOptions.length === 0
                      ? 'Select a class first...'
                      : field.placeholder || 'Select a method...'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {methodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      case 'key-select':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.help && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{field.help}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleFieldChange(field.id, v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={field.placeholder || 'Select a key...'} />
              </SelectTrigger>
              <SelectContent>
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
              </SelectContent>
            </Select>
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (!open) return null

  const selectedCategoryInfo = CATEGORIES.find((c) => c.id === selectedCategory)
  const canInsert = previewCode && !previewCode.startsWith('// Error')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={handleOverlayClick}
    >
      <div
        className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Code Templates</h2>
              <p className="text-sm text-muted-foreground">
                {getAllTemplates().length} templates available
              </p>
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

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-52 shrink-0 border-r border-border bg-card/50">
            <div className="p-3 pb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Categories
              </span>
            </div>
            {/* Quick Access */}
            <div className="px-2 pb-1">
              <button
                onClick={() => { setViewMode('favorites'); setSelectedTemplateId(null); setSearchQuery('') }}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all',
                  viewMode === 'favorites'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Star className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Favorites</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    viewMode === 'favorites'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {favorites.length}
                </span>
              </button>
              <button
                onClick={() => { setViewMode('recent'); setSelectedTemplateId(null); setSearchQuery('') }}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all mt-0.5',
                  viewMode === 'recent'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Recent</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    viewMode === 'recent'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {recentlyUsed.length}
                </span>
              </button>
            </div>
            <div className="mx-3 my-1 border-t border-border" />
            <div className="space-y-0.5 px-2 pb-2">
              {CATEGORIES.map((category) => {
                const IconComponent = ICON_MAP[category.icon] || Play
                const count = templateCounts[category.id] || 0
                return (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); setViewMode('category') }}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all',
                      selectedCategory === category.id && viewMode === 'category'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{category.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        selectedCategory === category.id && viewMode === 'category'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search and Category Header */}
            <div className="border-b border-border bg-card/30 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        viewMode === 'favorites' ? 'Search favorites...'
                        : viewMode === 'recent' ? 'Search recent...'
                        : `Search ${selectedCategoryInfo?.name.toLowerCase()} templates...`
                      }
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
                {viewMode === 'category' && selectedCategoryInfo && (
                  <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                    <ChevronRight className="h-4 w-4" />
                    <span>{selectedCategoryInfo.name}</span>
                  </div>
                )}
                {viewMode === 'favorites' && (
                  <div className="hidden items-center gap-2 text-sm text-amber-500 sm:flex">
                    <Star className="h-4 w-4" />
                    <span>Favorites</span>
                  </div>
                )}
                {viewMode === 'recent' && (
                  <div className="hidden items-center gap-2 text-sm text-blue-500 sm:flex">
                    <Clock className="h-4 w-4" />
                    <span>Recent</span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selection and Configuration */}
            <div className="flex flex-1 overflow-hidden">
              {/* Templates List */}
              <div className="w-72 shrink-0 overflow-y-auto border-r border-border p-4">
                {filteredTemplates.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={cn(
                          'group relative w-full rounded-lg border p-3 text-left transition-all',
                          selectedTemplateId === template.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Code2
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0',
                              selectedTemplateId === template.id
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{template.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {template.description}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(template.id) }}
                          className={cn(
                            'absolute top-2 right-2 p-1 rounded-md transition-colors',
                            isFavorite(template.id)
                              ? 'text-amber-400 hover:text-amber-500'
                              : 'text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100'
                          )}
                        >
                          <Star className={cn('h-3.5 w-3.5', isFavorite(template.id) && 'fill-current')} />
                        </button>
                      </button>
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

              {/* Configuration Panel */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {selectedTemplate ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="mb-6">
                        <h3 className="text-base font-semibold">{selectedTemplate.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTemplate.description}
                        </p>
                        {selectedTemplate.docUrl && (
                          <a
                            href={selectedTemplate.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            MZ Documentation
                          </a>
                        )}
                      </div>

                      {selectedTemplate.fields.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            <span>Configuration</span>
                            <span className="h-px flex-1 bg-border" />
                          </div>
                          <TooltipProvider delayDuration={300}>
                            <div className="grid gap-4">
                              {selectedTemplate.fields.map((field) => renderField(field))}
                            </div>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
                          No configuration required for this template
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <div className="mb-4 rounded-full bg-muted/50 p-4">
                      <Code2 className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">Select a template</p>
                    <p className="text-xs mt-1">Choose a template from the list to configure it</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Area */}
            <div className="border-t border-border bg-card/50">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Preview
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!previewCode}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="h-44 overflow-auto bg-[#1e1e2e] p-4">
                {previewCode ? (
                  <code className="font-mono text-[13px] leading-relaxed text-gray-300">
                    {highlightCode(previewCode)}
                  </code>
                ) : (
                  <p className="font-mono text-sm text-gray-500">
                    {selectedTemplate
                      ? '// Configure the fields above to generate code'
                      : '// Select a template to preview the generated code'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {selectedTemplate
              ? `Template: ${selectedTemplate.name}`
              : 'Select a template to get started'}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              ref={insertButtonRef}
              onClick={handleInsert}
              disabled={!canInsert}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Insert Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
