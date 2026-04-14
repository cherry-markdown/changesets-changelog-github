# @cherry-markdown/changesets-changelog-github

Changesets changelog 插件，自动在 CHANGELOG 中关联 GitHub **PR**、**commit** 和 **用户** 信息。

## 安装

```bash
pnpm add -D @cherry-markdown/changesets-changelog-github
```

## 使用

在 `.changeset/config.json` 中配置：

```json
{
  "changelog": [
    "@cherry-markdown/changesets-changelog-github",
    { "repo": "org/repo" }
  ]
}
```

然后正常运行 `changeset version` 即可，CHANGELOG 会自动带上 GitHub 链接。

## 输出示例

```markdown
## 1.2.0

### Minor Changes

- 新增暗色主题支持 (#42 by @user)

### Patch Changes

- Updated dependencies [#40]:
  - @scope/dep-a@1.1.0
```

## GitHub Token

获取 PR/commit 信息需要 GitHub API 访问权限。设置环境变量：

```bash
export GITHUB_TOKEN=ghp_xxxxx
```

或在项目根目录创建 `.env` 文件：

```env
GITHUB_TOKEN=ghp_xxxxx
```

## License

MIT
