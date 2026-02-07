import { useProjectStore, usePluginStore } from '../../stores'

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)
  const savedPath = usePluginStore((s) => s.savedPath)
  const plugin = usePluginStore((s) => s.plugin)

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        {project ? (
          <span>Project: {project.gameTitle}</span>
        ) : (
          <span>No project loaded</span>
        )}
        {plugin.meta.name && (
          <span>
            Plugin: {plugin.meta.name}
            {isDirty && <span className="text-destructive"> (modified)</span>}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {savedPath && <span className="truncate max-w-[300px]">{savedPath}</span>}
        <span>MZ Plugin Studio v1.0.0</span>
      </div>
    </div>
  )
}
