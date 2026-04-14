import { getInfo } from '@changesets/get-github-info'
import getReleasePlan from '@changesets/get-release-plan'
import type { ChangelogFunctions, NewChangesetWithCommit, VersionType } from '@changesets/types'
import 'dotenv/config'
import {
  parseConventionalType,
  TYPE_HEADING,
  TYPE_ORDER,
  OTHER_TYPE,
  OTHER_HEADING,
  OTHER_ORDER,
} from './conventional'

// ============================================================
// GitHub 信息工具
// ============================================================

async function getGitHubLinks(
  repo: string,
  commit: string | undefined,
): Promise<{ user: string | null; pull: string | null; commit: string | null }> {
  if (!commit) return { user: null, pull: null, commit: null }

  try {
    const { links } = await getInfo({ repo, commit })
    return links
  } catch {
    return { user: null, pull: null, commit: null }
  }
}

function buildSuffix(links: { user: string | null; pull: string | null; commit: string | null }): string {
  const parts: string[] = []

  if (links.pull) parts.push(links.pull)
  else if (links.commit) parts.push(links.commit)

  if (links.user) parts.push(`by ${links.user}`)

  return parts.length > 0 ? ` (${parts.join(' ')})` : ''
}

// ============================================================
// 预计算缓存
// ============================================================

/**
 * 缓存结构：changesetId → 预计算好的 markdown 字符串
 *
 * 在 getReleaseLine 首次被调用时：
 * 1. 调用 getReleasePlan() 获取所有 changesets
 * 2. 按包 + versionType + conventionalType 分组排序
 * 3. 为每条 changeset 预计算最终输出（含子标题）
 * 4. 存入缓存
 *
 * 后续调用直接从缓存取。
 */
let cache: Map<string, string> | null = null
let cachePromise: Promise<void> | null = null

interface ChangesetEntry {
  id: string
  conventionalType: string
  cleanSummary: string
  commit: string | undefined
  remainingLines: string[]
}

/**
 * 初始化缓存：读取完整 release plan，按类型分组排序，预计算每条的输出
 */
async function initCache(repo: string): Promise<void> {
  const cwd = process.cwd()
  const plan = await getReleasePlan(cwd)
  const result = new Map<string, string>()

  for (const release of plan.releases) {
    if (release.type === 'none') continue

    // 收集该包的所有 changesets，并解析 conventional type
    const entries: ChangesetEntry[] = []

    for (const cs of plan.changesets) {
      const rel = cs.releases.find((r) => r.name === release.name)
      if (!rel || rel.type === 'none') continue

      const [firstLine, ...remainingLines] = cs.summary.split('\n').map((l) => l.trimEnd())
      const [conventionalType, cleanSummary] = parseConventionalType(firstLine)

      entries.push({
        id: cs.id,
        conventionalType,
        cleanSummary,
        commit: (cs as NewChangesetWithCommit).commit,
        remainingLines,
      })
    }

    // 按 conventional type 排序
    entries.sort((a, b) => {
      const orderA = TYPE_ORDER[a.conventionalType] ?? OTHER_ORDER
      const orderB = TYPE_ORDER[b.conventionalType] ?? OTHER_ORDER
      return orderA - orderB
    })

    // 预计算每条的输出，同类型第一条带子标题
    let lastType = ''

    for (const entry of entries) {
      const links = await getGitHubLinks(repo, entry.commit)
      const suffix = buildSuffix(links)

      let line = ''

      // 类型变化时插入子标题
      if (entry.conventionalType !== lastType) {
        const heading = entry.conventionalType === OTHER_TYPE
          ? OTHER_HEADING
          : TYPE_HEADING[entry.conventionalType]
        line += `\n\n${heading}\n`
        lastType = entry.conventionalType
      }

      line += `\n- ${entry.cleanSummary}${suffix}`

      if (entry.remainingLines.length > 0) {
        line += `\n${entry.remainingLines.map((l) => `  ${l}`).join('\n')}`
      }

      // 用 changesetId + packageName 作为 key（同一个 changeset 可能影响多个包）
      const key = `${release.name}::${entry.id}`
      result.set(key, line)
    }
  }

  cache = result
}

/**
 * 确保缓存已初始化（多次调用只执行一次）
 */
function ensureCache(repo: string): Promise<void> {
  if (cache) return Promise.resolve()
  if (!cachePromise) {
    cachePromise = initCache(repo)
  }
  return cachePromise
}

// ============================================================
// 校验
// ============================================================

function getRepo(options: Record<string, any> | null): string {
  const repo = options?.repo as string | undefined

  if (!repo) {
    throw new Error(
      '请提供 "repo" 选项，例如:\n'
      + '"changelog": ["@cherry-markdown/changesets-changelog-github", { "repo": "org/repo" }]',
    )
  }

  return repo
}

