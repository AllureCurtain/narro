# Narro 个人信息中枢设计文档

日期：2026-05-24

项目名：Narro

代码目录：`narro`

命名说明：Narro 接近 narrative 和 narrow 的组合感，表达“把分散、宽泛、杂乱的信息收窄成清晰脉络”。它适合一个从实时信息流出发、逐步升级为个人情报 agent 的产品。

明确排除：`Klip` 已经用于剪贴板项目，不再用于本项目。`klip-e2e-1779591359984` 这类名字只适合作为测试或临时会话标识，不作为正式产品名、目录名或仓库名。

## 1. 产品定位

做一个个人使用的信息中枢：第一阶段是一个精美、稳定、每天愿意打开看的实时信息流；后续逐步升级成能总结、追踪、解释、生成报告的 agent 型情报工作台。

锁定方向：

> 首页采用 A 方案：实时信息流是主体验；吸收 B 方案的 Lens/视角能力；C 方案的高密度情报桌面放到后续版本。

关键判断：

- 用户第一眼看到的是信息流，不是聊天框。
- agent 感来自后台处理能力，而不是界面长得像聊天机器人。
- 系统底层尽量“什么都收”，上层通过视角随时切成垂直领域。
- 第一版先服务个人，不做多人协作和 SaaS。

## 2. 目标用户

第一版目标用户就是系统拥有者本人。

这带来几个设计取舍：

- 不做多用户账号体系。
- 不做租户、团队权限、计费和公开注册。
- 默认可信环境，本地或私有部署。
- 配置可以稍微偏 power user，不需要一开始就做成大众消费级产品。
- 重点优化每天使用的信息扫描、保存、总结和追踪体验。

## 3. 核心体验

首页由四个区域组成：顶部栏、左侧栏、中间信息流、右侧 agent 任务栏。

### 3.1 顶部栏

顶部栏承担全局操作：

- 搜索信息、实体、事件。
- 以后支持直接提问，例如“最近 AI IDE 有什么值得关注的变化？”
- 显示刷新状态，例如刚更新多少源、下一次刷新时间。
- 提供手动刷新入口。

### 3.2 左侧栏：信息源和视角

左侧栏包含两类导航：

- 信息源：全部来源、RSS/博客、GitHub、产品更新、新闻站点、论文、招聘、政策公告等。
- 视角：AI 编程工具、投资融资、技术趋势、公司监控、政策追踪等。

视角不是复制一份数据，而是对同一批底层信息做过滤、排序和解释。

一个视角可以包含：

- 关注的信息源或源分组。
- 关键词。
- 实体，例如公司、人名、产品、技术名。
- 标签。
- 排序方式，例如最新、重要、待读、事件优先。

### 3.3 中间区域：实时信息流

中间区域是主体验。

它展示：

- 最新信息。
- 重要信息。
- 事件组。
- 产品更新。
- 融资或市场事件。
- 待读、收藏、隐藏后的结果。

每张信息卡片不仅展示标题和摘要，还应逐步包含：

- AI 摘要。
- 原始来源。
- 发布时间。
- 事件组数量。
- 相关实体。
- 重要性原因。
- 操作按钮：保存、隐藏、追踪、总结、对比、打开原文。

第一版可以先做基础信息卡片，但结构要为后续智能字段预留位置。

### 3.4 右侧栏：Agent 任务

右侧栏是 agent 能力入口，但不喧宾夺主。

MVP 任务：

- 生成今日简报。
- 解释选中的信息。
- 基于当前视角创建持续追踪。
- 推荐相关信息源。

后续任务：

- 生成周报。
- 对比竞品。
- 检测弱信号。
- 对近期信息问答。
- 清理低质量信息源。
- 用自然语言创建监控任务。

## 4. MVP 范围

MVP 要证明一个闭环：

