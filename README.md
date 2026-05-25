# Narro

Narro 是一个个人信息中枢：先做成每天愿意打开看的实时信息流，再逐步升级成能总结、追踪、解释、生成简报的 agent 型情报工作台。

当前状态：P0-P1-P2 MVP 闭环已进入可运行状态。首页从本地 SQLite/libSQL 数据库读取 Source、Item、Lens 和 AgentTask；支持已验证免费 RSS/Atom 源、Hacker News 官方 API、手动并发刷新、单源刷新、Source 启停、自定义 RSS、基础去重、Lens 过滤、信息状态视图、详情视图、规则排序、本地 AgentTask 输出持久化和 OpenAI-compatible LLM adapter。不接网页爬虫、付费源或绕过登录限制的数据源。

## 核心方向

- 首页主体验是实时信息流。
- Lens/视角用于从同一批信息中切出不同垂直领域。
- Agent 能力放在右侧任务栏，作为信息流的增强层。
- MVP 面向个人使用，不做多用户 SaaS。
- 第一批真实信息源从 RSS/Atom 和官方公开 API 开始，不做网页爬虫。

## 技术路线

- pnpm 11 + Node.js 24+。
- Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4。
- Next.js Route Handlers / Server Actions 作为内置后端。
- Source Adapter 架构统一 RSS/Atom、官方 API 和后续认证型连接器。
- SQLite / libSQL + Drizzle 作为后续真实数据层的优先方向。
- OpenAI-compatible LLM adapter。
- 本地优先，后续支持 Docker / 私有 VPS。

## 文档

- 设计文档：[docs/superpowers/specs/2026-05-24-narro-design.md](docs/superpowers/specs/2026-05-24-narro-design.md)
- `/goal` 交接说明：[docs/goal-handoff.md](docs/goal-handoff.md)
- 首页参考设计：[docs/mockups/narro-home-reference.html](docs/mockups/narro-home-reference.html)

## 本地运行

```powershell
corepack enable
pnpm install
pnpm dev
```

指定本地端口：

```powershell
pnpm dev --port 3001
```

常用验证命令：

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## MVP 使用方式

1. 打开 `http://localhost:3001`。
2. 首次进入会自动创建 `data/narro.db` 并写入已验证免费源和默认 Lens。
3. 点击顶部“刷新”，系统会并发读取前 8 个已启用 RSS/Atom 源、标准化、去重并入库。
4. 左侧可切换 Lens、启停 Source、单源刷新，也可以添加自定义 RSS。
5. 信息卡片支持收藏、待读、隐藏、打开详情和打开原文。
6. 右侧 Agent 任务支持生成今日简报、解释选中信息、创建追踪和发现新源，并把输出写入本地数据库。

重置本地数据库：

```powershell
pnpm db:reset
```

数据源策略见 [docs/data-sources.md](docs/data-sources.md)，已验证免费源清单见 [docs/validated-free-sources.md](docs/validated-free-sources.md)。

## 环境变量

- `NARRO_DB_URL`：可选，默认写入本地 `data/narro.db`。
- `NARRO_REFRESH_SECRET`：可选，设置后 `/api/refresh` 需要同名 query/header secret。
- `NARRO_LLM_API_KEY`：可选，配置右侧 OpenAI-compatible 模型连接时使用。
