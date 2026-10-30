// The command tab keeps each command's skeleton in the plugin code in step with the command's name.
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { generateCommandSkeleton } from '../../src/renderer/src/lib/generator'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyCommand, createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

beforeEach(resetStores)

describe('command skeleton', () => {
  it.each(["Show$'", 'Show$`', 'Show$&', "It's", 'A\\B'])(
    'renaming a command to %s changes only its skeleton in the plugin code',
    (name) => {
      const cmd = { ...createEmptyCommand(), name: 'Show' }
      const rest = '\n\nfunction tick() { return 1; }\n'
      usePluginStore.getState().openPlugin({
        ...createEmptyPlugin(),
        commands: [cmd],
        customCode: generateCommandSkeleton(cmd) + rest
      })
      render(<CommandBuilder />)
      fireEvent.click(screen.getByText(cmd.text))
      fireEvent.change(screen.getByDisplayValue('Show'), { target: { value: name } })
      expect(usePluginStore.getState().plugin.customCode).toBe(
        generateCommandSkeleton({ ...cmd, name }) + rest
      )
    }
  )
})
