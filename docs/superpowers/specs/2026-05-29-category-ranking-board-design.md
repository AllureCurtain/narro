# Narro Category Ranking Board Design

## Context

Narro 当前首页已经从旧的 Lens/Agent 工作台收窄为“获取并阅读科技信息”，并保留可选的今日科技简报。用户希望第一版视觉和信息结构更接近 TopHub 的热榜聚合页：先按大类看到多个榜单，再逐步扩展。

本设计只实现 TopHub 风格的信息组织，不接入 TopHub 数据，不复制网页抓取方式。Narro 继续使用当前已验证的 RSS/Atom/API adapter、本地数据库、刷新动作、阅读动作和可选简报能力。

## Product Goal

把首页主体验改成“大分类科技热榜”：

1. 用户点击 `获取最新信息` 刷新默认科技源。
2. 首页按 5 个大分类展示榜单。
3. 每个分类展示 Top 10 条文章。
4. 用户可以快速扫标题、来源、时间、摘要，并打开原文、标记已读、隐藏噪声。
5. 今日科技简报和 AI 设置继续保留，但作为榜单墙之后的增强工具。

## Non-Goals

- 不新增 Source Directory、Lens 编辑器或 OPML UI。
- 不恢复旧的 Source/Lens 侧栏、Agent 侧栏、事件组、高级筛选。
- 不做后台定时任务、多用户、部署或数据库迁移。
- 不做复杂推荐、语义搜索、聊天问答或跨站真实热度计算。
- 不使用 TopHub 作为数据来源。

## Categories

第一版固定 5 个科技主线分类：

| ID | 标题 | 用途 |
| --- | --- | --- |
| `ai-models` | `AI / 模型` | 模型厂商、AI 工具、本地模型、agent/coding/model 相关内容 |
| `developer-community` | `开发者社区` | Hacker News、Lobsters 等开发者社区讨论 |
| `engineering-open-source` | `工程 / 开源` | 框架、运行时、开源工程、基础设施、工程实践 |
| `product-platform` | `产品 / 平台` | changelog、平台能力、API、产品更新 |
| `chinese-tech` | `中文技术` | 中文技术媒体、团队博客、中文科技内容 |

分类优先级用于避免同一文章重复出现：

1. 中文技术
2. 开发者社区
3. AI / 模型
4. 产品 / 平台
5. 工程 / 开源

## Data Model

新增轻量分组 helper，不改数据库 schema。建议文件：`lib/rankings/category-board.ts`。

```ts
export interface CategoryBoard {
  categories: CategoryRanking[];
  totalItemCount: number;
  updatedSourceCount: number;
}

export interface CategoryRanking {
  description: string;
  id: "ai-models" | "developer-community" | "engineering-open-source" | "product-platform" | "chinese-tech";
  items: RankedCategoryItem[];
  title: string;
}

export interface RankedCategoryItem {
  item: Item;
  rank: number;
  source: Source;
}
```

输入来自当前页面已经加载的 `items` 和 `sources`。helper 负责：

- 过滤 hidden item。
- 找到 item 对应 source。
- 按分类优先级把每条 item 放入一个主分类。
- 每个分类按轻量热度排序。
- 每个分类最多返回 10 条。

排序规则：

```text
importanceScore desc
publishedAt desc
title asc
```

分类信号：

- `AI / 模型`：source 为 Hugging Face、Google AI、AWS ML、Ollama，或标题/摘要/tag/entity 包含 `ai`、`model`、`agent`、`llm`、`coding`。
- `开发者社区`：source 为 Hacker News、Lobsters，或 source group 为 `社区讨论`。
- `工程 / 开源`：React、Next.js、Node.js、TypeScript、Cloudflare、GitHub Engineering、framework/runtime/open-source/infrastructure 相关内容。
- `产品 / 平台`：GitHub Changelog、Vercel、Stripe、changelog、platform、api、product 相关内容。
- `中文技术`：阮一峰、InfoQ 中文、美团技术、Solidot、少数派，或 source group/tag/language 指向中文技术内容。

## Page Layout

`NarroWorkspace` 继续保留 `TopBar`，主体从当前文章流优先改为榜单墙优先。

页面主结构：

1. `TopBar`
   - 品牌
   - 搜索已抓取文章
   - 源数量、信息数量或最近更新时间

2. `CategoryBoardWorkspace`
   - 刷新面板
   - 分类导航条
   - 5 张分类榜单卡
   - 可选简报工具区

