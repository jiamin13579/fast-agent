# Development Workflow

## Core Process

```
需求 → 需求分析 → 设计拆解 → 计划制定 → 实现 → 验证 → 完成
          ↓           ↓          ↓         ↓       ↓
        brainstorming writing-plans writing-plans  执行   verification
```

## 技能规范

所有需求实现必须使用 `superpowers` 系列技能：

| 阶段 | 技能 |
|------|------|
| 创意/需求讨论 | `superpowers:brainstorming` |
| 需求分析 | `superpowers:writing-plans` |
| 计划制定 | `superpowers:writing-plans` |
| 实现执行 | `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` |
| 代码审查 | `superpowers:requesting-code-review` |
| 接收反馈 | `superpowers:receiving-code-review` |
| 验证完成 | `superpowers:verification-before-completion` |

---

## Rules

### 工作原则

1. **禁止** 收到需求后直接写代码，务必先设计分析
2. **禁止** 不明确边界和验收标准就实施
3. **禁止** 在用户确认前完成实现
4. **禁止** 实现时绕过安全检查（如 SQL 注入、XSS）
5. **必须** 使用 superpowers 技能进行规范流程
6. **必须** 每阶段获得用户确认后才能进入下一阶段
7. **必须** 主动识别需求中的边界条件和异常场景

### 设计规范

8. **必须** 明确接口契约（输入、输出、错误码）
9. **必须** 识别与其他模块的依赖关系
10. **必须** 考虑并发、事务、一致性等工程问题
11. **必须** 记录技术债务并在适当时机偿还
12. **必须** 对核心逻辑编写单元测试
13. **必须** 设计文档写完后自审 —— 逐项检查：内部一致性（各章节是否矛盾）、占位符（无 TBD/TODO）、边界条件覆盖、与既有代码/后端实现对齐

### 代码质量

14. **必须** 保持单一职责，一个函数只做一件事
15. **必须** 变量/函数命名具有描述性，见名知意
16. **必须** 关键逻辑添加必要注释（WHY，非 WHAT）
17. **必须** 遵循现有代码风格和架构模式
18. **必须** 确保修改后不影响现有功能（回归测试）
19. **必须** 验证编译/运行无错误后才能提交
20. **必须** 不提交敏感信息（密码、Token、密钥等）
21. **必须** 移除调试代码（console.log、print 等）

### Git 规范

22. **禁止** 使用 `git push --force`
23. **禁止** 直接 commit 到 main/master 分支
24. **禁止** commit 包含未完成的代码或被注释的代码
25. **推荐** 使用 feature branch 工作流
26. **推荐** 频繁小提交，每个 commit 功能独立
27. **推荐** commit message 使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式
28. **必须** commit 前检查 `git diff`，确认变更内容正确

### 沟通规范

29. **必须** 在用户打断时立即停止当前工作并响应
30. **必须** 遇到问题及时升级，不要隐藏或搁置问题
31. **必须** 主动告知用户进度和阻塞情况
32. **必须** 验证结果必须附带证据（截图、日志、命令输出）
33. **必须** 对不确定性诚实，不编造未验证的结论

### 内存/持久化规范

34. **必须** 重要上下文记录到 MEMORY.md
35. **必须** 用户明确要求时才保存记忆
36. **禁止** 保存代码模式、架构等可从代码库推导的信息
37. **禁止** 保存临时状态或会话内临时信息

### 安全规范

38. **必须** 所有用户输入必须校验和过滤
39. **必须** 敏感操作需要权限校验
40. **必须** 日志不记录敏感数据
41. **必须** API 响应不暴露内部实现细节

---

## 流程详情

### 1. 需求分析 (Analysis)

**使用技能**: `superpowers:brainstorming`

**输入**: 用户需求描述

**产出**: 需求分析文档

**要点**:
- 理解需求的业务背景和目标
- 明确功能边界和约束条件
- 识别技术难点和潜在风险
- 分析与其他模块的关联影响

### 2. 设计拆解 (Design)

**使用技能**: `superpowers:writing-plans`

**输入**: 需求分析文档

**产出**: 技术设计文档

**要点**:
- 架构设计（如果涉及新模块或重构）
- 接口设计（API 定义、数据结构）
- 任务拆解（可独立测试的任务单元）
- 识别需要处理的边界情况和异常

### 3. 计划制定 (Plan)

**使用技能**: `superpowers:writing-plans`

**输入**: 技术设计文档

**产出**: 实施计划

**要点**:
- 按依赖关系排序任务
- 识别关键路径和里程碑
- 评估每个任务的验收标准
- 准备风险预案

### 4. 实现 (Implementation)

**使用技能**:
- `superpowers:subagent-driven-development` (推荐 - 多任务并行)
- `superpowers:executing-plans` (单会话顺序执行)

**输入**: 实施计划

**产出**: 代码实现

**要点**:
- 按计划执行，不擅自变更设计
- 每完成一个任务，验证其正确性
- 遇到设计问题及时回溯和调整
- 保持代码质量，不为速度牺牲质量

### 5. 验证 (Verification)

**使用技能**: `superpowers:verification-before-completion`

**输入**: 实现完成的代码

**产出**: 验证报告

**要点**:
- 功能验证（按验收标准逐项检查）
- 回归测试（确保不破坏现有功能）
- 边界条件测试
- 安全性检查

---

## 浏览器自动化测试

使用 `playwright-cli` 进行浏览器自动化测试。

### 常用命令

```bash
# 打开浏览器
playwright-cli open http://localhost:3000

# 页面快照（查看当前状态和元素引用）
playwright-cli snapshot

# 点击元素
playwright-cli click e15

# 输入文本
playwright-cli fill e10 "text"

# 检查控制台日志
playwright-cli console

# 重新加载页面
playwright-cli reload

# 关闭浏览器
playwright-cli close
```

### 测试流程

1. 启动后端服务：`mvn spring-boot:run`（端口 8080/8081）
2. 启动前端服务：`npm run dev`（端口 3000）
3. 使用 playwright-cli 连接浏览器进行交互测试
4. 检查 console 日志确认 SocketIO 连接状态

### 测试检查点

- [ ] SocketIO 连接成功（无 WebSocket 错误）
- [ ] 用户登录功能正常
- [ ] 消息发送/接收正常
- [ ] Room 隔离正常（不同会话不互相干扰）

---

## 测试账号

| 账号 | 密码 | 说明 |
|------|------|------|
| admin@fast.com | 123456 | 管理员账号 |

---

## 成功标准检查

在宣布任务完成前，必须确认：

- [ ] 代码已编译/构建通过
- [ ] 单元测试已通过
- [ ] 现有功能未被破坏
- [ ] 用户可验证的功能已测试
- [ ] 变更内容已告知用户
- [ ] 无敏感信息泄露
- [ ] 用户已确认结果