1. 添加信息源。
2. 定时抓取新内容。
3. 标准化并入库。
4. 在精美信息流中展示。
5. 创建并切换视角。
6. 对当前视角生成摘要或简报。

MVP 包含：

- RSS/Atom 信息源管理。
- 手动信息源分组。
- 定时刷新。
- 内容入库。
- URL 和标题相似度级别的基础去重。
- 通过关键词、源分组、标签配置视角。
- 左侧栏 + 信息流 + 右侧 agent 任务栏的首页。
- 单条信息摘要。
- 当前视角的今日简报。
- 本地或私有部署。

MVP 不包含：

- 多用户账号。
- SaaS 公开部署。
- 付费订阅。
- 浏览器插件。
- 移动 App。
- 大规模网页爬虫。
- 依赖不稳定抓取的社交媒体源。
- 复杂自主规划 agent。

## 5. 核心数据模型

### 5.1 Source 信息源

表示一个信息来源。

字段：

- id
- name
- type：rss、atom、github、webpage、api、manual
- url
- group
- enabled
- refresh_interval_minutes
- last_fetched_at
- failure_count
- created_at
- updated_at

MVP 只实现 rss 和 atom，其他 type 先作为后续扩展位。

### 5.2 Item 信息项

表示一条原始或标准化后的内容。

字段：

- id
- source_id
- title
- url
- author
- published_at
- fetched_at
- raw_content
- clean_content
- summary
- language
- tags
- entities
- importance_score
- content_hash
- duplicate_group_id
- read_status
- saved
- hidden
- created_at
- updated_at

### 5.3 Lens 视角

表示一个可复用的信息视图。

字段：

- id
- name
- description
- source_group_filters
- keyword_filters
- entity_filters
- tag_filters
- ranking_mode
- created_at
- updated_at

### 5.4 EventGroup 事件组

表示多条信息描述的同一事件或趋势。

字段：

- id
- title
- summary
- item_ids
- main_entities
- first_seen_at
- last_seen_at
- importance_score
- status：new、tracking、archived

MVP 可以先不做完整事件组，只做重复内容分组；M4 再升级为真正的事件组。

### 5.5 AgentTask 任务

表示一次或一个可复用的 agent 动作。

字段：

- id
- type：daily_brief、explain_item、track_lens、source_discovery
- lens_id
- item_id
- status
- input
- output
- error
- created_at
- updated_at

## 6. 技术架构

MVP 默认锁定为单体全栈应用。

技术选型：

- 包管理和运行时：pnpm 11 + Node.js 24+。
- 前端：Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4。
- 后端：Next.js Route Handlers / Server Actions，先不拆独立后端服务。
- 数据库：SQLite / libSQL。
- ORM / 查询层：Drizzle，原因是个人项目初期更轻、更接近 SQL，后续切到 libSQL 或托管 SQLite 成本更低。
- 定时任务：应用进程内 scheduler。
- LLM：OpenAI-compatible 接口，模型供应商通过环境变量配置。
- 部署：本地优先，后续支持 Docker 和私有 VPS。

这里不是“没有后端”，而是第一版把后端放在 Next.js 单体项目里。它仍然有明确的后端职责：

- API：信息源、信息流、视角、任务、摘要、简报等接口。
- 数据访问层：Drizzle schema、迁移、SQLite/libSQL 查询。
- 数据接入层：Source Adapter、RSS/Atom adapter、官方公开 API adapter、normalizer。
- 任务层：手动刷新、定时刷新、摘要生成、今日简报生成。
- LLM 适配层：OpenAI-compatible adapter，屏蔽模型供应商差异。
- 服务层：去重、Lens 过滤、排序、AgentTask 状态管理。

这样选的原因：

- 个人项目第一版需要降低运维复杂度。
- 单体全栈更适合快速打磨 UI 和数据流。
- SQLite 足够支撑早期个人信息库。
- OpenAI-compatible 接口便于后续切换模型供应商。

后续规模变大时再拆分后端：

