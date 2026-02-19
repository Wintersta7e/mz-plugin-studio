import { useState } from 'react'
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
  Users
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

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  count: number
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  count
}: CollapsibleSectionProps) {
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
    return <div className="px-4 py-2 text-sm text-muted-foreground italic">{emptyMessage}</div>
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
  const skills = useProjectStore((s) => s.skills)
  const weapons = useProjectStore((s) => s.weapons)
  const armors = useProjectStore((s) => s.armors)
  const enemies = useProjectStore((s) => s.enemies)
  const states = useProjectStore((s) => s.states)
  const animations = useProjectStore((s) => s.animations)
  const tilesets = useProjectStore((s) => s.tilesets)
  const commonEvents = useProjectStore((s) => s.commonEvents)
  const classes = useProjectStore((s) => s.classes)
  const troops = useProjectStore((s) => s.troops)

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

  const toggleSection = (section: TabType) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Count named items only
  const namedSwitches = switches.filter((s) => s.name && s.name.trim() !== '')
  const namedVariables = variables.filter((v) => v.name && v.name.trim() !== '')
  const namedActors = actors.filter((a) => a.name && a.name.trim() !== '')
  const namedItems = items.filter((i) => i.name && i.name.trim() !== '')
  const namedSkills = skills.filter((s) => s.name && s.name.trim() !== '')
  const namedWeapons = weapons.filter((w) => w.name && w.name.trim() !== '')
  const namedArmors = armors.filter((a) => a.name && a.name.trim() !== '')
  const namedEnemies = enemies.filter((e) => e.name && e.name.trim() !== '')
  const namedStates = states.filter((s) => s.name && s.name.trim() !== '')
  const namedAnimations = animations.filter((a) => a.name && a.name.trim() !== '')
  const namedTilesets = tilesets.filter((t) => t.name && t.name.trim() !== '')
  const namedCommonEvents = commonEvents.filter((c) => c.name && c.name.trim() !== '')
  const namedClasses = classes.filter((c) => c.name && c.name.trim() !== '')
  const namedTroops = troops.filter((t) => t.name && t.name.trim() !== '')

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

        <CollapsibleSection
          title="Skills"
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          isOpen={openSections.skills}
          onToggle={() => toggleSection('skills')}
          count={namedSkills.length}
        >
          <DataList items={namedSkills} emptyMessage="No skills defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Weapons"
          icon={<Sword className="h-4 w-4 text-red-500" />}
          isOpen={openSections.weapons}
          onToggle={() => toggleSection('weapons')}
          count={namedWeapons.length}
        >
          <DataList items={namedWeapons} emptyMessage="No weapons defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Armors"
          icon={<Shield className="h-4 w-4 text-blue-500" />}
          isOpen={openSections.armors}
          onToggle={() => toggleSection('armors')}
          count={namedArmors.length}
        >
          <DataList items={namedArmors} emptyMessage="No armors defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Enemies"
          icon={<Skull className="h-4 w-4 text-red-500" />}
          isOpen={openSections.enemies}
          onToggle={() => toggleSection('enemies')}
          count={namedEnemies.length}
        >
          <DataList items={namedEnemies} emptyMessage="No enemies defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="States"
          icon={<Activity className="h-4 w-4 text-green-500" />}
          isOpen={openSections.states}
          onToggle={() => toggleSection('states')}
          count={namedStates.length}
        >
          <DataList items={namedStates} emptyMessage="No states defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Animations"
          icon={<Sparkles className="h-4 w-4 text-yellow-500" />}
          isOpen={openSections.animations}
          onToggle={() => toggleSection('animations')}
          count={namedAnimations.length}
        >
          <DataList items={namedAnimations} emptyMessage="No animations defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Tilesets"
          icon={<Grid3x3 className="h-4 w-4 text-teal-500" />}
          isOpen={openSections.tilesets}
          onToggle={() => toggleSection('tilesets')}
          count={namedTilesets.length}
        >
          <DataList items={namedTilesets} emptyMessage="No tilesets defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Common Events"
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          isOpen={openSections.commonEvents}
          onToggle={() => toggleSection('commonEvents')}
          count={namedCommonEvents.length}
        >
          <DataList items={namedCommonEvents} emptyMessage="No common events defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Classes"
          icon={<GraduationCap className="h-4 w-4 text-indigo-500" />}
          isOpen={openSections.classes}
          onToggle={() => toggleSection('classes')}
          count={namedClasses.length}
        >
          <DataList items={namedClasses} emptyMessage="No classes defined" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Troops"
          icon={<Users className="h-4 w-4 text-red-500" />}
          isOpen={openSections.troops}
          onToggle={() => toggleSection('troops')}
          count={namedTroops.length}
        >
          <DataList items={namedTroops} emptyMessage="No troops defined" />
        </CollapsibleSection>
      </ScrollArea>
    </div>
  )
}
