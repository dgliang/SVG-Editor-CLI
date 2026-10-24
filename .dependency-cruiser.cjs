/**
 * 依赖方向检查（对应 docs/design.md §8 的模块依赖矩阵）。
 * 允许的方向：
 *   model    ← 所有模块（model 自身无依赖，除标准库无外部包）
 *   shapes   ← app, index
 *   commands ← app, cli, index
 *   io       ← app, index
 *   view     ← cli, index
 *   app      ← cli, index
 * index.ts 是组合根，豁免全部规则。
 */
const SRC = '^src/';
const APP_ROOT = '^src/index\\.ts$';

function forbid(fromModule, toModules) {
  return {
    name: `${fromModule}-must-not-depend-on-${toModules.join('-')}`,
    severity: 'error',
    from: { path: `${SRC}${fromModule}/`, pathNot: APP_ROOT },
    to: { path: `${SRC}(${toModules.join('|')})/` },
  };
}

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        '运行时不允许循环依赖。Shape↔Group 的唯一回路来自 Shape.parent 的 type-only 引用（编译后擦除），作为已知例外豁免',
      from: { pathNot: '^src/model/(Shape|Group)\\.ts$' },
      to: { circular: true },
    },
    {
      name: 'model-no-npm-deps',
      severity: 'error',
      comment: 'model 是领域核心，不依赖第三方运行时包',
      from: { path: `${SRC}model/` },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'] },
    },
    forbid('model', ['shapes', 'commands', 'io', 'view', 'app', 'cli']),
    forbid('shapes', ['commands', 'io', 'view', 'app', 'cli']),
    forbid('commands', ['shapes', 'io', 'view', 'app', 'cli']),
    forbid('io', ['shapes', 'commands', 'view', 'app', 'cli']),
    forbid('view', ['shapes', 'commands', 'io', 'app', 'cli']),
    forbid('app', ['view', 'cli']),
    forbid('cli', ['io', 'shapes']),
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
