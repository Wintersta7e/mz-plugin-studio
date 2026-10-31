// The harness's own guarantees: a native dialog nobody answered fails the test, queued answers
// are given as the test asked, and an app holding unsaved work still shuts down in time.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertDialogsDrained,
  type AppWindow,
  dialogCalls,
  expect,
  queueDialog,
  runRoot,
  teardown,
  TEARDOWN_BOUND_MS,
  test
} from '../fixtures/app'

const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

test('fails a dialog call on an empty queue, naming the method', async ({ twin }) => {
  const { app, page } = twin
  const call = page.evaluate(() =>
    (window as unknown as AppWindow).api.dialog.message({ message: 'unanswered' })
  )
  await expect(call).rejects.toThrow('e2e dialog stub: empty queue for showMessageBox')
  await expect(assertDialogsDrained(app)).rejects.toThrow('showMessageBox')
  // Each failure is reported once
  await assertDialogsDrained(app)
})

test('answers message boxes from their queue as asked', async ({ twin }) => {
  const { app, page } = twin
  const written = join(runRoot(), 'written-before-answer.txt')
  const buttons = ['Discard', 'Cancel']
  await queueDialog(app, 'showMessageBox', 'cancel', { path: written, content: 'changed on disk' })
  await queueDialog(app, 'showMessageBox', 'confirm')
  await queueDialog(app, 'showMessageBox', 0)

  const answers = await page.evaluate(
    async (options) => [
      await (window as unknown as AppWindow).api.dialog.message(options),
      await (window as unknown as AppWindow).api.dialog.message(options),
      await (window as unknown as AppWindow).api.dialog.message(options)
    ],
    { message: 'queued', buttons }
  )
  expect(answers).toEqual([1, 0, 0])
  expect(readFileSync(written, 'utf8')).toBe('changed on disk')
  const calls = await dialogCalls(app)
  expect(calls.map(({ method }) => method)).toEqual([
    'showMessageBox',
    'showMessageBox',
    'showMessageBox'
  ])
  expect(calls[0]?.options).toMatchObject({ message: 'queued', buttons, cancelId: 1 })
})

test('tears down an app with unsaved work within the bound', async ({ twin }) => {
  const { app, page } = twin
  await page.keyboard.press('Control+n')
  await page.getByTestId('meta-name').fill('UnsavedWork')

  // The unsaved plugin holds back the window's close: main asks, and the cancel answer keeps it
  await queueDialog(app, 'showMessageBoxSync', 'cancel')
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) window.close()
  })
  await expect
    .poll(async () => (await dialogCalls(app)).map(({ method }) => method))
    .toEqual(['showMessageBoxSync'])
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  await expect(page.getByTestId('meta-name')).toHaveValue('UnsavedWork')

  const { pid } = app.process()
  if (pid === undefined) throw new Error('the app process has no pid')
  const started = Date.now()
  await teardown(app)
  expect(Date.now() - started).toBeLessThan(TEARDOWN_BOUND_MS)
  expect(isRunning(pid)).toBe(false)
})
