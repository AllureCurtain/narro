# Narro `/goal` 交接说明

## 使用方式

先进入项目目录：

```powershell
cd D:\Study\project\agent\narro
```

然后使用 `/goal`。第一轮建议只做 M0，不要一次性做完整 MVP。

## 推荐第一条 `/goal`

```text
/goal 阅读 docs/superpowers/specs/2026-05-24-narro-design.md、docs/goal-handoff.md 和 docs/mockups/narro-home-reference.html，然后只执行 M0：创建 Narro 的 Next.js + TypeScript 产品骨架，用 mock 数据实现首页工作台。不要实现真实数据源、数据库、LLM 或登录。完成后启动本地 dev server，并运行可用的验证命令。
```

## M0 目标

做出 Narro 的第一版可运行产品骨架。

必须包含：

- Next.js + React + TypeScript 项目。
- 首页不是落地页，而是实际工作台。
- 首页设计参考 `docs/mockups/narro-home-reference.html`，信息结构要一致，但不要求像素级复刻。
- 顶部栏：搜索/提问入口、刷新状态、全局操作。
- 左侧栏：信息源、源分组、Lens/视角。
- 中间区：今日摘要、实时信息流、事件组或趋势提示。
- 右侧栏：agent 任务，例如生成今日简报、解释选中信息、创建追踪、发现新源。
- Mock 数据：sources、lenses、items、agentTasks。
- TypeScript domain types：Source、Item、Lens、EventGroup、AgentTask。
- 基础响应式布局，桌面端优先，移动端不能明显错乱。

不要做：

- RSS/Atom 或官方 API 真实接入。
- SQLite / libSQL / Drizzle。
- LLM 调用。
- 登录注册。
- 设置页。
- 后台 worker。
- 网页爬虫。

## M0 验收标准

完成后应满足：

- `pnpm dev` 或等价命令能启动。
- 浏览器打开后能看到 Narro 的真实工作台界面。
- 信息流是主视觉中心。
- Lens 看起来是可切换的工作上下文，不只是普通分类。
- 右侧 agent 任务栏存在，但不压过信息流。
- UI 使用真实感 mock 内容，不是 lorem ipsum。
- 代码结构清晰，组件不要全部堆在一个文件里。
- 能运行项目当前可用的验证命令，例如 typecheck、lint、build 或测试。

## M1 的下一条 `/goal`

M0 完成并确认后，再开 M1：

```text
/goal 基于当前 Narro 项目、docs/superpowers/specs/2026-05-24-narro-design.md 和 docs/data-sources.md，执行 M1：接入 Drizzle + SQLite/libSQL，实现 Source 和 Item 数据模型，支持 Source Adapter、RSS/Atom 信息源、官方公开 API adapter 骨架、手动刷新、基础去重并在首页展示真实入库信息。不要实现网页爬虫、LLM、今日简报、事件组或多用户系统。完成后运行验证命令并说明如何本地测试。
```

## 后续里程碑

- M2：Lens 创建、编辑、删除，以及基于源分组和关键词过滤信息流。
- M3：OpenAI-compatible LLM adapter、单条摘要、今日简报、AgentTask 结果存储。
- M4：相似内容去重增强、事件组、相关来源展示。
- M5：基于 Lens 的持续监控、重要变化高亮、信息源推荐。

## 执行约束

- 每个 `/goal` 只做一个里程碑。
- 优先保持产品可运行。
- 不要跳过验证。
- 不要把 UI、数据接入、数据库、LLM 写进一个大文件。
- 新增复杂能力前先补测试或至少补可重复验证方式。
- 遇到设计冲突时，以 `docs/superpowers/specs/2026-05-24-narro-design.md` 为准。
