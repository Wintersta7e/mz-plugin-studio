import { useCallback, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { usePluginStore, useProjectStore } from '../../stores'
import { generateHelpText } from '../../lib/exportFormats'
import type { LocalizedContent } from '../../types/plugin'

export function MetaEditor() {
  const plugin = usePluginStore((s) => s.plugin)
  const updateMeta = usePluginStore((s) => s.updateMeta)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  const [showPluginNames, setShowPluginNames] = useState(false)

  const updateLocalization = (lang: string, content: Partial<LocalizedContent>) => {
    const currentLocalizations = plugin.meta.localizations || {}
    const currentLang = currentLocalizations[lang] || {}
    updateMeta({
      localizations: {
        ...currentLocalizations,
        [lang]: { ...currentLang, ...content }
      }
    })
  }

  const getLocalization = (lang: string): LocalizedContent => {
    return plugin.meta.localizations?.[lang] || { description: '', help: '' }
  }

  const handleAutoGenerateHelp = useCallback(() => {
    const currentHelp = plugin.meta.help

    if (currentHelp && currentHelp.trim()) {
      const confirmed = window.confirm('This will replace the existing help text. Continue?')
      if (!confirmed) return
    }

    const helpText = generateHelpText(plugin)
    updateMeta({ help: helpText })
  }, [plugin, updateMeta])

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Plugin Metadata</h2>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plugin Name</Label>
            <Input
              id="name"
              value={plugin.meta.name}
              onChange={(e) => updateMeta({ name: e.target.value })}
              placeholder="MyPlugin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={plugin.meta.version}
              onChange={(e) => updateMeta({ version: e.target.value })}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={plugin.meta.author}
            onChange={(e) => updateMeta({ author: e.target.value })}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={plugin.meta.url}
            onChange={(e) => updateMeta({ url: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        {/* Localized Description and Help with Tabs */}
        <div className="space-y-2">
          <Label>Description & Help</Label>
          <Tabs defaultValue="en" className="w-full">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ja">Japanese</TabsTrigger>
              <TabsTrigger value="zh">Chinese</TabsTrigger>
            </TabsList>

            <TabsContent value="en" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description-en">Description</Label>
                <Textarea
                  id="description-en"
                  value={plugin.meta.description}
                  onChange={(e) => updateMeta({ description: e.target.value })}
                  placeholder="A brief description of your plugin"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="help-en">Help Text</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleAutoGenerateHelp}
                    title="Auto-generate help text from plugin metadata"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Auto-generate
                  </Button>
                </div>
                <Textarea
                  id="help-en"
                  value={plugin.meta.help}
                  onChange={(e) => updateMeta({ help: e.target.value })}
                  placeholder="Detailed help and usage instructions"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="ja" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description-ja">Description (Japanese)</Label>
                <Textarea
                  id="description-ja"
                  value={getLocalization('ja').description || ''}
                  onChange={(e) => updateLocalization('ja', { description: e.target.value })}
                  placeholder="プラグインの説明"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-ja">Help Text (Japanese)</Label>
                <Textarea
                  id="help-ja"
                  value={getLocalization('ja').help || ''}
                  onChange={(e) => updateLocalization('ja', { help: e.target.value })}
                  placeholder="詳細なヘルプと使用方法"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="zh" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description-zh">Description (Chinese)</Label>
                <Textarea
                  id="description-zh"
                  value={getLocalization('zh').description || ''}
                  onChange={(e) => updateLocalization('zh', { description: e.target.value })}
                  placeholder="插件描述"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-zh">Help Text (Chinese)</Label>
                <Textarea
                  id="help-zh"
                  value={getLocalization('zh').help || ''}
                  onChange={(e) => updateLocalization('zh', { help: e.target.value })}
                  placeholder="详细帮助和使用说明"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependencies">Dependencies (one per line)</Label>
          <Textarea
            id="dependencies"
            value={plugin.meta.dependencies.join('\n')}
            onChange={(e) =>
              updateMeta({
                dependencies: e.target.value.split('\n').filter((s) => s.trim())
              })
            }
            placeholder="PluginName1&#10;PluginName2"
            rows={3}
            className="font-mono text-sm"
          />
          {dependencyReport && dependencyReport.pluginNames.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground underline decoration-dotted"
                onClick={() => setShowPluginNames(!showPluginNames)}
              >
                {dependencyReport.pluginNames.length} project plugins available
              </button>
              {showPluginNames && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-muted/50 p-2 font-mono">
                  {dependencyReport.pluginNames.map((name) => (
                    <div key={name}>{name}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderAfter">Order After (one per line)</Label>
          <Textarea
            id="orderAfter"
            value={(plugin.meta.orderAfter || []).join('\n')}
            onChange={(e) =>
              updateMeta({
                orderAfter: e.target.value.split('\n').filter((s) => s.trim())
              })
            }
            placeholder="PluginName (plugins that must load before this one)"
            rows={2}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Plugins that must load before this one
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target</Label>
          <Input
            id="target"
            value={plugin.meta.target}
            onChange={(e) => updateMeta({ target: e.target.value })}
            placeholder="MZ"
          />
        </div>
      </div>
    </div>
  )
}
