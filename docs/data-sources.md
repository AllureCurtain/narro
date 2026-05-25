# Narro 数据源策略

Narro 不做网页爬虫，也不把自己定位成普通 RSS 阅读器。数据层用 `Source Adapter` 把不同来源统一成同一种 `Item`：RSS/Atom 是第一类 adapter，官方公开 API 是第二类 adapter，后续认证型 API 或付费数据源也是 adapter。

## 结论

1. M1 先做 RSS/Atom adapter，因为它稳定、低成本、适合社区讨论、博客、论文和少量官方更新。
2. Hacker News 先用 RSS 进入 M1 默认源；官方 Firebase API 记录进 M2 backlog，等需要 score、评论数和 story 类型时再实现。
3. M2 做官方公开 API adapter，优先接 Hacker News、GitHub Search、arXiv、Product Hunt、Stack Exchange、包管理 registry 这类结构化来源。
4. GitHub release / changelog 暂时保留在 source directory，不作为默认首页内容；它们更适合后续“关注某个 repo / 产品”的专项 Lens。
5. 取消“网页爬虫型数据源 M3”。如果一个来源没有 RSS、没有官方 API、没有授权数据导出，就先不接。
6. 数据源 M3 改成“Source Directory + Connector Backlog”：维护一批可验证的数据源目录、API 文档链接、认证方式、限流规则和适配优先级。
7. NewsNow / TopHub 只借鉴产品和工程组织方式，不复刻它们的数据抓取方式。

## Adapter 分层

| 层级 | 接入方式 | 适合内容 | 是否进入 MVP |
| --- | --- | --- | --- |
| Feed Adapter | RSS / Atom | 博客、产品 changelog、GitHub releases、论文更新、媒体栏目 | M1 |
| Public API Adapter | 官方公开 REST / GraphQL / Firebase API | GitHub 搜索、HN item、Product Hunt、Stack Exchange、包管理 registry | M2 |
| Auth API Adapter | 需要 token 或 OAuth 的官方 API | Reddit、YouTube、Linear、Notion、Slack、付费数据源 | 数据源 M3+ |
| File / Export Adapter | OPML、CSV、JSON export | 用户已有订阅、手工维护的 source list、第三方开放数据集 | M2+ |

明确不做：

- 反爬页面解析。
- 逆向未公开接口。
- 绕过登录、验证码、Cloudflare 或反自动化限制。
- 大规模搜索引擎抓取。

## 第一批候选

已实测的免费可靠源见：[validated-free-sources.md](validated-free-sources.md)。

| 来源 | 官方入口 | 接入方式 | 适合用途 | 优先级 |
| --- | --- | --- | --- | --- |
| Hacker News RSS | HN RSS | RSS | 技术社区早期讨论、Show HN、Ask HN、趋势入口 | M1 默认 |
| Hacker News API | Official Firebase API | JSON API | 按 score、评论数、story 类型做排序和过滤 | M2 |
| GitHub Releases | GitHub REST API / releases Atom | Atom + REST | 跟踪重点 repo 的版本更新、breaking changes | 目录保留，默认关闭 |
| GitHub Search | GitHub REST API | REST | 发现新 repo、按 stars / pushed / topic 观察趋势 | M2 |
| GitHub Feeds | GitHub REST API | Atom URL discovery | 组织、用户、仓库动态 | M2 |
| HNRSS | 第三方 RSS 服务 | RSS | HN frontpage / active / points / comments 过滤增强 | 可选增强 |
| arXiv | arXiv API | Atom API | AI、软件工程、NLP 论文 | M1-M2 |
| Product Hunt | Product Hunt API | GraphQL | 新产品发布、AI 工具发现 | M2 |
| Stack Exchange | Stack Exchange API | REST | 技术问答热度、开发者关注点 | M2 |
| npm Registry | npm registry API | REST | JS 包版本、下载生态、依赖变化 | M2 |
| PyPI | PyPI JSON API | REST | Python 包版本、项目元数据 | M2 |
| 官方 changelog / blog | 各产品官网 | RSS / Atom | 产品功能、定价、权限、企业发布 | M1 |

## 如何找公开 API

优先级从高到低：

1. 官方开发者文档：搜索 `{产品名} API docs`、`{产品名} developers`、`{产品名} RSS`、`{产品名} changelog feed`。
2. 官方 OpenAPI / GraphQL schema：有 schema 的来源更适合长期维护，因为字段、认证和错误码更清楚。
3. API 目录：APIs.guru、public-apis 这类目录只用来发现线索，最终仍以官方文档为准。
4. GitHub 搜索：找官方 SDK、OpenAPI spec、`awesome-*` source list、OPML 列表，但不把第三方逆向接口当稳定依赖。
5. 现有聚合站观察：只学习 source metadata、分类、缓存、降级、刷新间隔，不复制其非官方抓取逻辑。

筛选标准：

- 官方授权：文档中明确提供 API / feed / export。
- 稳定性：有版本号、更新记录、状态页或 SDK。
- 成本：免费额度足够个人使用，或 token 获取简单。
- 数据价值：能提供发布时间、原始链接、作者/source、摘要/正文、热度指标之一。
- 可去重：有稳定 id、canonical URL 或组合键。
- 可降级：失败时能保留旧缓存，不让首页变空。

## M1 范围

M1 做真实数据底座，但范围要窄：