- Web App。
- API 服务。
- Worker 服务。
- 搜索/向量服务。
- 主数据库。

## 7. 数据流

### 7.1 信息接入流程

1. Scheduler 找到需要刷新的启用信息源。
2. Source Adapter 按 source 类型读取 RSS/Atom 或官方公开 API。
3. Parser / API mapper 解析条目。
4. Normalizer 转成统一 Item 结构。
5. Deduplicator 用 URL、content_hash、标题相似度做基础去重。
6. Enricher 可选生成摘要、标签、实体。
7. Database 保存 Item 和 Source 刷新状态。
8. UI 展示新增内容。

### 7.2 视角查询流程

1. 用户选择一个 Lens。
2. 后端读取 Lens 配置。
3. 根据源分组、关键词、标签、实体过滤 Item。
4. 根据 ranking_mode 排序。
5. 中间信息流展示结果。
6. 右侧 agent 任务自动绑定当前 Lens。

### 7.3 今日简报流程

1. 用户点击“生成今日简报”。
2. 系统加载当前 Lens 的近期信息。
3. 去除明显重复内容。
4. 按主题或来源做初步分组。
5. 调用 LLM 生成简报。
6. 将结果保存到 AgentTask。
7. UI 在右侧栏或简报区域展示结果。

## 8. Agent 升级路线

不要第一版就做复杂自主 agent。按层升级。

### Layer 1：智能阅读器

- 读取已授权信息源。
- 标准化内容。
- 展示信息流。
- 支持视角。
- 支持简单摘要。

### Layer 2：情报助手

- 今日简报。
- 周报。
- 解释事件。
- 对比相关信息。
- 合并重复报道。
- 追踪实体和主题。

### Layer 3：个人监控 Agent

- 用自然语言创建监控任务。
- 推荐新信息源。
- 检测重要变化。
- 标记异常增长或突然热度。
- 对近期和历史信息问答。

### Layer 4：自主研究 Agent

- 围绕主题规划研究。
- 自动搜索缺失来源。
- 阅读相关网页。
- 生成结构化报告。
- 维护长期 topic dossier。

## 9. UI 原则

第一屏就是产品，不做营销落地页。

设计原则：

- 信息密度高，但要安静。
- 面向每天反复扫描。
- 真实内容优先，装饰其次。
- 卡片只用于信息项和任务面板。
- 不做卡片套卡片。
- 主信息流必须易读。
- Agent 任务可见，但不要抢主信息流的注意力。
- 视角要像工作上下文，不像普通分类。

布局锁定：

- 顶部：搜索/提问、刷新状态、全局操作。
- 左侧：信息源、源分组、视角。
- 中间：今日摘要、实时信息流、事件组。
- 右侧：agent 任务、简报结果、追踪入口。

## 10. 错误处理

信息源读取：

- 每个 Source 记录 failure_count。
- 多次失败后降频或暂停刷新。
- 前端显示来源异常。
- 读取失败不影响旧内容浏览。

解析：

- 单条内容解析失败不影响整个源。
- 保留足够原始字段方便排查。
- 对空标题、空链接、异常时间做兜底。

LLM：

- 摘要和简报任务可重试。
- LLM 失败不阻塞数据接入流程。
- AgentTask 保存错误信息。
- UI 显示任务失败和重试入口。

去重：

- MVP 不自动删除重复内容。
- 先标记 duplicate_group_id。
- 排序时降低重复项权重。

## 11. 测试策略

MVP 测试聚焦核心闭环。

单元测试：

- RSS/Atom parser。
- Item normalization。
- Deduplication。
- Lens filtering。
- Ranking。

集成测试：

- 添加 Source，读取 fixture feed，保存 Item。
- 从数据库生成 Lens feed。
- Mock LLM 生成今日简报。
- AgentTask 成功和失败状态。

UI 测试：

