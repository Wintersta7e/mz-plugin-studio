import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import {
  X,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  Variable,
  User,
  Package,
  Zap,
  Sword,
  Shield,
  Skull,
  Activity,
  Sparkles,
  Grid3x3,
  Calendar,
  GraduationCap,
  Users,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { useProjectStore } from '../../stores'

interface ProjectBrowserProps {
  onClose: () => void
}

type TabType =
  | 'switches'
  | 'variables'
  | 'actors'
  | 'items'
  | 'skills'
  | 'weapons'
  | 'armors'
  | 'enemies'
  | 'states'
  | 'animations'
  | 'tilesets'
  | 'commonEvents'
  | 'classes'
  | 'troops'

interface NamedEntry {
  id: number
  name: string
}

interface DataSection {
  key: TabType
  title: string
  icon: ReactNode
  emptyMessage: string
}

// The sections in the order the panel lists them
const SECTIONS: readonly DataSection[] = [
  {
    key: 'switches',
    title: 'Switches',
    icon: <ToggleLeft className="h-4 w-4 text-emerald-500" />,
    emptyMessage: 'No named switches'
  },
  {
    key: 'variables',
    title: 'Variables',
    icon: <Variable className="h-4 w-4 text-blue-500" />,
    emptyMessage: 'No named variables'
  },
  {
    key: 'actors',
    title: 'Actors',
    icon: <User className="h-4 w-4 text-purple-500" />,
    emptyMessage: 'No actors defined'
  },
  {
    key: 'items',
    title: 'Items',
    icon: <Package className="h-4 w-4 text-amber-500" />,
    emptyMessage: 'No items defined'
  },
  {
    key: 'skills',
    title: 'Skills',
    icon: <Zap className="h-4 w-4 text-orange-500" />,
    emptyMessage: 'No skills defined'
  },
  {
    key: 'weapons',
    title: 'Weapons',
    icon: <Sword className="h-4 w-4 text-red-500" />,
    emptyMessage: 'No weapons defined'
  },
  {
    key: 'armors',
    title: 'Armors',
    icon: <Shield className="h-4 w-4 text-blue-500" />,
    emptyMessage: 'No armors defined'
  },
  {
    key: 'enemies',
    title: 'Enemies',
    icon: <Skull className="h-4 w-4 text-red-500" />,
    emptyMessage: 'No enemies defined'
  },
  {
    key: 'states',
    title: 'States',
    icon: <Activity className="h-4 w-4 text-green-500" />,
    emptyMessage: 'No states defined'
  },
  {
    key: 'animations',
    title: 'Animations',
    icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
    emptyMessage: 'No animations defined'
  },
  {
    key: 'tilesets',
    title: 'Tilesets',
    icon: <Grid3x3 className="h-4 w-4 text-teal-500" />,
    emptyMessage: 'No tilesets defined'
  },
  {
    key: 'commonEvents',
    title: 'Common Events',
    icon: <Calendar className="h-4 w-4 text-purple-500" />,
    emptyMessage: 'No common events defined'
  },
  {
    key: 'classes',
    title: 'Classes',
    icon: <GraduationCap className="h-4 w-4 text-indigo-500" />,
    emptyMessage: 'No classes defined'
  },
  {
    key: 'troops',
    title: 'Troops',
    icon: <Users className="h-4 w-4 text-red-500" />,
    emptyMessage: 'No troops defined'
  }
]

// Entries with a name that is more than whitespace
function filterNamed<T extends NamedEntry>(array: readonly T[]): T[] {
  return array.filter((x) => x.name.trim() !== '')
}

interface CollapsibleSectionProps {
  title: string
  icon: ReactNode
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
  count: number
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  count
}: Readonly<CollapsibleSectionProps>) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {icon}
        <span className="font-medium">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
      </button>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  )
}

interface DataListProps {
  items: readonly NamedEntry[]
  emptyMessage: string
}

function DataList({ items, emptyMessage }: Readonly<DataListProps>) {
  const filteredItems = filterNamed(items)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Cleanup copy timer on unmount (LEAK-02)
  useEffect(
    () => () => {
      clearTimeout(copyTimerRef.current)
    },
    []
  )

  if (filteredItems.length === 0) {
    return <div className="px-4 py-2 text-sm text-muted-foreground italic">{emptyMessage}</div>
  }

  const handleCopy = (id: number) => {
    void navigator.clipboard.writeText(String(id))
    setCopiedId(id)
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null)
    }, 1500)
  }

  return (
    <div className="space-y-0.5 px-4">
      {filteredItems.map((item) => (
        <div
          key={item.id}
          className="group flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
        >
          <span className="w-10 text-right font-mono text-xs text-muted-foreground">
            {item.id}:
          </span>
          <span className="flex-1 truncate">{item.name}</span>
          <button
            type="button"
            onClick={() => {
              handleCopy(item.id)
            }}
            className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover:flex"
            aria-label={`Copy ID ${String(item.id)}`}
            title="Copy ID"
          >
            {copiedId === item.id ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}

// One section's named entries (memoized to avoid O(n) scans on unrelated re-renders)
function NamedSection({
  section,
  isOpen,
  onToggle
}: Readonly<{ section: DataSection; isOpen: boolean; onToggle: (section: TabType) => void }>) {
  const entries = useProjectStore((s): readonly NamedEntry[] => s[section.key])
  const named = useMemo(() => filterNamed(entries), [entries])
  return (
    <CollapsibleSection
      title={section.title}
      icon={section.icon}
      isOpen={isOpen}
      onToggle={() => {
        onToggle(section.key)
      }}
      count={named.length}
    >
      <DataList items={named} emptyMessage={section.emptyMessage} />
    </CollapsibleSection>
  )
}

export function ProjectBrowser({ onClose }: Readonly<ProjectBrowserProps>) {
  const project = useProjectStore((s) => s.project)

  const [openSections, setOpenSections] = useState<Record<TabType, boolean>>({
    switches: true,
    variables: false,
    actors: false,
    items: false,
    skills: false,
    weapons: false,
    armors: false,
    enemies: false,
    states: false,
    animations: false,
    tilesets: false,
    commonEvents: false,
    classes: false,
    troops: false
  })

  if (!project) {
    return (
      <div className="flex h-full flex-col bg-background border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">Project Data</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">
          No project loaded
        </div>
      </div>
    )
  }

  const toggleSection = (section: TabType) => {
    setOpenSections((previous) => ({ ...previous, [section]: !previous[section] }))
  }

  return (
    <div
      data-testid="project-data-panel"
      className="flex h-full w-72 flex-col bg-background border-l border-border"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-semibold">Project Data</h2>
          <p className="text-xs text-muted-foreground truncate">{project.gameTitle}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {SECTIONS.map((section) => (
          <NamedSection
            key={section.key}
            section={section}
            isOpen={openSections[section.key]}
            onToggle={toggleSection}
          />
        ))}
      </ScrollArea>
    </div>
  )
}
