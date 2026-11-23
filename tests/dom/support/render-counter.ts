// Counts the components React renders, through the hook React's developer tools use. React reads
// the hook once, when `react-dom` loads, so a test imports this module before anything that loads
// `react-dom`; installed later, the hook sees no commit and every count stays 0.
import { vi } from 'vitest'

// The parts of a React fiber the count reads
interface Fiber {
  readonly tag: number
  readonly flags: number
  readonly type: unknown
  readonly child: Fiber | null
  readonly sibling: Fiber | null
  readonly alternate: Fiber | null
}

interface FiberRoot {
  readonly current: Fiber
}

export interface RenderCount {
  readonly total: number
  readonly byName: ReadonlyMap<string, number>
}

// Function, forwardRef and memo components
const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15])
// The fiber flag React sets on a component that rendered in this commit
const PERFORMED_WORK = 1

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null

// The component a forwardRef or memo wrapper holds
function innerOf(wrapper: object): unknown {
  if ('render' in wrapper) return wrapper.render
  if ('type' in wrapper) return wrapper.type
  return undefined
}

function nameOf(type: unknown): string {
  let component = type
  while (isObject(component)) component = innerOf(component)
  if (typeof component !== 'function') return '?'
  return 'displayName' in component && typeof component.displayName === 'string'
    ? component.displayName
    : component.name
}

// The renders counted so far, while a count runs
const counting: { byName: Map<string, number> | undefined } = { byName: undefined }

// Visits the fibers of a commit as the developer tools do: a subtree whose child did not change
// was not rendered again
function countFibers(parent: Fiber, byName: Map<string, number>): void {
  for (let child = parent.child; child !== null; child = child.sibling) {
    const previous = child.alternate
    if (
      COMPONENT_TAGS.has(child.tag) &&
      (previous === null || (child.flags & PERFORMED_WORK) === PERFORMED_WORK)
    ) {
      const name = nameOf(child.type)
      byName.set(name, (byName.get(name) ?? 0) + 1)
    }
    if (previous?.child !== child.child) countFibers(child, byName)
  }
}

vi.stubGlobal('__REACT_DEVTOOLS_GLOBAL_HOOK__', {
  isDisabled: false,
  supportsFiber: true,
  renderers: new Map<number, unknown>(),
  // The id of the one renderer the tests load
  inject: (): number => 1,
  onCommitFiberRoot(_rendererId: number, root: FiberRoot): void {
    if (counting.byName !== undefined) countFibers(root.current, counting.byName)
  },
  onCommitFiberUnmount(): void {
    // unmounts are not counted
  },
  onPostCommitFiberRoot(): void {
    // nothing to do after a commit
  }
})

/**
Counts the components rendered in the commits `action` causes, by component name.
*/
export async function countRenders(action: () => Promise<void>): Promise<RenderCount> {
  const byName = new Map<string, number>()
  counting.byName = byName
  try {
    await action()
  } finally {
    counting.byName = undefined
  }
  let total = 0
  for (const count of byName.values()) total += count
  return { total, byName }
}
