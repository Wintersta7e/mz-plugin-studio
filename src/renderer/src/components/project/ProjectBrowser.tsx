import { useState } from 'react'
import { X, ChevronDown, ChevronRight, ToggleLeft, Variable, User, Package } from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { useProjectStore } from '../../stores'

interface ProjectBrowserProps {
  onClose: () => void
}

type TabType = 'switches' | 'variables' | 'actors' | 'items'

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  count: number
}

function CollapsibleSection({ title, icon, isOpen, onToggle, children, count }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-border">
      <button
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
  items: { id: number; name: string }[]
  emptyMessage: string
}

function DataList({ items, emptyMessage }: DataListProps) {
  const filteredItems = items.filter((item) => item.name && item.name.trim() !== '')

  if (filteredItems.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground italic">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-0.5 px-4">
      {filteredItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
        >
          <span className="w-10 text-right font-mono text-xs text-muted-foreground">
            {item.id}:
          </span>
          <span className="truncate">{item.name}</span>
        </div>
      ))}
    </div>
  )
}

export function ProjectBrowser({ onClose }: ProjectBrowserProps) {
  const project = useProjectStore((s) => s.project)
  const switches = useProjectStore((s) => s.switches)
  const variables = useProjectStore((s) => s.variables)
  const actors = useProjectStore((s) => s.actors)
  const items = useProjectStore((s) => s.items)

  const [openSections, setOpenSections] = useState<Record<TabType, boolean>>({
    switches: true,
    variables: false,
    actors: false,
    items: false
  })

  const toggleSection = (section: TabType) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Count named items only
  const namedSwitches = switches.filter((s) => s.name && s.name.trim() !== '')
  const namedVariables = variables.filter((v) => v.name && v.name.trim() !== '')
  const namedActors = actors.filter((a) => a.name && a.name.trim() !== '')
  const namedItems = items.filter((i) => i.name && i.name.trim() !== '')

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

  return (
    <div className="flex h-full w-72 flex-col bg-background border-l border-border">
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
        <CollapsibleSection
          title="Switches"
          icon={<ToggleLeft className="h-4 w-4 text-emerald-500" />}
          isOpen={openSections.switches}
          onToggle={() => toggleSection('switches')}
          count={namedSwitches.length}
        >
          <DataList items={namedSwitches} emptyMessage="No named switches" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Variables"
          icon={<Variable className="h-4 w-4 text-blue-500" />}
          isOpen={openSections.variables}
          onToggle={() => toggleSection('variables')}
          count={namedVariables.length}
        >
          <DataList items={namedVariables} emptyMessage="No named variables" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Actors"
          icon={<User className="h-4 w-4 text-purple-500" />}
          isOpen={openSections.actors}
          onToggle={() => toggleSection('actors')}
          count={namedActors.length}
        >
          <DataList items={namedActors} emptyMessage="No actors defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Items"
          icon={<Package className="h-4 w-4 text-amber-500" />}
          isOpen={openSections.items}
          onToggle={() => toggleSection('items')}
          count={namedItems.length}
        >
          <DataList items={namedItems} emptyMessage="No items defined" />
        </CollapsibleSection>
      </ScrollArea>
    </div>
  )
}
