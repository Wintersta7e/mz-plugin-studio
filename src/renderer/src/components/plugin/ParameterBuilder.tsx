import { useState, useLayoutEffect, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Copy,
  Download,
  Upload,
  Bookmark
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { usePluginStore, useProjectStore, useSettingsStore } from '../../stores'
import {
  createEmptyParameter,
  type PluginParameter,
  type ParamType,
  type PluginStruct
} from '../../types/plugin'
import { generateParameterComment } from '../../lib/generator'
import {
  serializeParams,
  deserializeParams,
  duplicateParams,
  type ParamImportResult
} from '../../lib/param-io'
import { RAW_MODE_HEADER_READ_ONLY_NOTICE, useIsHeaderReadOnly } from '../../lib/raw-mode'
import { cn, userMessage } from '../../lib/utilities'
import { PARAM_TYPE_GROUPS, defaultText, toLimit } from './param-types'
import { TypeFields } from './TypeFields'

const paramCardSpring = { type: 'spring' as const, stiffness: 400, damping: 35 }

/**
Map from param id to param name — lightweight alternative to passing full array (R3-03)
*/
type ParamNameMap = ReadonlyMap<string, string>

interface GameDataOption {
  id: number
  name: string
}

/**
The loaded project's entries a parameter of one of the game data types picks its default from
*/
type GameData = Partial<Record<ParamType, readonly GameDataOption[]>>

const GAME_DATA_TYPES: ReadonlySet<ParamType> = new Set(['variable', 'switch', 'actor', 'item'])
const NUMERIC_ID_TYPES: ReadonlySet<ParamType> = new Set(['icon', 'map'])

type AddParameter = (param: PluginParameter) => void

function getParamNameError(name: string, paramNames: ParamNameMap, selfId: string): string | null {
  if (!name.trim()) return 'Name is required'
  // Allow section dividers (--- or ===)
  if (/^-{3,}$/.test(name) || /^={3,}$/.test(name)) return null
  if (!/^[a-z_$][\w$]*$/i.test(name)) {
    return 'Must be a valid identifier (letters, numbers, _, $)'
  }
  for (const [id, n] of paramNames) {
    if (id !== selfId && n === name) return 'Duplicate parameter name'
  }
  return null
}

const IMPORT_REFUSED: Record<Extract<ParamImportResult, { success: false }>['reason'], string> = {
  'not-json': 'This file could not be read: it is not valid JSON.',
  'not-mzparams': 'This file is not an MZ Plugin Studio parameter file.',
  'newer-version':
    'This file was made by a newer version of MZ Plugin Studio. Update the app to import it.'
}

type ImportSuccess = Extract<ParamImportResult, { success: true }>

const plural = (count: number, noun: string): string =>
  `${String(count)} ${noun}${count === 1 ? '' : 's'}`

function skippedItem({ name, index, reason }: ImportSuccess['skipped'][number]): string {
  const label = name === null ? `item ${String(index + 1)}` : `"${name}"`
  return `${label} (${reason === 'type' ? 'unknown type' : 'not a parameter'})`
}

/**
What an import left out of the file, or null when it loaded all of it.
*/
function importReport(result: ImportSuccess): string | null {
  const { parameters, skipped, dropped } = result
  if (skipped.length === 0 && dropped.length === 0) return null
  const parts = [`Imported ${plural(parameters.length, 'parameter')}.`]
  if (skipped.length > 0) {
    const items = skipped.map((item) => skippedItem(item))
    parts.push(`Skipped ${String(skipped.length)}: ${items.join(', ')}.`)
  }
  if (dropped.length > 0) {
    const items = dropped.map((d) => `"${d.param}" (${d.field})`)
    parts.push(
      `Dropped ${plural(dropped.length, 'field')} with the wrong type or an unknown name: ` +
        `${items.join(', ')}.`
    )
  }
  return parts.join(' ')
}

/**
A file dialog answers null when cancelled
*/
const isMissingPath = (path: string | null): path is null => path === null || path === ''

async function showError(title: string, message: string): Promise<void> {
  await globalThis.api.dialog.message({ type: 'error', title, message })
}

async function exportParams(params: PluginParameter[], pluginName: string): Promise<void> {
  const filePath = await globalThis.api.dialog.saveFile({
    defaultPath: `${pluginName}-params.mzparams`,
    filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
  })
  if (isMissingPath(filePath)) return
  try {
    const content = serializeParams(params, pluginName)
    await globalThis.api.plugin.saveToPath(filePath, content)
  } catch (error) {
    await showError('Export Failed', userMessage(error))
  }
}

async function importParamsFile(addParameter: AddParameter): Promise<void> {
  const filePath = await globalThis.api.dialog.openFile({
    filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
  })
  if (isMissingPath(filePath)) return
  try {
    const content = await globalThis.api.plugin.readByPath(filePath)
    const result = deserializeParams(content)
    if (!result.success) {
      await showError('Import Failed', IMPORT_REFUSED[result.reason])
      return
    }
    for (const p of result.parameters) {
      addParameter(p)
    }
    const report = importReport(result)
    if (report === null) return
    await globalThis.api.dialog.message({
      type: 'warning',
      title: 'Import Report',
      message: report
    })
  } catch (error) {
    await showError('Import Failed', `Could not read the file. ${userMessage(error)}`)
  }
}

/**
The parameters of a plugin file the user picks, or null when there are none to offer
*/
async function readPluginParams(): Promise<PluginParameter[] | null> {
  const filePath = await globalThis.api.dialog.openFile({
    filters: [{ name: 'JavaScript Plugin', extensions: ['js'] }]
  })
  if (isMissingPath(filePath)) return null
  try {
    const content = await globalThis.api.plugin.readByPath(filePath)
    const parsed = await globalThis.api.plugin.parse(content)
    if (parsed.parameters.length > 0) return parsed.parameters
    await globalThis.api.dialog.message({
      type: 'info',
      title: 'No Parameters',
      message: 'This plugin has no parameters to import.'
    })
  } catch (error) {
    await showError(
      'Import Failed',
      `Could not read or parse the plugin file. ${userMessage(error)}`
    )
  }
  return null
}

async function isBulkDeleteConfirmed(count: number): Promise<boolean> {
  const answer = await globalThis.api.dialog.message({
    type: 'question',
    title: 'Delete Parameters',
    message: `Delete ${String(count)} selected parameter${count > 1 ? 's' : ''}?`,
    buttons: ['Cancel', 'Delete']
  })
  return answer === 1
}

async function isOverwriteConfirmed(name: string): Promise<boolean> {
  const answer = await globalThis.api.dialog.message({
    type: 'question',
    title: 'Overwrite Preset',
    message: `A preset named "${name}" already exists. Overwrite it?`,
    buttons: ['Cancel', 'Overwrite']
  })
  return answer === 1
}

/**
The attributes that lock a control while the header is read-only
*/
function lockProps(isReadOnly: boolean): { disabled: boolean; title: string | undefined } {
  return { disabled: isReadOnly, title: isReadOnly ? RAW_MODE_HEADER_READ_ONLY_NOTICE : undefined }
}

const toggleIn = (ids: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(ids)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function useParamSelection(pluginId: string, parameters: PluginParameter[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // Another plugin (a different file, undo, redo) starts with nothing selected
  const [selectionPluginId, setSelectionPluginId] = useState(pluginId)
  if (selectionPluginId !== pluginId) {
    setSelectionPluginId(pluginId)
    setSelectedIds(new Set())
  }
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((previous) => toggleIn(previous, id))
  }, [])
  const selectAll = (): void => {
    setSelectedIds(
      selectedIds.size === parameters.length ? new Set() : new Set(parameters.map((p) => p.id))
    )
  }
  return { selectedIds, setSelectedIds, toggleSelect, selectAll }
}

function usePresetDialog(selectedParams: PluginParameter[]) {
  const parameterPresets = useSettingsStore((s) => s.parameterPresets)
  const savePreset = useSettingsStore((s) => s.savePreset)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const savingRef = useRef(false)
  // The dialog opens from a menu item that is gone once it closes, so focus moves by hand: into
  // the name field on open, back to the Presets menu button on close
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocusRef = useRef<HTMLButtonElement>(null)

  const start = (): void => {
    setName('')
    setOpen(true)
  }

  const confirm = async (): Promise<void> => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const trimmed = name.trim()
      if (!trimmed) return
      if (Object.hasOwn(parameterPresets, trimmed) && !(await isOverwriteConfirmed(trimmed))) return
      savePreset(trimmed, selectedParams)
      setOpen(false)
    } finally {
      savingRef.current = false
    }
  }

  return { open, setOpen, name, setName, start, confirm, inputRef, returnFocusRef }
}

