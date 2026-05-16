# Skills

## Location Strategy
- **`skills/<name>/`** — 规范源（canonical），在此编辑
- **`.claude/skills/<name>/`** — 部署目标，OpenCode + Claude Code 自动发现

## Available

| Skill | Description |
|-------|-------------|
| fast-agent-test-env-monitoring | 测试环境 + Playwright 错误监控 + Bug 记录修复 |

## Standard Structure

```
skills/<name>/
├── SKILL.md                        # skill 文档（必需）
├── scripts/                        # 辅助脚本
├── templates/                      # 文件/代码模板
├── reference/                      # 参考资料
└── examples/                       # 示例代码
```

## Adding a Skill

```bash
mkdir -p skills/<name>/{scripts,templates,reference,examples}
# create skills/<name>/SKILL.md with frontmatter:
# ---
# name: <name-with-prefix>
# description: Use when <triggering conditions>
# ---
```

## Deploy After Changes

```bash
cp -r skills/<name> .claude/skills/<name>
```