// ============================================================
// ChangelogFunctions 实现
// ============================================================

/**
 * 从 changeset 的 releases 中，找到与当前 type 匹配的包名
 *
 * changesets 框架调用 getReleaseLine 时，传入的 type 参数表示当前包的 release type。
 * 利用这个信息，可以从 changeset.releases 中定位到当前包。
 */
function findPackageNameByType(changeset: NewChangesetWithCommit, type: VersionType): string | null {
  // 可能有多个包都是同一个 type，取第一个
  const match = changeset.releases.find((r) => r.type === type)
  return match?.name ?? null
}

/**
 * `getReleaseLine` — changesets 为每个 changeset 条目调用此函数
 *
 * 首次调用时通过 `@changesets/get-release-plan` 获取完整 release plan，
 * 按 conventional commit type 分组排序后预计算所有结果。
 *
 * 最终输出效果（在框架的 `### Minor Changes` 下）：
 *
 * ```markdown
 * #### 🚀 Features
 *
 * - 新增暗色主题 (#42 by @user)
 * - 支持自定义快捷键 (#43 by @user)
 *
 * #### ♻️ Code Refactoring
 *
 * - 重构核心模块 (#44 by @user)
 * ```
 */
const getReleaseLine: ChangelogFunctions['getReleaseLine'] = async (changeset, type, options) => {
  const repo = getRepo(options)

  // 确保缓存已初始化
  await ensureCache(repo)

  // 精确查找：packageName::changesetId
  if (cache) {
    const packageName = findPackageNameByType(changeset, type)
    if (packageName) {
      const exactKey = `${packageName}::${changeset.id}`
      const cached = cache.get(exactKey)
      if (cached) return cached
    }

    // fallback: 遍历查找 changesetId
    for (const [key, value] of cache) {
      if (key.endsWith(`::${changeset.id}`)) {
        return value
      }
    }
  }

  // 兜底：缓存未命中时，用基础格式输出
  const [firstLine, ...remainingLines] = changeset.summary.split('\n').map((l) => l.trimEnd())
  const [, cleanSummary] = parseConventionalType(firstLine)
  const links = await getGitHubLinks(repo, changeset.commit)
  const suffix = buildSuffix(links)

  let line = `\n\n- ${cleanSummary}${suffix}`

  if (remainingLines.length > 0) {
    line += `\n${remainingLines.map((l) => `  ${l}`).join('\n')}`
  }

  return line
}

/**
 * `getDependencyReleaseLine` — changesets 为依赖更新调用此函数
 */
const getDependencyReleaseLine: ChangelogFunctions['getDependencyReleaseLine'] = async (
  changesets,
  dependenciesUpdated,
  options,
) => {
  if (dependenciesUpdated.length === 0) return ''

  const repo = (options?.repo as string) || ''

  const changesetLinks: string[] = []

  if (repo) {
    for (const cs of changesets) {
      if (!cs.commit) continue
      const links = await getGitHubLinks(repo, cs.commit)
      const link = links.pull ?? links.commit
      if (link) changesetLinks.push(link)
    }
  }

  const updatedList = dependenciesUpdated.map(
    (dep) => `  - ${dep.name}@${dep.newVersion}`,
  )

  const header = changesetLinks.length > 0
    ? `- Updated dependencies [${changesetLinks.join(', ')}]:`
    : `- Updated dependencies:`

  return ['\n', header, ...updatedList].join('\n')
}

/**
 * @cherry-markdown/changesets-changelog-github
 *
 * Changesets changelog 插件：
 * - 自动关联 GitHub PR、commit 和用户信息
 * - 通过 `@changesets/get-release-plan` 获取完整 release plan
 * - 按 conventional commit type 分组排序，输出带子标题的结构化 changelog
 *
 * @example
 * ```json
 * // .changeset/config.json
 * {
 *   "changelog": ["@cherry-markdown/changesets-changelog-github", { "repo": "org/repo" }]
 * }
 * ```
 *
 * changeset summary 使用 conventional commit 格式：
 * ```
 * feat: 新增暗色主题
 * fix: 修复样式问题
 * refactor: 重构核心模块
 * ```
 *
 * 生成效果（在框架的 ### Minor Changes 下）：
 * ```markdown
 * #### 🚀 Features
 * - 新增暗色主题 (#42 by @user)
 *
 * #### ♻️ Code Refactoring
 * - 重构核心模块 (#44 by @user)
 * ```
 */
const changelogFunctions: ChangelogFunctions = {
  getReleaseLine,
  getDependencyReleaseLine,
}

export default changelogFunctions
