# Narro

Narro 是一个个人科技信息阅读工具：先把“获取并阅读科技信息”做成每天愿意打开的基础产品，再逐步扩展更复杂的信息工作台能力。

当前状态：Narro 当前主路径是“获取并阅读科技信息”。首页会刷新固定默认科技源，把最新文章作为第一屏主要内容展示；用户可以直接阅读标题、摘要、来源、发布时间并打开原文。生成今日科技简报仍然可用，但属于基于已获取文章的可选增强；未配置模型时会使用本地 fallback 简报。OpenAI-compatible 模型设置收在“AI 设置”中，不是首次使用前提。

## 核心方向

- 当前首页主体验是“获取最新信息并阅读源文章”。
- 默认科技源保持固定、小而稳定，不追求源数量。
- 原始文章列表是基础产品能力，摘要和 AI 简报是增强能力。
- 摘要必须能回链到原文，引用编号要稳定。
- 模型不可用时也要能刷新文章、阅读文章、生成本地简报。
- Lens、源管理、Agent 侧栏、事件组、OPML 等功能暂时不作为首页主功能。

## 技术路线

- pnpm 11 + Node.js 24+。
- Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4。
- Next.js Route Handlers / Server Actions 作为内置后端。
- Source Adapter 架构统一 RSS/Atom、官方 API 和后续认证型连接器。
- SQLite / libSQL + Drizzle 作为后续真实数据层的优先方向。
- OpenAI-compatible LLM adapter。
- 本地优先；部署和运维不是当前阶段重点。

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
2. 点击“获取最新信息”，Narro 会刷新默认科技源并显示最新文章。
3. 在“最新文章”中阅读标题、摘要、来源和发布时间，按需打开原文。
4. 对已读或噪声文章使用“已读”和“隐藏”。
5. 需要摘要时点击“生成今日科技简报”；没有模型配置也会生成本地 fallback 简报。
6. 需要 AI 简报时展开“AI 设置”，填写 OpenAI-compatible `Base URL`、`Model` 和 `API Key`。

## 当前下一步

下一阶段只补基础功能产品能力：

- 显示每个默认科技源的刷新结果和失败原因。
- 提升 LLM prompt 与本地 fallback 摘要质量。
- 继续打磨源文章阅读、复制简报、标记已读、隐藏噪声文章等阅读动作。
- 明确首次使用、无文章、本地简报、AI 简报、刷新失败等状态。

暂不处理部署、数据库迁移、多用户、后台定时任务、Source Directory、Lens 编辑器、事件组 UI、语义搜索或聊天问答。

重置本地数据库：

```powershell
pnpm db:reset
```

数据源策略见 [docs/data-sources.md](docs/data-sources.md)，已验证免费源清单见 [docs/validated-free-sources.md](docs/validated-free-sources.md)。

## 环境变量

- `NARRO_DB_URL`：可选，默认写入本地 `data/narro.db`。
- `NARRO_REFRESH_SECRET`：可选，设置后 `/api/refresh` 需要同名 query/header secret。
- `NARRO_LLM_API_KEY`：可选，未在“AI 设置”填写 API Key 时作为模型调用密钥。