3. 可选简报工具区
   - `生成今日科技简报`
   - `今日科技简报`
   - `AI 设置`

桌面布局：

- 榜单卡使用两列网格。
- 卡片密度高于当前文章流。
- 排名 1-3 有更强视觉权重。

移动布局：

- 单列卡片。
- 每条榜单行保留可点击标题和紧凑动作。
- 避免横向滚动。

## Components

建议新增：

- `components/rankings/category-board-workspace.tsx`
  - 榜单墙主组合组件。
  - 接收 `items`、`sources`、`agentTasks`、`settings`。
  - 调用 `buildCategoryBoard` 并渲染刷新面板、分类导航、榜单卡和简报工具。

- `components/rankings/category-ranking-card.tsx`
  - 单个分类榜单卡。
  - 展示分类标题、描述、条目数、Top 10 列表。

- `components/rankings/category-ranking-row.tsx`
  - 单条榜单行。
  - 展示排名、标题、来源、时间、短摘要。
  - 提供打开原文、已读、隐藏动作。

可以复用：

- `components/digest/source-refresh-panel.tsx`
- `components/digest/digest-action-panel.tsx`
- `components/digest/digest-card.tsx`
- `components/digest/model-settings-form.tsx`
- `app/actions.ts` 中的 `refreshTechSourcesAction` 和 `updateItemStateAction`

当前 `components/digest/article-list.tsx` 可以保留给简报引用或后续阅读流，不作为第一屏主组件。

## Interaction States

- 首次打开无文章：显示 5 张空分类卡；刷新面板提示点击 `获取最新信息`。
- 刷新中：按钮禁用并显示 `获取中`；旧榜单继续显示，不清空页面。
- 部分源失败：刷新状态显示失败数量；`刷新明细` 列出具体 source 和错误；已有榜单继续显示。
- 某分类为空：该分类卡显示空状态，不隐藏整张卡。
- 搜索有结果：榜单只显示匹配文章；空分类显示 `当前搜索下暂无内容`。
- 已读：调用现有 `updateItemStateAction`，榜单行可继续显示或弱化；第一版不强制移除已读。
- 隐藏：调用现有 `updateItemStateAction`，隐藏后不再进入榜单。
- 简报为空/本地/AI：沿用当前 mode badge，但位于榜单墙之后。

## Data Flow

1. `app/page.tsx` 继续读取 `getWorkspaceData`、`listDigestItems`。
2. `NarroWorkspace` 将 `items`、`sources`、`agentTasks`、`settings` 传给新的榜单 workspace。
3. `CategoryBoardWorkspace` 调用 `buildCategoryBoard({ items, sources })`。
4. 用户点击 `获取最新信息` 调用现有 refresh server action。
5. 用户点击 `已读` 或 `隐藏` 调用现有 item state server action。
6. 用户需要摘要时，在榜单之后运行现有 digest action。

## Testing

新增单元测试：

- `tests/category-board.test.ts`
  - item 能分入 5 个分类。
  - 一条 item 只进入一个分类。
  - hidden item 不进入榜单。
  - 分类内排序按 `importanceScore`、`publishedAt`、`title`。
  - 每个分类最多 10 条。
  - 没有匹配 source 的 item 被跳过。

新增/更新组件测试：

- `tests/category-board-workspace.test.tsx`
  - 渲染科技热榜和 5 个分类榜单。
  - 每条榜单行展示标题、来源、时间、摘要。
  - 打开原文、已读、隐藏动作存在。
  - 空分类显示空状态。
  - 简报工具在榜单墙之后。

- `tests/home-workspace.test.tsx`
  - 首页主内容是分类热榜。
  - `获取最新信息` 仍可用。
  - 旧 Source/Lens 侧栏、Agent 侧栏、事件组、高级筛选、OPML 不回到首页。

保留现有 digest、refresh、article action 测试，确保可选简报能力不被破坏。

## Acceptance Criteria

- 首页第一屏是大分类科技热榜，而不是简报或旧工作台。
- 固定展示 5 个分类榜单。
- 每个分类最多展示 10 条。
- 分类排序使用轻量热度规则。
- 用户可以刷新信息源并看到刷新反馈。
- 用户可以打开原文、标记已读、隐藏条目。
- hidden item 不再进入榜单。
- 简报和 AI 设置保留为增强能力，位置在榜单之后。
- 旧 Source/Lens/Agent/Event/OPML/高级筛选 UI 不挂载到首页。
- 不改数据库 schema。
- 不引入 TopHub 抓取或第三方页面解析。