- 首页渲染左侧栏、中间信息流、右侧任务栏。
- 切换 Lens 后信息流更新。
- Source refresh 状态可见。
- 今日简报生成后可见。

手动验收：

1. 添加至少 3 个 RSS 信息源。
2. 手动触发刷新。
3. 首页出现新信息。
4. 创建“AI 编程工具”视角。
5. 切换到该视角。
6. 生成今日简报。
7. 简报能回链到原始信息。

## 12. 里程碑

### M0：产品骨架

- 创建项目。
- 实现静态首页布局。
- 定义核心类型。
- 加入 mock 数据。
- 验证这个 UI 是否每天愿意打开。

### M1：真实信息源

- 信息源管理。
- RSS/Atom 或官方公开 API 数据接入。
- SQLite 入库。
- 手动刷新和定时刷新。

### M2：视角

- 创建、编辑、删除 Lens。
- 通过源分组和关键词过滤信息流。
- 持久化 Lens 配置。

### M3：智能能力

- 单条信息摘要。
- 今日简报。
- AgentTask 结果存储。

### M4：事件分组

- 相似内容去重。
- 多条信息合并为事件组。
- 显示事件数量和相关来源。

### M5：监控 Agent

- 基于 Lens 创建追踪任务。
- 高亮信息变化。
- 推荐新信息源。

## 13. 实施默认决策

为避免后续执行时反复摇摆，先锁定以下默认实现：

- MVP 使用 Next.js 全栈单体，不拆独立后端。
- MVP 有后端能力，但后端以内置 Route Handlers / Server Actions 的方式存在于 Next.js 项目中。
- MVP 使用 SQLite，不引入外部数据库。
- MVP 暂不做向量数据库，先用关键词、标签、标题相似度和全文搜索。
- 搜索可优先使用 SQLite FTS，MVP 后半段再接入。
- LLM 接口做成 OpenAI-compatible adapter。
- 定时任务先运行在应用进程内。
- 如果后续需要长期后台数据接入，再拆 worker。
- 第一批信息源只做 RSS/Atom。

## 14. 已锁定决策

- 这是一个全新产品，和当前目录里的旧项目无关。
- 产品名锁定为 Narro，代码目录使用 `narro`。
- 第一目标是个人使用的信息中枢。
- 首页主体验是实时信息流。
- 视角 Lens 是随时切换垂直领域的核心机制。
- Agent 能力嵌入为任务和智能操作，不作为第一屏主 UI。
- MVP 从 RSS/Atom 和官方公开 API 开始，不做大规模网页爬虫。
- 系统结构要支持后续从同一数据底座中抽取垂直产品。

## 15. 初始项目结构建议

当前阶段先只保留文档，后续执行 `/goal` 时再生成代码。

文档结构：

```text
narro/
  README.md
  docs/
    goal-handoff.md
    mockups/
      narro-home-reference.html
    superpowers/
      specs/
        2026-05-24-narro-design.md
```

M0 代码生成后建议结构：

```text
narro/
  app/
    page.tsx
    layout.tsx
    api/
      sources/
      items/
      lenses/
      agent-tasks/
  components/
    app-shell/
    feed/
    sources/
    lenses/
    agent-tasks/
  lib/
    db/
    rss/
    ingestion/
    lenses/
    llm/
    agent-tasks/
  prisma/
    schema.prisma
    seed.ts
  tests/
    unit/
    integration/
  docs/
```

边界要求：

- `app/` 负责路由和页面组合。
- `components/` 只做 UI，不直接访问数据库。
- `lib/db/` 封装 Drizzle client、schema 和数据访问。
- `lib/sources/` 负责 SourceDefinition、SourceAdapter、RSS/Atom 和官方公开 API adapter。
- `lib/ingestion/` 负责编排数据接入、标准化、去重和入库。
- `lib/lenses/` 负责视角过滤和排序。
- `lib/llm/` 负责 OpenAI-compatible 调用。
- `lib/agent-tasks/` 负责摘要、简报和任务状态。

