// ============================================================
// Conventional Commit Type → 子标题映射
// ============================================================

export const TYPE_HEADING: Record<string, string> = {
  feat: '#### 🚀 Features',
  fix: '#### 🐛 Bug Fixes',
  perf: '#### ⚡ Performance',
  refactor: '#### ♻️ Code Refactoring',
  docs: '#### 📝 Documentation',
  style: '#### 💄 Styles',
  test: '#### ✅ Tests',
  build: '#### 📦 Build',
  ci: '#### 👷 CI',
  chore: '#### 🔧 Chores',
  revert: '#### ⏪ Reverts',
}

/** conventional type 的排序权重（越小越靠前） */
export const TYPE_ORDER: Record<string, number> = {
  feat: 0,
  fix: 1,
  perf: 2,
  refactor: 3,
  docs: 4,
  style: 5,
  test: 6,
  build: 7,
  ci: 8,
  chore: 9,
  revert: 10,
}

export const OTHER_TYPE = '__other__'
export const OTHER_HEADING = '#### 📋 Other Changes'
export const OTHER_ORDER = 99

// ============================================================
// Conventional Commit 解析
// ============================================================

/**
 * 从 summary 中解析 conventional commit type
 *
 * 支持: `feat: xxx`, `feat(scope): xxx`, `feat!: xxx`
 */
export function parseConventionalType(summary: string): [string, string] {
  const match = summary.match(/^(\w+)(?:\([^)]*\))?!?\s*:\s*(.+)/)
  if (!match) return [OTHER_TYPE, summary]

  const type = match[1].toLowerCase()
  const cleanSummary = match[2].trim()

  return type in TYPE_HEADING ? [type, cleanSummary] : [OTHER_TYPE, summary]
}
