import { useState, type ReactNode } from 'react'
import { Sparkles, Plus, Trash2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { usePluginStore, useProjectStore } from '../../stores'
import { generateHelpText } from '../../lib/exportFormats'
import type { LocalizedContent, NoteParam } from '../../types/plugin'
import {
  RAW_MODE_HEADER_READ_ONLY_NOTICE,
  RAW_MODE_READ_ONLY_NOTICE,
  useIsRawModeActive,
  useIsHeaderReadOnly
} from '../../lib/raw-mode'
import { nonBlankLines, normalizeLines, useTypedText } from '../../lib/typed-text'

// A file with no main annotation block cannot take header changes in raw mode
type HeaderFieldset = Readonly<{ disabled: boolean; title: string | undefined }>

type HeaderFieldsProps = Readonly<{ fieldset: HeaderFieldset }>

const NO_LINES: readonly string[] = []

const NO_NOTE_PARAMS: readonly NoteParam[] = []

const NOTE_DATA_OPTIONS = [
  'actors',
  'classes',
  'skills',
  'items',
  'weapons',
  'armors',
  'enemies',
  'troops',
  'states',
  'tilesets',
  'animations',
  'maps'
]

// Asks before replacing help text already there, then writes help made from the whole plugin
async function autoGenerateHelp(): Promise<void> {
  if (usePluginStore.getState().plugin.meta.help.trim() !== '') {
    const answer = await globalThis.api.dialog.message({
      type: 'question',
      title: 'Replace help text',
      message: 'This will replace the existing help text. Continue?',
      buttons: ['Cancel', 'Replace']
    })
    if (answer !== 1) return
  }
  const { plugin, updateMeta } = usePluginStore.getState()
  updateMeta({ help: generateHelpText(plugin) })
}

function updateLocalization(lang: string, content: Partial<LocalizedContent>): void {
  const { plugin, updateMeta } = usePluginStore.getState()
  const localizations = plugin.meta.localizations ?? {}
  updateMeta({
    localizations: { ...localizations, [lang]: { ...localizations[lang], ...content } }
  })
}

// The database a note parameter names; an empty one shows as None, as the select has no empty item
const selectedData = (data: string | undefined): string =>
  data === undefined || data === '' ? 'none' : data

const newRowKeys = (count: number): string[] =>
  Array.from({ length: count }, () => crypto.randomUUID())

/**
One key per note parameter row that stays with its row when an earlier row is deleted. Rows
added or removed elsewhere, such as by undo or by opening another plugin, fit the keys at the end.
*/
function useRowKeys(count: number): readonly [readonly string[], (keys: string[]) => void] {
  const [keys, setKeys] = useState<readonly string[]>(() => newRowKeys(count))
  if (keys.length !== count) {
    setKeys(
      keys.length > count ? keys.slice(0, count) : [...keys, ...newRowKeys(count - keys.length)]
    )
  }
  return [keys, setKeys]
}

type MetaInputProps = Readonly<{
  field: 'version' | 'author' | 'url' | 'target'
  label: string
  placeholder: string
}>

function MetaInput({ field, label, placeholder }: MetaInputProps) {
  const value = usePluginStore((s) => s.plugin.meta[field])
  const updateMeta = usePluginStore((s) => s.updateMeta)
  return (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        value={value}
        onChange={(event) => {
          updateMeta({ [field]: event.target.value })
        }}
        placeholder={placeholder}
      />
    </div>
  )
}

function NameInput() {
  const name = usePluginStore((s) => s.plugin.meta.name)
  const updateMeta = usePluginStore((s) => s.updateMeta)
  // A plugin loaded from a file is saved back to that file, so its name stays the file's
  const importedFrom = usePluginStore((s) => s.plugin.importedFrom)
  const nameReadOnly =
    importedFrom === undefined
      ? { readOnly: false }
      : {
          readOnly: true,
          title: `Loaded from ${importedFrom}: the plugin name is the file name, so it cannot be changed here.`
        }
  return (
    <div className="space-y-2">
      <Label htmlFor="name">Plugin Name</Label>
      <Input
        id="name"
        data-testid="meta-name"
        value={name}
        onChange={(event) => {
          updateMeta({ name: event.target.value })
        }}
        placeholder="MyPlugin"
        {...nameReadOnly}
      />
      {importedFrom !== undefined && (
        <p className="text-xs text-muted-foreground">
          Loaded from {importedFrom}: the name is the file name. Export in the preview can write a
          copy under another file name, but if the plugin&apos;s code names itself, the copy&apos;s
          commands and parameters may not work in a game; Export asks first when they would not.
        </p>
      )}
    </div>
  )
}

function HeaderFields({ fieldset }: HeaderFieldsProps) {
  return (
    <fieldset {...fieldset} className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <NameInput />
        <MetaInput field="version" label="Version" placeholder="1.0.0" />
      </div>
      <MetaInput field="author" label="Author" placeholder="Your name" />
      <MetaInput field="url" label="URL" placeholder="https://example.com" />
    </fieldset>
  )
}

function EnglishTab({ fieldset }: HeaderFieldsProps) {
  const description = usePluginStore((s) => s.plugin.meta.description)
  const help = usePluginStore((s) => s.plugin.meta.help)
  const updateMeta = usePluginStore((s) => s.updateMeta)
  return (
    <TabsContent value="en" className="space-y-4">
      <fieldset {...fieldset} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description-en">Description</Label>
          <Textarea
            id="description-en"
            data-testid="meta-description"
            value={description}
            onChange={(event) => {
              updateMeta({ description: event.target.value })
            }}
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
              onClick={() => {
                void autoGenerateHelp()
              }}
              title="Auto-generate help text from plugin metadata"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Auto-generate
            </Button>
          </div>
          <Textarea
            id="help-en"
            value={help}
            onChange={(event) => {
              updateMeta({ help: event.target.value })
            }}
            placeholder="Detailed help and usage instructions"
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      </fieldset>
    </TabsContent>
  )
}

type LocalizedTabProps = Readonly<{
  lang: string
  language: string
  descriptionPlaceholder: string
  helpPlaceholder: string
}>

function LocalizedTab({
  lang,
  language,
  descriptionPlaceholder,
  helpPlaceholder
}: LocalizedTabProps) {
  const content = usePluginStore((s) => s.plugin.meta.localizations?.[lang])
  // Raw mode keeps the file's language blocks, so their fields are read-only
  const isRawMode = useIsRawModeActive()
  const readOnly = isRawMode
    ? { readOnly: true, title: RAW_MODE_READ_ONLY_NOTICE }
    : { readOnly: false }
  return (
    <TabsContent value={lang} className="space-y-4">
      {isRawMode && <p className="text-sm text-muted-foreground">{RAW_MODE_READ_ONLY_NOTICE}</p>}
      <div className="space-y-2">
        <Label htmlFor={`description-${lang}`}>Description ({language})</Label>
        <Textarea
          id={`description-${lang}`}
          {...readOnly}
          value={content?.description ?? ''}
          onChange={(event) => {
            updateLocalization(lang, { description: event.target.value })
          }}
          placeholder={descriptionPlaceholder}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`help-${lang}`}>Help Text ({language})</Label>
        <Textarea
          id={`help-${lang}`}
          {...readOnly}
          value={content?.help ?? ''}
          onChange={(event) => {
            updateLocalization(lang, { help: event.target.value })
          }}
          placeholder={helpPlaceholder}
          rows={6}
          className="font-mono text-sm"
        />
      </div>
    </TabsContent>
  )
}

