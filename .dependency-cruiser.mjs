// Module boundaries between the Electron processes, the shared code and the tooling trees.
export default {
  forbidden: [
    {
      // A cycle closed only by a type import is erased at build time and never runs.
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } }
    },
    {
      name: 'renderer-not-to-main',
      severity: 'error',
      from: { path: '^src/renderer/' },
      to: { path: '^src/main/' }
    },
    {
      name: 'renderer-not-to-preload',
      severity: 'error',
      from: { path: '^src/renderer/' },
      to: { path: '^src/preload/' }
    },
    {
      name: 'main-not-to-renderer',
      severity: 'error',
      from: { path: '^src/main/' },
      to: { path: '^src/renderer/' }
    },
    {
      name: 'main-not-to-preload',
      severity: 'error',
      from: { path: '^src/main/' },
      to: { path: '^src/preload/' }
    },
    {
      name: 'shared-is-leaf',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(main|renderer|preload)/' }
    },
    {
      name: 'preload-not-to-renderer-or-main',
      severity: 'error',
      from: { path: '^src/preload/' },
      to: { path: '^src/(renderer|main)/' }
    },
    {
      name: 'src-not-to-tests-tools-scripts-e2e',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^(tests|tools|scripts|e2e)/' }
    },
    {
      name: 'no-orphans',
      severity: 'error',
      from: { orphan: true, pathNot: String.raw`\.d\.ts$` },
      to: {}
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true }
    },
    {
      name: 'no-undeclared-package',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] }
    }
  ],
  options: {
    // The data allow-list: fixtures, goldens and screenshots are read as data, never as modules.
    exclude: { path: ['^tests/fixtures/', '^tests/golden/__golden__/', '^e2e/__screenshots__/'] },
    doNotFollow: { path: ['node_modules'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.test.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings']
    }
  }
}
