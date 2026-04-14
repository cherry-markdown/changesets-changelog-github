import { describe, it, expect } from 'vitest'
import { parseConventionalType, TYPE_ORDER, OTHER_TYPE } from './conventional'

describe('parseConventionalType', () => {
  it('解析 feat:', () => {
    const [type, summary] = parseConventionalType('feat: 新增暗色主题')
    expect(type).toBe('feat')
    expect(summary).toBe('新增暗色主题')
  })

  it('解析 feat(scope):', () => {
    const [type, summary] = parseConventionalType('feat(theme): 新增暗色主题')
    expect(type).toBe('feat')
    expect(summary).toBe('新增暗色主题')
  })

  it('解析 feat!:', () => {
    const [type, summary] = parseConventionalType('feat!: 破坏性变更')
    expect(type).toBe('feat')
    expect(summary).toBe('破坏性变更')
  })

  it('解析 fix:', () => {
    const [type, summary] = parseConventionalType('fix: 修复样式问题')
    expect(type).toBe('fix')
    expect(summary).toBe('修复样式问题')
  })

  it('解析 refactor:', () => {
    const [type, summary] = parseConventionalType('refactor: 重构核心模块')
    expect(type).toBe('refactor')
    expect(summary).toBe('重构核心模块')
  })

  it('无 conventional 前缀时返回 OTHER_TYPE', () => {
    const [type, summary] = parseConventionalType('普通的变更描述')
    expect(type).toBe(OTHER_TYPE)
    expect(summary).toBe('普通的变更描述')
  })

  it('未知 type 前缀时返回 OTHER_TYPE', () => {
    const [type, summary] = parseConventionalType('wobble: 未知类型')
    expect(type).toBe(OTHER_TYPE)
    expect(summary).toBe('wobble: 未知类型')
  })
})

describe('TYPE_ORDER', () => {
  it('feat 排在 fix 前面', () => {
    expect(TYPE_ORDER.feat).toBeLessThan(TYPE_ORDER.fix)
  })

  it('fix 排在 refactor 前面', () => {
    expect(TYPE_ORDER.fix).toBeLessThan(TYPE_ORDER.refactor)
  })

  it('所有已知 type 都有排序权重', () => {
    const knownTypes = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert']
    for (const t of knownTypes) {
      expect(TYPE_ORDER[t]).toBeDefined()
    }
  })
})