function useImportPicker() {
  const addParameter = usePluginStore((s) => s.addParameter)
  const [open, setOpen] = useState(false)
  const [params, setParams] = useState<PluginParameter[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const start = async (): Promise<void> => {
    const found = await readPluginParams()
    if (found === null) return
    setParams(found)
    setSelected(new Set(found.map((p) => p.id)))
    setOpen(true)
  }

  const toggleAll = (): void => {
    setSelected(selected.size === params.length ? new Set() : new Set(params.map((p) => p.id)))
  }

  const confirm = (): void => {
    const toImport = params
      .filter((p) => selected.has(p.id))
      .map((p) => ({ ...p, id: crypto.randomUUID() }))
    for (const p of toImport) addParameter(p)
    setOpen(false)
    setParams([])
    setSelected(new Set())
  }

  const toggle = (id: string): void => {
    setSelected(toggleIn(selected, id))
  }

  return { open, setOpen, params, selected, start, toggle, toggleAll, confirm }
}

export function ParameterBuilder() {
  const parameters = usePluginStore((s) => s.plugin.parameters)
  const pluginId = usePluginStore((s) => s.plugin.id)
  const pluginName = usePluginStore((s) => s.plugin.meta.name)
  const addParameter = usePluginStore((s) => s.addParameter)
  const removeParameters = usePluginStore((s) => s.removeParameters)
  const isHeaderReadOnly = useIsHeaderReadOnly()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { selectedIds, setSelectedIds, toggleSelect, selectAll } = useParamSelection(
    pluginId,
    parameters
  )
  const selectedParams = useMemo(
    () => parameters.filter((p) => selectedIds.has(p.id)),
    [parameters, selectedIds]
  )
  const presetDialog = usePresetDialog(selectedParams)
  const importPicker = useImportPicker()

  const handleDuplicate = (): void => {
    const duped = duplicateParams(
      selectedParams,
      parameters.map((p) => p.name)
    )
    for (const p of duped) {
      addParameter(p)
    }
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async (): Promise<void> => {
    const ids = [...selectedIds]
    if (!(await isBulkDeleteConfirmed(ids.length))) return
    removeParameters(ids)
    setSelectedIds(new Set())
  }

  const handleAddParameter = (): void => {
    const param = createEmptyParameter()
    addParameter(param)
    setExpandedId(param.id)
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col border-b border-border">
        <ParamHeader readOnly={isHeaderReadOnly} onAdd={handleAddParameter} />

        {/* Toolbar - visible when parameters exist */}
        {parameters.length > 0 && (
          <ParamToolbar
            allSelected={selectedIds.size === parameters.length}
            hasSelection={selectedIds.size > 0}
            readOnly={isHeaderReadOnly}
            onSelectAll={selectAll}
            onDuplicate={handleDuplicate}
            onBulkDelete={handleBulkDelete}
            onExport={async () => exportParams(selectedParams, pluginName)}
            onImportFile={async () => importParamsFile(addParameter)}
            onImportPlugin={importPicker.start}
            onSavePreset={presetDialog.start}
            presetsButtonRef={presetDialog.returnFocusRef}
          />
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <ParamList
              parameters={parameters}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              toggleSelect={toggleSelect}
              readOnly={isHeaderReadOnly}
            />
          </div>
        </ScrollArea>
      </div>

      <PresetNameDialog dialog={presetDialog} count={selectedParams.length} />
      <ImportPickerDialog picker={importPicker} />
    </div>
  )
}

function ParamHeader({ readOnly, onAdd }: Readonly<{ readOnly: boolean; onAdd: () => void }>) {
  return (
    <fieldset {...lockProps(readOnly)} className="min-w-0">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Parameters</h2>
        <Button size="sm" data-testid="param-add" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add Parameter
        </Button>
      </div>
      {readOnly && (
        <p className="px-4 pb-2 text-sm text-muted-foreground">
          {RAW_MODE_HEADER_READ_ONLY_NOTICE}
        </p>
      )}
    </fieldset>
  )
}

interface ParamToolbarProps {
  allSelected: boolean
  hasSelection: boolean
  readOnly: boolean
  onSelectAll: () => void
  onDuplicate: () => void
  onBulkDelete: () => Promise<void>
  onExport: () => Promise<void>
  onImportFile: () => Promise<void>
  onImportPlugin: () => Promise<void>
  onSavePreset: () => void
  presetsButtonRef: React.RefObject<HTMLButtonElement | null>
}

function ParamToolbar({
  allSelected,
  hasSelection,
  readOnly,
  onSelectAll,
  onDuplicate,
  onBulkDelete,
  onExport,
  onImportFile,
  onImportPlugin,
  onSavePreset,
  presetsButtonRef
}: Readonly<ParamToolbarProps>) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-border px-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        className="text-xs text-muted-foreground"
      >
        <CheckSquare className="mr-1 h-3.5 w-3.5" />
        {allSelected ? 'Deselect' : 'Select All'}
      </Button>

      <div className="mx-1 h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onDuplicate}
        disabled={!hasSelection || readOnly}
        className="text-xs"
      >
        <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void onBulkDelete()
        }}
        disabled={!hasSelection || readOnly}
        className="text-xs text-destructive"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
      </Button>

      <div className="mx-1 h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void onExport()
        }}
        disabled={!hasSelection}
        className="text-xs"
      >
        <Download className="mr-1 h-3.5 w-3.5" /> Export
      </Button>

      <ImportMenu readOnly={readOnly} onImportFile={onImportFile} onImportPlugin={onImportPlugin} />
      <PresetsMenu
        hasSelection={hasSelection}
        readOnly={readOnly}
        onSavePreset={onSavePreset}
        buttonRef={presetsButtonRef}
      />
    </div>
  )
}

