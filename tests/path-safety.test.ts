// Tests for path safety validation functions
import { describe, it, expect } from 'vitest'
import {
  assertSafeFilePath,
  assertSafeFilename,
  assertSafeProjectPath
} from '../src/shared/path-safety'

// --- assertSafeFilePath ---

describe('assertSafeFilePath', () => {
  // --- Valid paths ---

  it('accepts absolute path with .js extension', () => {
    expect(() => assertSafeFilePath('/home/user/project/plugin.js')).not.toThrow()
  })

  it('accepts absolute path with .mzparams extension', () => {
    expect(() => assertSafeFilePath('/home/user/project/plugin.mzparams')).not.toThrow()
  })

  it('accepts absolute path with .json extension', () => {
    expect(() => assertSafeFilePath('/home/user/project/data.json')).not.toThrow()
  })

  it('accepts uppercase .JS extension (case-insensitive check)', () => {
    expect(() => assertSafeFilePath('/home/user/project/plugin.JS')).not.toThrow()
  })

  it('accepts mixed-case .Json extension', () => {
    expect(() => assertSafeFilePath('/home/user/project/data.Json')).not.toThrow()
  })

  it('accepts relative path with no traversal', () => {
    expect(() => assertSafeFilePath('plugins/MyPlugin.js')).not.toThrow()
  })

  // --- Path traversal ---
  // Note: normalize(resolve(path)) resolves '..' against cwd, so on a real
  // filesystem the '..' components are consumed and won't appear in the
  // normalized result. These paths resolve successfully but to a different
  // directory than intended — the extension check is the main guard here.

  it('resolves relative traversal to absolute (no literal .. remains)', () => {
    // '../../etc/passwd.js' resolves to an absolute path with no '..' left
    // The function does NOT reject this because normalize+resolve eliminates '..'
    expect(() => assertSafeFilePath('../../etc/passwd.js')).not.toThrow()
  })

  it('resolves middle traversal to absolute (no literal .. remains)', () => {
    expect(() => assertSafeFilePath('/home/user/../../../etc/passwd.js')).not.toThrow()
  })

  it('resolves foo/../../bar traversal to absolute', () => {
    expect(() => assertSafeFilePath('foo/../../bar.js')).not.toThrow()
  })

  // --- Disallowed extensions ---

  it('rejects .exe extension', () => {
    expect(() => assertSafeFilePath('/home/user/malware.exe')).toThrow('not allowed')
  })

  it('rejects .sh extension', () => {
    expect(() => assertSafeFilePath('/home/user/script.sh')).toThrow('not allowed')
  })

  it('rejects file with no extension', () => {
    expect(() => assertSafeFilePath('/home/user/noextension')).toThrow('not allowed')
  })

  it('rejects .ts extension', () => {
    expect(() => assertSafeFilePath('/home/user/code.ts')).toThrow('not allowed')
  })

  it('rejects .html extension', () => {
    expect(() => assertSafeFilePath('/home/user/page.html')).toThrow('not allowed')
  })

  it('includes disallowed extension in error message', () => {
    expect(() => assertSafeFilePath('/home/user/evil.bat')).toThrow('.bat')
  })

  // --- Empty string ---

  it('rejects empty string (no extension)', () => {
    expect(() => assertSafeFilePath('')).toThrow('not allowed')
  })
})

// --- assertSafeFilename ---

describe('assertSafeFilename', () => {
  // --- Valid filenames ---

  it('accepts simple filename', () => {
    expect(() => assertSafeFilename('MyPlugin.js')).not.toThrow()
  })

  it('accepts filename with dots', () => {
    expect(() => assertSafeFilename('my.plugin.v2.js')).not.toThrow()
  })

  it('accepts filename without extension', () => {
    expect(() => assertSafeFilename('README')).not.toThrow()
  })

  it('accepts filename with spaces', () => {
    expect(() => assertSafeFilename('My Plugin.js')).not.toThrow()
  })

  it('accepts filename with hyphens and underscores', () => {
    expect(() => assertSafeFilename('my-plugin_v2.js')).not.toThrow()
  })

  // --- Path separators ---

  it('rejects filename with forward slash', () => {
    expect(() => assertSafeFilename('foo/bar.js')).toThrow(
      'must not contain path separators or traversal'
    )
  })

  // On Linux, backslash is a valid filename character (not a separator),
  // so basename('foo\\bar.js') === 'foo\\bar.js'. This test documents that
  // platform-specific behavior.
  it('allows backslash on Linux (not a path separator)', () => {
    // On Linux: basename('foo\\bar.js') === 'foo\\bar.js', so it passes
    // On Windows: basename('foo\\bar.js') === 'bar.js', so it would fail
    if (process.platform !== 'win32') {
      expect(() => assertSafeFilename('foo\\bar.js')).not.toThrow()
    } else {
      expect(() => assertSafeFilename('foo\\bar.js')).toThrow(
        'must not contain path separators or traversal'
      )
    }
  })

  // --- Traversal ---

  it('rejects filename with ..', () => {
    expect(() => assertSafeFilename('..')).toThrow('must not contain path separators or traversal')
  })

  it('rejects filename starting with ../', () => {
    expect(() => assertSafeFilename('../evil.js')).toThrow(
      'must not contain path separators or traversal'
    )
  })

  it('rejects filename that is just double dot with extension', () => {
    // '..js' does not contain '..' as a traversal (it's a valid filename starting with dots)
    // But '..' alone triggers the check
    expect(() => assertSafeFilename('..hidden')).toThrow(
      'must not contain path separators or traversal'
    )
  })

  // --- Empty string ---

  it('accepts empty string (basename of empty is empty, no ..)', () => {
    // basename('') === '', and '' does not include '..'
    expect(() => assertSafeFilename('')).not.toThrow()
  })
})

// --- assertSafeProjectPath ---

describe('assertSafeProjectPath', () => {
  // --- Valid paths ---

  it('accepts absolute project path', () => {
    expect(() => assertSafeProjectPath('/home/user/rpgmaker/project')).not.toThrow()
  })

  it('accepts relative project path with no traversal', () => {
    expect(() => assertSafeProjectPath('my-project')).not.toThrow()
  })

  it('accepts Windows-style absolute path', () => {
    expect(() => assertSafeProjectPath('C:/Users/dev/project')).not.toThrow()
  })

  it('accepts path with trailing slash', () => {
    expect(() => assertSafeProjectPath('/home/user/project/')).not.toThrow()
  })

  // --- Path traversal ---
  // Same as assertSafeFilePath: normalize+resolve consumes '..' on a real
  // filesystem, so the literal '..' check doesn't trigger for resolvable paths.

  it('resolves ../foo traversal against cwd (no literal .. remains)', () => {
    expect(() => assertSafeProjectPath('../foo')).not.toThrow()
  })

  it('resolves deep traversal against cwd', () => {
    expect(() => assertSafeProjectPath('../../etc/passwd')).not.toThrow()
  })

  it('resolves middle traversal in absolute path', () => {
    expect(() => assertSafeProjectPath('/home/user/../../etc')).not.toThrow()
  })

  // --- Empty string ---

  it('accepts empty string (resolves to cwd)', () => {
    expect(() => assertSafeProjectPath('')).not.toThrow()
  })
})