## 16. M0 实施合同

M0 只做产品骨架，不接真实数据源，不接真实 LLM。

M0 必须完成：

- 初始化 Next.js + TypeScript 项目。
- 建立基础视觉风格和首页布局。
- 参考 `docs/mockups/narro-home-reference.html` 实现首页信息结构：A 方案实时信息流为主，Lens 在左侧，agent 任务在右侧。
- 首页包含顶部栏、左侧栏、中间信息流、右侧 agent 任务栏。
- 使用 mock 数据展示 sources、lenses、items、agent tasks。
- 定义 TypeScript domain types：Source、Item、Lens、EventGroup、AgentTask。
- 建立基础组件边界，避免把所有 UI 写进一个大文件。
- 提供一个能本地运行的 dev server。
- 通过 typecheck、lint 或等价静态检查。

M0 不做：

- Drizzle schema。
- SQLite 入库。
- RSS/Atom 或官方 API 真实接入。
- LLM 摘要。
- 复杂设置页。
- 登录注册。
- 后台 worker。

M0 验收：

- 打开首页后能一眼看出 Narro 的产品形态。
- 页面不是落地页，而是实际工作台。
- 信息流是主角，agent 任务在右侧作为能力层。
- mock 数据足够真实，能展示产品价值。
- 移动端和桌面端不出现明显重叠、溢出或空白主体验。

## 17. M1 实施合同

M1 在 M0 基础上接入真实数据。

M1 必须完成：

- Drizzle + SQLite/libSQL。
- Source 表和 Item 表。
- Source Adapter 边界。
- RSS/Atom parser。
- 官方公开 API adapter 骨架。
- 手动添加信息源。
- 手动刷新一个信息源。
- 将 RSS 条目标准化为 Item。
- URL/content_hash 基础去重。
- 首页从数据库读取真实信息。

M1 可以暂缓：

- 定时刷新。
- Lens 编辑器。
- LLM 摘要。
- 今日简报。
- 事件组。

M1 验收：

- 添加 3 个真实 source，其中至少 2 个是 RSS/Atom feed。
- 手动刷新后数据库出现 Item。
- 首页能展示这些 Item。
- 重复 URL 不会重复入库。
- 某个信息源失败时不会影响其他源。

## 18. 后续 `/goal` 执行原则

后续用 `/goal` 时，应让实现从 M0 开始，不要一次性做完整 MVP。

执行原则：

- 每个 goal 只做一个里程碑。
- 先 UI 骨架，再真实数据，再智能能力。
- 每个阶段都要有可运行结果。
- 优先保证工程边界清晰，不把数据接入、数据库、UI、LLM 混在一起。
- 每次完成后都运行验证命令，再进入下一个里程碑。

推荐 goal 顺序：

1. M0：Next.js 产品骨架 + mock UI。
2. M1：Drizzle + SQLite/libSQL + Source Adapter 入库。
3. M2：Lens 创建和过滤。
4. M3：LLM 摘要和今日简报。
5. M4：去重增强和事件组。
6. M5：监控任务和 source discovery。

## 19. 风险和控制

主要风险：

- “什么都有”导致首页信息过载。
- 一开始就做 agent，导致基本阅读体验不稳定。
- 数据源范围过大，陷入反爬、非官方接口和数据清洗问题。
- LLM 功能太早接入，掩盖底层数据质量问题。
- 单文件组件过大，后续难维护。

控制方式：

- MVP 从 RSS/Atom 和官方公开 API 开始，不做网页爬虫。
- 首页始终以可读信息流为核心。
- Lens 是信息组织核心，不靠堆功能解决混乱。
- M0 不接数据库和 LLM，先把产品形态跑通。
- M1 只做真实信息入库，不做复杂智能。
- 从第一天就拆清楚 UI、数据接入、数据库、任务和 LLM 边界。