function LocalizedFields({ fieldset }: HeaderFieldsProps) {
  return (
    <div className="space-y-2">
      <Label>Description & Help</Label>
      <Tabs defaultValue="en" className="w-full">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ja">Japanese</TabsTrigger>
          <TabsTrigger value="zh">Chinese</TabsTrigger>
        </TabsList>
        <EnglishTab fieldset={fieldset} />
        <LocalizedTab
          lang="ja"
          language="Japanese"
          descriptionPlaceholder="プラグインの説明"
          helpPlaceholder="詳細なヘルプと使用方法"
        />
        <LocalizedTab
          lang="zh"
          language="Chinese"
          descriptionPlaceholder="插件描述"
          helpPlaceholder="详细帮助和使用说明"
        />
      </Tabs>
    </div>
  )
}

type LinesFieldProps = Readonly<{
  field: 'dependencies' | 'orderAfter' | 'orderBefore' | 'requiredAssets'
  label: string
  placeholder: string
  rows: number
  children: ReactNode
}>

// A field of one entry per line; blank lines are not stored
function LinesField({ field, label, placeholder, rows, children }: LinesFieldProps) {
  const lines = usePluginStore((s) => s.plugin.meta[field]) ?? NO_LINES
  const updateMeta = usePluginStore((s) => s.updateMeta)
  const [text, setText] = useTypedText(lines.join('\n'), normalizeLines)
  return (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Textarea
        id={field}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          updateMeta({ [field]: nonBlankLines(event.target.value) })
        }}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
      />
      {children}
    </div>
  )
}