function ImportMenu({
  readOnly,
  onImportFile,
  onImportPlugin
}: Readonly<Pick<ParamToolbarProps, 'readOnly' | 'onImportFile' | 'onImportPlugin'>>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          disabled={readOnly}
          data-testid="param-menu"
        >
          <Upload className="mr-1 h-3.5 w-3.5" /> Import
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            void onImportFile()
          }}
          data-testid="param-import-file"
        >
          From File (.mzparams)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void onImportPlugin()
          }}
        >
          From Plugin (.js)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PresetsMenu({
  hasSelection,
  readOnly,
  onSavePreset,
  buttonRef
}: Readonly<{
  hasSelection: boolean
  readOnly: boolean
  onSavePreset: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
}>) {
  const parameterPresets = useSettingsStore((s) => s.parameterPresets)
  const addParameter = usePluginStore((s) => s.addParameter)
  const presets = Object.entries(parameterPresets)

  const applyPreset = (presetParams: PluginParameter[]): void => {
    for (const p of presetParams) {
      addParameter({ ...p, id: crypto.randomUUID() })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={buttonRef} variant="ghost" size="sm" className="text-xs">
          <Bookmark className="mr-1 h-3.5 w-3.5" /> Presets
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onSavePreset} disabled={!hasSelection}>
          Save Selection as Preset...
        </DropdownMenuItem>
        {presets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {presets.map(([name, params]) => (
              <DropdownMenuItem
                key={name}
                onClick={() => {
                  applyPreset(params)
                }}
                disabled={readOnly}
              >
                {name} ({params.length} params)
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PresetNameDialog({
  dialog,
  count
}: Readonly<{ dialog: ReturnType<typeof usePresetDialog>; count: number }>) {
  const { open, setOpen, name, setName, confirm, inputRef, returnFocusRef } = dialog
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('')
        setOpen(next)
      }}
    >
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Save Preset</DialogTitle>
          <DialogDescription>
            Enter a name for this parameter preset ({count} parameter
            {count === 1 ? '' : 's'})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="preset-name">Preset Name</Label>
          <Input
            ref={inputRef}
            id="preset-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            placeholder="My Preset"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              void confirm()
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              void confirm()
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImportPickerDialog({ picker }: Readonly<{ picker: ReturnType<typeof useImportPicker> }>) {
  const { open, setOpen, params, selected, toggle, toggleAll, confirm } = picker
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Parameters from Plugin</DialogTitle>
          <DialogDescription>Select parameters to import ({params.length} found)</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 pb-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={toggleAll}>
            {selected.size === params.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          <div className="space-y-1 pr-4">
            {params.map((param) => (
              <label
                key={param.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.has(param.id)}
                  onChange={() => {
                    toggle(param.id)
                  }}
                  className="h-4 w-4"
                />
                <span className="font-medium">{param.text || param.name}</span>
                <span className="text-muted-foreground">({param.type})</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={selected.size === 0} onClick={confirm}>
            Import {selected.size} Parameter
            {selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
A small stand-in for the card under the pointer while it is dragged
*/
function setMinimalDragImage(dataTransfer: DataTransfer): void {
  const dragImage = document.createElement('div')
  dragImage.style.cssText =
    'position:absolute;top:-1000px;width:200px;height:40px;background:#333;border-radius:8px;'
  document.body.append(dragImage)
  dataTransfer.setDragImage(dragImage, 100, 20)
  setTimeout(() => {
    dragImage.remove()
  }, 0)
}

function useParamDrag(isReadOnly: boolean) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const draggedIdRef = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const handleDragStart = useCallback(
    (event: React.DragEvent, id: string) => {
      if (isReadOnly) {
        event.preventDefault()
        return
      }
      setDraggedId(id)
      draggedIdRef.current = id
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
      setMinimalDragImage(event.dataTransfer)
    },
    [isReadOnly]
  )

  const handleDragEnd = useCallback(() => {
    draggedIdRef.current = null
    setDraggedId(null)
    setDropTargetId(null)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent, targetId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId((previous) => (previous === targetId ? previous : targetId))
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback((event: React.DragEvent, targetId: string) => {
    event.preventDefault()
    const currentDraggedId = draggedIdRef.current
    if (currentDraggedId === null || currentDraggedId === targetId) return
    const params = usePluginStore.getState().plugin.parameters
    const fromIndex = params.findIndex((p) => p.id === currentDraggedId)
    const toIndex = params.findIndex((p) => p.id === targetId)
    if (fromIndex !== -1 && toIndex !== -1) {
      usePluginStore.getState().reorderParameters(fromIndex, toIndex)
    }
    draggedIdRef.current = null
    setDraggedId(null)
    setDropTargetId(null)
  }, [])

  return {
    draggedId,
    dropTargetId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}

// The keyboard path to the reorder a drop performs: one place up (-1) or down (+1). The control
// that asked for the move gets focus back once the new order is rendered, since re-inserting a
// moved card's node drops its focus.
function useParamMove(parameters: PluginParameter[], isReadOnly: boolean) {
  const movedControlRef = useRef<HTMLElement | null>(null)
  const handleMove = useCallback(
    (id: string, offset: -1 | 1, control: HTMLElement) => {
      if (isReadOnly) return
      const params = usePluginStore.getState().plugin.parameters
      const fromIndex = params.findIndex((p) => p.id === id)
      const toIndex = fromIndex + offset
      if (fromIndex === -1 || toIndex < 0 || toIndex >= params.length) return
      movedControlRef.current = control
      usePluginStore.getState().reorderParameters(fromIndex, toIndex)
    },
    [isReadOnly]
  )
  useLayoutEffect(() => {
    movedControlRef.current?.focus()
    movedControlRef.current = null
  }, [parameters])
  return handleMove
}

interface ParamListProps {
  parameters: PluginParameter[]
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  selectedIds: ReadonlySet<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleSelect: (id: string) => void
  readOnly: boolean
}

function ParamList({
  parameters,
  expandedId,
  selectedIds,
  readOnly,
  ...rowCallbacks
}: Readonly<ParamListProps>) {
  const structs = usePluginStore((s) => s.plugin.structs)
  const updateParameter = usePluginStore((s) => s.updateParameter)
  const removeParameter = usePluginStore((s) => s.removeParameter)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)
  const switches = useProjectStore((s) => s.switches)
  const variables = useProjectStore((s) => s.variables)
  const actors = useProjectStore((s) => s.actors)
  const items = useProjectStore((s) => s.items)

  const structNames = useMemo(() => structs.map((s) => s.name), [structs])
  // Lightweight map for duplicate name checking — stable ref when names don't change (R3-03)
  const paramNameMap: ParamNameMap = useMemo(
    () => new Map(parameters.map((p) => [p.id, p.name])),
    [parameters]
  )
  const gameData: GameData = useMemo(
    () => ({ variable: variables, switch: switches, actor: actors, item: items }),
    [variables, switches, actors, items]
  )
  const drag = useParamDrag(readOnly)
  const handleMove = useParamMove(parameters, readOnly)

  if (parameters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p>No parameters defined</p>
        <p className="text-sm">Click &quot;Add Parameter&quot; to create one</p>
      </div>
    )
  }
  return (
    <div role="list" aria-label="Parameters" className="space-y-2">
      {parameters.map((param) => (
        <ParamRow
          key={param.id}
          param={param}
          isExpanded={expandedId === param.id}
          isSelected={selectedIds.has(param.id)}
          readOnly={readOnly}
          isDragging={drag.draggedId === param.id}
          isDropTarget={drag.dropTargetId === param.id}
          anyDragging={drag.draggedId !== null}
          {...rowCallbacks}
          updateParameter={updateParameter}
          removeParameter={removeParameter}
          setCustomCode={setCustomCode}
          handleDragStart={drag.handleDragStart}
          onDragEnd={drag.handleDragEnd}
          handleDragOver={drag.handleDragOver}
          onDragLeave={drag.handleDragLeave}
          handleDrop={drag.handleDrop}
          handleMove={handleMove}
          structNames={structNames}
          structs={structs}
          paramNameMap={paramNameMap}
          gameData={gameData}
        />
      ))}
    </div>
  )
}

/**
Whether an edit changes what the parameter's comment in the custom code says
*/
const doesRenameComment = (before: PluginParameter, updates: Partial<PluginParameter>): boolean =>
  (updates.name !== undefined && updates.name !== before.name) ||
  (updates.type !== undefined && updates.type !== before.type)

function useParamUpdate(
  paramId: string,
  updateParameter: (id: string, updates: Partial<PluginParameter>) => void,
  setCustomCode: (code: string) => void
) {
  return useCallback(
    (updates: Partial<PluginParameter>) => {
      // The stored parameter before this edit names the comment to replace
      const before = usePluginStore.getState().plugin.parameters.find((p) => p.id === paramId)
      updateParameter(paramId, updates)
      if (before === undefined || !doesRenameComment(before, updates)) return
      const current = usePluginStore.getState().plugin.customCode ?? ''
      const oldComment = generateParameterComment(before)
      const newComment = generateParameterComment({ ...before, ...updates })
      // A function inserts the name literally: a string would expand $' $` $& in it
      const updated = current.replace(oldComment, () => newComment)
      if (updated !== current) {
        setCustomCode(updated)
      }
    },
    [paramId, updateParameter, setCustomCode]
  )
}

interface ParamRowProps extends Pick<
  ParameterCardProps,
  | 'param'
  | 'isSelected'
  | 'readOnly'
  | 'isDragging'
  | 'isDropTarget'
  | 'onDragEnd'
  | 'onDragLeave'
  | 'structNames'
  | 'structs'
  | 'paramNameMap'
  | 'gameData'
> {
  isExpanded: boolean
  anyDragging: boolean
  toggleSelect: (id: string) => void
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  updateParameter: (id: string, updates: Partial<PluginParameter>) => void
  removeParameter: (id: string) => void
  setCustomCode: (code: string) => void
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  handleDragStart: (event: React.DragEvent, id: string) => void
  handleDragOver: (event: React.DragEvent, id: string) => void
  handleDrop: (event: React.DragEvent, id: string) => void
  handleMove: (id: string, offset: -1 | 1, control: HTMLElement) => void
}

/**
Thin wrapper that binds param.id into stable callbacks for ParameterCard memo
*/
const ParamRow = memo(function ParamRow({
  param,
  isExpanded,
  anyDragging,
  toggleSelect,
  setExpandedId,
  updateParameter,
  removeParameter,
  setCustomCode,
  setSelectedIds,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleMove,
  ...cardProps
}: Readonly<ParamRowProps>) {
  const onUpdate = useParamUpdate(param.id, updateParameter, setCustomCode)

  const onDelete = useCallback(() => {
    removeParameter(param.id)
    setSelectedIds((previous) => {
      if (!previous.has(param.id)) return previous
      const next = new Set(previous)
      next.delete(param.id)
      return next
    })
  }, [param.id, removeParameter, setSelectedIds])

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      handleDragStart(event, param.id)
    },
    [param.id, handleDragStart]
  )
  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      handleDragOver(event, param.id)
    },
    [param.id, handleDragOver]
  )
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      handleDrop(event, param.id)
    },
    [param.id, handleDrop]
  )
  const onMove = useCallback(
    (offset: -1 | 1, control: HTMLElement) => {
      handleMove(param.id, offset, control)
    },
    [param.id, handleMove]
  )
  const onToggleSelect = useCallback(() => {
    toggleSelect(param.id)
  }, [param.id, toggleSelect])
  const onToggle = useCallback(() => {
    setExpandedId((previous) => (previous === param.id ? null : param.id))
  }, [param.id, setExpandedId])

  return (
    <motion.div role="listitem" layout={anyDragging} transition={paramCardSpring}>
      <ParameterCard
        param={param}
        expanded={isExpanded}
        onToggleSelect={onToggleSelect}
        onToggle={onToggle}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMove={onMove}
        {...cardProps}
      />
    </motion.div>
  )
})

interface ParameterCardProps {
  param: PluginParameter
  expanded: boolean
  isSelected: boolean
  /**
  Locks the row's fields; its checkbox stays outside the lock so the row can still be selected
  */
  readOnly: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onUpdate: (updates: Partial<PluginParameter>) => void
  onDelete: () => void
  onDragStart: (event: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (event: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (event: React.DragEvent) => void
  /**
  Moves the card one place up (-1) or down (+1); `control` gets focus back after the move
  */
  onMove: (offset: -1 | 1, control: HTMLElement) => void
  isDragging: boolean
  isDropTarget: boolean
  structNames: string[]
  structs: PluginStruct[]
  paramNameMap: ParamNameMap
  gameData: GameData
}

const isFilled = (value: string | undefined): boolean => value !== undefined && value !== ''

/**
Whether a parameter holds a value only the details section shows, so the section starts open
*/
function hasAdvancedValues(param: PluginParameter): boolean {
  if (isFilled(param.desc)) return true
  if (param.type === 'boolean') return isFilled(param.onLabel) || isFilled(param.offLabel)
  if (param.type === 'number') {
    return param.min !== undefined || param.max !== undefined || param.decimals !== undefined
  }
  if (param.type === 'file' || param.type === 'animation') {
    return isFilled(param.dir) || param.require === true
  }
  return false
}

const ParameterCard = memo(function ParameterCard({
  param,
  expanded,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  ...rest
}: Readonly<ParameterCardProps>) {
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvancedValues(param))
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card transition-all',
        isDragging && 'opacity-60 shadow-lg scale-[1.02] z-10 ring-2 ring-primary/50',
        isDropTarget && !isDragging && 'border-primary border-dashed bg-primary/5'
      )}
      // The list item around the card carries its role; dragging is the mouse path to the
      // reorder the move control below offers the keyboard
      role="presentation"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ParamCardHeader param={param} expanded={expanded} {...rest} />

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <ParamCardBody
              param={param}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => {
                setShowAdvanced(!showAdvanced)
              }}
              {...rest}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

function ParamCardHeader({
  param,
  expanded,
  isSelected,
  readOnly,
  onToggleSelect,
  onToggle,
  onDelete,
  onMove
}: Readonly<
  Pick<
    ParameterCardProps,
    | 'param'
    | 'expanded'
    | 'isSelected'
    | 'readOnly'
    | 'onToggleSelect'
    | 'onToggle'
    | 'onDelete'
    | 'onMove'
  >
>) {
  return (
    // Header: the expand button's ::after covers the whole row, so a click anywhere on it
    // toggles the card; the checkbox, the grip and the delete button sit above that layer
    <div className="relative flex cursor-pointer items-center gap-2 p-3">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(event) => {
          event.stopPropagation()
          onToggleSelect()
        }}
        onClick={(event) => {
          event.stopPropagation()
        }}
        className="relative z-10 h-4 w-4 rounded border-muted-foreground"
      />
      <MoveGrip param={param} readOnly={readOnly} onToggle={onToggle} onMove={onMove} />
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={param.text || param.name}
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 text-left after:absolute after:inset-0"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1">
          <span className="font-medium">{param.text || param.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">({param.type})</span>
          {param.type === 'hidden' && (
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              hidden in MZ
            </span>
          )}
        </span>
      </button>
      <fieldset {...lockProps(readOnly)} className="relative z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </fieldset>
    </div>
  )
}

/**
The grip drags the card; from the keyboard, Alt+ArrowUp/Down move it one place
*/
function MoveGrip({
  param,
  readOnly,
  onToggle,
  onMove
}: Readonly<Pick<ParameterCardProps, 'param' | 'readOnly' | 'onToggle' | 'onMove'>>) {
  return (
    <button
      type="button"
      aria-label={`Move ${param.text || param.name}`}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
      aria-disabled={readOnly}
      onClick={(event) => {
        // A mouse click (detail > 0) opens the card like the rest of the row; Enter and
        // Space on the move control do not
        if (event.detail > 0) onToggle()
      }}
      onKeyDown={(event) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
        event.preventDefault()
        onMove(event.key === 'ArrowUp' ? -1 : 1, event.currentTarget)
      }}
      className="relative z-10 flex cursor-grab"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
    </button>
  )
}

type CardFieldProps = Readonly<Pick<ParameterCardProps, 'param' | 'onUpdate'>>

function ParamCardBody({
  param,
  readOnly,
  onUpdate,
  structNames,
  structs,
  paramNameMap,
  gameData,
  showAdvanced,
  onToggleAdvanced
}: Readonly<
  Pick<
    ParameterCardProps,
    'param' | 'readOnly' | 'onUpdate' | 'structNames' | 'structs' | 'paramNameMap' | 'gameData'
  > & { showAdvanced: boolean; onToggleAdvanced: () => void }
>) {
  return (
    <fieldset {...lockProps(readOnly)} className="min-w-0 border-t border-border p-4 space-y-4">
      {/* Essential: Internal Name + Display Label */}
      <ParamNameFields param={param} onUpdate={onUpdate} paramNameMap={paramNameMap} />

      {/* Essential: Type + Default Value */}
      <div className="grid grid-cols-2 gap-4">
        <ParamTypeSelect param={param} onUpdate={onUpdate} />
        {param.type !== 'struct' && (
          <div className="space-y-2">
            <Label>Default Value</Label>
            <ParamDefaultInput param={param} onUpdate={onUpdate} gameData={gameData} />
          </div>
        )}
      </div>

      {/* Essential: options, struct or array element type */}
      <TypeFields
        param={param}
        onUpdate={onUpdate}
        structNames={structNames}
        structDefaults={structs}
      />

      {/* Advanced fields toggle */}
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {showAdvanced ? 'Hide details' : 'Show details'}
        {isFilled(param.desc) && !showAdvanced && (
          <span className="text-muted-foreground/60">— has description</span>
        )}
      </button>

      {/* Advanced fields */}
      {showAdvanced && <ParamAdvancedFields param={param} onUpdate={onUpdate} />}
    </fieldset>
  )
}

function ParamNameFields({
  param,
  onUpdate,
  paramNameMap
}: CardFieldProps & Readonly<{ paramNameMap: ParamNameMap }>) {
  const nameError = getParamNameError(param.name, paramNameMap, param.id)
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Internal Name</Label>
        <Input
          value={param.name}
          onChange={(event) => {
            onUpdate({ name: event.target.value })
          }}
          placeholder="paramName"
          className={nameError === null ? '' : 'border-destructive'}
        />
        {nameError !== null && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
      <div className="space-y-2">
        <Label>Display Label</Label>
        <Input
          value={param.text}
          onChange={(event) => {
            onUpdate({ text: event.target.value })
          }}
          placeholder="Parameter Label"
        />
      </div>
    </div>
  )
}

function ParamTypeSelect({ param, onUpdate }: CardFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Type</Label>
      <Select
        value={param.type}
        onValueChange={(value: ParamType) => {
          onUpdate({ type: value })
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PARAM_TYPE_GROUPS.map((group) => (
            <div key={group.group}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.group}
              </div>
              {group.types.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-baseline gap-2">
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ParamDefaultInput({
  param,
  onUpdate,
  gameData
}: CardFieldProps & Readonly<{ gameData: GameData }>) {
  if (NUMERIC_ID_TYPES.has(param.type)) {
    return (
      <Input
        type="number"
        value={String(param.default)}
        onChange={(event) => {
          onUpdate({ default: Number(event.target.value) })
        }}
        placeholder={param.type === 'icon' ? 'Icon index' : 'Map ID'}
        min={0}
      />
    )
  }
  if (GAME_DATA_TYPES.has(param.type)) {
    return (
      <GameDataDefault param={param} onUpdate={onUpdate} options={gameData[param.type] ?? []} />
    )
  }
  if (param.type === 'boolean') {
    return (
      <div className="flex items-center h-10">
        <Switch
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
      value={defaultText(param.default)}
      onChange={(event) => {
        const value = param.type === 'number' ? Number(event.target.value) : event.target.value
        onUpdate({ default: value })
      }}
      type={param.type === 'number' ? 'number' : 'text'}
      placeholder="Default value"
    />
  )
}

function GameDataDefault({
  param,
  onUpdate,
  options
}: CardFieldProps & Readonly<{ options: readonly GameDataOption[] }>) {
  if (options.length === 0) {
    return (
      <Input
        // Controlled like the default input it replaces in place
        value=""
        readOnly
        disabled
        placeholder="Load project first"
        className="text-muted-foreground"
      />
    )
  }
  return (
    <Select
      value={String(param.default)}
      onValueChange={(value) => {
        onUpdate({ default: Number(value) })
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={`Select ${param.type}...`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">None (0)</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={String(opt.id)}>
            {opt.id}: {opt.name || `(unnamed ${param.type})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
An emptied number field clears its value
*/
function ParamAdvancedFields({ param, onUpdate }: CardFieldProps) {
  return (
    <>
      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={param.desc}
          onChange={(event) => {
            onUpdate({ desc: event.target.value })
          }}
          placeholder="Help text for this parameter"
        />
      </div>

      {/* Boolean-specific fields: @on/@off labels */}
      {param.type === 'boolean' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>On Label</Label>
            <Input
              value={param.onLabel ?? ''}
              onChange={(event) => {
                onUpdate({ onLabel: event.target.value || undefined })
              }}
              placeholder="ON"
            />
          </div>
          <div className="space-y-2">
            <Label>Off Label</Label>
            <Input
              value={param.offLabel ?? ''}
              onChange={(event) => {
                onUpdate({ offLabel: event.target.value || undefined })
              }}
              placeholder="OFF"
            />
          </div>
        </div>
      )}

      {/* Number-specific fields */}
      {param.type === 'number' && <NumberLimitFields param={param} onUpdate={onUpdate} />}

      {/* File/Animation directory */}
      {(param.type === 'file' || param.type === 'animation') && (
        <div className="space-y-2">
          <Label>Directory (relative to project)</Label>
          <Input
            value={param.dir ?? ''}
            onChange={(event) => {
              onUpdate({ dir: event.target.value })
            }}
            placeholder={param.type === 'animation' ? 'img/animations' : 'img/pictures'}
          />
        </div>
      )}
    </>
  )
}

function NumberLimitFields({ param, onUpdate }: CardFieldProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Min</Label>
        <Input
          type="number"
          value={param.min ?? ''}
          onChange={(event) => {
            onUpdate({ min: toLimit(event.target.value) })
          }}
          placeholder="No min"
        />
      </div>
      <div className="space-y-2">
        <Label>Max</Label>
        <Input
          type="number"
          value={param.max ?? ''}
          onChange={(event) => {
            onUpdate({ max: toLimit(event.target.value) })
          }}
          placeholder="No max"
        />
      </div>
      <div className="space-y-2">
        <Label>Decimals</Label>
        <Input
          type="number"
          value={param.decimals ?? ''}
          onChange={(event) => {
            onUpdate({ decimals: toLimit(event.target.value) })
          }}
          placeholder="0"
          min={0}
        />
      </div>
    </div>
  )
}