- `SourceDefinition`：名称、类型、URL、刷新间隔、Lens 标签、是否启用。
- `SourceAdapter`：`fetch(source) -> RawEntry[]`。
- `Normalizer`：`RawEntry -> Item`，统一标题、链接、发布时间、来源、摘要、外部 id、metadata。
- `Deduper`：按 canonical URL、external id、标题相似度做基础去重。
- `Cache`：保留最后一次成功结果，抓取失败时首页显示旧数据并标记 source 状态。

M1 adapter 只需要：

- RSS/Atom adapter。
- Hacker News 官方 RSS preset。
- GitHub releases Atom preset 保留在目录，默认关闭。
- HNRSS preset 作为可选增强，不作为核心依赖。
- arXiv query preset。
- 手动添加 feed URL。

## M2 范围

M2 再接官方 API，不急着铺很多源：

- Hacker News official API adapter：top/new/best/ask/show/job story ids、item detail、score、descendants、kids。
- GitHub REST adapter：releases、search repositories、repository metadata。
- Product Hunt GraphQL adapter：按日期读取产品发布。
- Stack Exchange adapter：按 tag / sort 读取问题热度。
- Registry adapter：npm / PyPI package metadata。

API adapter 必须显式记录：

- auth 类型：none、token、OAuth。
- rate limit：每小时/每天额度。
- pagination：游标或页码。
- freshness：建议刷新间隔。
- failure policy：失败是否回退缓存、是否暂停 source。

## Hacker News 接入记录

当前决策：M1 先用 RSS，M2 再做官方 API。

| 源 | URL | 接入层 | 默认启用 | 说明 |
| --- | --- | --- | --- | --- |
| HN RSS | https://news.ycombinator.com/rss | Feed Adapter | 是 | 官方 RSS，字段少但稳定，能快速进入现有 RSS 管线。 |
| HN API top stories | https://hacker-news.firebaseio.com/v0/topstories.json | Public API Adapter | 否，M2 | 返回 story id 列表，需要再请求 item。 |
| HN API new stories | https://hacker-news.firebaseio.com/v0/newstories.json | Public API Adapter | 否，M2 | 适合发现新内容，但噪声更高。 |
| HN API best stories | https://hacker-news.firebaseio.com/v0/beststories.json | Public API Adapter | 否，M2 | 适合高信号默认排序。 |
| HN API item | https://hacker-news.firebaseio.com/v0/item/{id}.json | Public API Adapter | 否，M2 | item 可提供 title、url、by、time、score、descendants、kids、type。 |
| HNRSS Frontpage | https://hnrss.org/frontpage | Feed Adapter | 否，可选 | 第三方 RSS，可快速增加 HN frontpage 过滤，但不作为核心依赖。 |

M2 HN API adapter 目标字段：

- `id`：稳定 external id。
- `title` / `url`：标题和原文链接；没有 `url` 的 Ask HN 用 HN item 链接。
- `by` / `time`：作者和发布时间。
- `score` / `descendants`：热度排序核心信号。
- `type`：区分 story、job、poll、comment。
- `kids`：后续用于评论摘要，不进入 M2 第一版。

## 数据源 M3 范围

数据源 M3 不再表示爬虫。它表示更完整的数据源治理：

- Source Directory：内置一批可勾选的数据源模板。
- Connector Backlog：记录候选 API、官方文档、认证成本、字段质量、实现成本。
- OPML import：导入用户已有 RSS 订阅。
- Auth API：接入需要 token 的官方 API。
- 付费/授权数据源：例如公司、融资、学术、招聘或市场数据。

如果一个站点只有网页，没有 feed、官方 API、导出文件或授权数据源，它进入 backlog，但不进入实现。

## 参考站点观察

### NewsNow

站点：`https://newsnow.busiyi.world/`

可借鉴点：

- 前端按 source id 调用统一接口，例如 `/api/s?id=...` 和 `/api/s/entire`。
- 后端把每个来源拆成单独 getter，source metadata 独立维护。
- 每个 getter 返回统一 news item，并在接口层做缓存、刷新间隔判断、失败回退。

对 Narro 的启发：

- 可以采用 `SourceDefinition` + `SourceAdapter` 的组织方式。
- source metadata 需要包含分类、刷新间隔、图标/颜色、失败策略。
- 不复制它对非官方页面的抓取方式。

### TopHub

站点：`https://tophub.today/c/tech`

当前访问结果：

- 访问触发安全验证，无法稳定检查页面接口。
- 从产品形态看，它是按类别聚合多个热榜源，`/c/tech` 表示技术类聚合页。

对 Narro 的启发：

- 适合作为 source directory / preset 分类参考。
- 技术、产品、AI、金融、政策等大类可以先展示为“源 -> 条目”的清晰聚合，再逐步做跨源排序。
- 不把它作为数据接口来源。

## 参考

- GitHub releases REST API: https://docs.github.com/en/rest/releases/releases
- GitHub feeds REST API: https://docs.github.com/en/rest/activity/feeds
- GitHub search REST API: https://docs.github.com/en/rest/search/search
- Hacker News official API: https://github.com/HackerNews/API
- Hacker News RSS: https://hnrss.github.io/
- arXiv API access: https://info.arxiv.org/help/api/index.html
- Product Hunt API: https://api.producthunt.com/v2/docs
- Stack Exchange API: https://api.stackexchange.com/docs
- npm registry: https://docs.npmjs.com/cli/v11/using-npm/registry
- PyPI JSON API: https://docs.pypi.org/api/json/
- APIs.guru OpenAPI Directory: https://apis.guru/
- public-apis directory: https://github.com/public-apis/public-apis