function ProjectPluginNames({ names }: Readonly<{ names: readonly string[] }>) {
  const [showPluginNames, setShowPluginNames] = useState(false)
  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        className="hover:text-foreground underline decoration-dotted"
        onClick={() => {
          setShowPluginNames(!showPluginNames)
        }}
      >
        {names.length} project plugins available
      </button>
      {showPluginNames && (
        <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-muted/50 p-2 font-mono">
          {names.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>
      )}
    </div>
  )
}

type NoteParamRowProps = Readonly<{
  noteParam: NoteParam
  onUpdate: (updates: Partial<NoteParam>) => void
  onDelete: () => void
}>

function NoteParamRow({ noteParam, onUpdate, onDelete }: NoteParamRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tag Name</Label>
          <Input
            value={noteParam.name}
            onChange={(event) => {
              onUpdate({ name: event.target.value })
            }}
            placeholder="tagName"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Input
            value={noteParam.type}
            onChange={(event) => {
              onUpdate({ type: event.target.value })
            }}
            placeholder="file"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Directory</Label>
          <Input
            value={noteParam.dir ?? ''}
            onChange={(event) => {
              onUpdate({ dir: event.target.value || undefined })
            }}
            placeholder="audio/bgm/"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Database</Label>
          <Select
            value={selectedData(noteParam.data)}
            onValueChange={(value) => {
              onUpdate({ data: value === 'none' ? undefined : value })
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {NOTE_DATA_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 pt-5">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function NoteParamsField() {
  const noteParams = usePluginStore((s) => s.plugin.meta.noteParams) ?? NO_NOTE_PARAMS
  const updateMeta = usePluginStore((s) => s.updateMeta)
  const [rowKeys, setRowKeys] = useRowKeys(noteParams.length)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Note Parameters (deployment)</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setRowKeys([...rowKeys, crypto.randomUUID()])
            updateMeta({ noteParams: [...noteParams, { name: '', type: 'file' }] })
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
      {noteParams.length > 0 && (
        <div className="space-y-3 rounded-md border border-border p-3">
          {noteParams.map((noteParam, index) => (
            <NoteParamRow
              key={rowKeys[index]}
              noteParam={noteParam}
              onUpdate={(updates) => {
                updateMeta({
                  noteParams: noteParams.map((row, at) =>
                    at === index ? { ...row, ...updates } : row
                  )
                })
              }}
              onDelete={() => {
                setRowKeys(rowKeys.toSpliced(index, 1))
                updateMeta({ noteParams: noteParams.toSpliced(index, 1) })
              }}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Declares which notetags reference files for MZ deployment packaging
      </p>
    </div>
  )
}

function DeploymentFields({ fieldset }: HeaderFieldsProps) {
  const pluginNames = useProjectStore((s) => s.dependencyReport?.pluginNames) ?? NO_LINES
  return (
    <fieldset {...fieldset} className="grid min-w-0 gap-4">
      <LinesField
        field="dependencies"
        label="Dependencies (one per line)"
        placeholder={'PluginName1\nPluginName2'}
        rows={3}
      >
        {pluginNames.length > 0 && <ProjectPluginNames names={pluginNames} />}
      </LinesField>
      <LinesField
        field="orderAfter"
        label="Order After (one per line)"
        placeholder="PluginName (plugins that must load before this one)"
        rows={2}
      >
        <p className="text-xs text-muted-foreground">Plugins that must load before this one</p>
      </LinesField>
      <LinesField
        field="orderBefore"
        label="Order Before (one per line)"
        placeholder="PluginName (plugins that must load after this one)"
        rows={2}
      >
        <p className="text-xs text-muted-foreground">Plugins that must load after this one</p>
      </LinesField>
      <LinesField
        field="requiredAssets"
        label="Required Assets (one per line)"
        placeholder={'img/pictures/title\naudio/bgm/theme'}
        rows={3}
      >
        <p className="text-xs text-muted-foreground">
          Assets preserved during MZ&apos;s &quot;Exclude unused files&quot; deployment (relative
          paths).
        </p>
      </LinesField>
      <NoteParamsField />
      <MetaInput field="target" label="Target" placeholder="MZ" />
    </fieldset>
  )
}

export function MetaEditor() {
  const isHeaderReadOnly = useIsHeaderReadOnly()
  const fieldset: HeaderFieldset = {
    disabled: isHeaderReadOnly,
    title: isHeaderReadOnly ? RAW_MODE_HEADER_READ_ONLY_NOTICE : undefined
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Plugin Metadata</h2>
      {isHeaderReadOnly && (
        <p className="text-sm text-muted-foreground">{RAW_MODE_HEADER_READ_ONLY_NOTICE}</p>
      )}

      <div className="grid gap-4">
        <HeaderFields fieldset={fieldset} />
        <LocalizedFields fieldset={fieldset} />
        <DeploymentFields fieldset={fieldset} />
      </div>
    </div>
  )
}
