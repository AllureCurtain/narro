import type {
  AgentTask,
  DataSourceCandidate,
  EventGroup,
  Item,
  Lens,
  Source,
  WorkspaceSummary
} from "./domain";
import { getDefaultSourcePresets, getSourcePresetsByGroup, verifiedFreeSourcePresets } from "./sources/presets";

const sourcePresetGroups = getSourcePresetsByGroup();
const defaultPresetCount = getDefaultSourcePresets().length;
const healthySourceMeta = {
  healthStatus: "healthy" as const,
  averageLatencyMs: 320,
  lastError: "",
  nextRefreshAt: "2026-05-24T11:56:00+08:00"
};

export const mockSources: Source[] = [
  {
    id: "all",
    name: "全部来源",
    type: "manual",
    url: "narro://all",
    group: "全部",
    enabled: true,
    refreshIntervalMinutes: 15,
    lastFetchedAt: "2026-05-24T10:56:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 214,
    unreadCount: 37
  },
  {
    id: "github-changelog",
    name: "GitHub Changelog",
    type: "rss",
    url: "https://github.blog/changelog/feed/",
    group: "产品更新",
    enabled: true,
    refreshIntervalMinutes: 60,
    lastFetchedAt: "2026-05-24T10:52:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 10,
    unreadCount: 6
  },
  {
    id: "github-release-nextjs",
    name: "Next.js Releases",
    type: "atom",
    url: "https://github.com/vercel/next.js/releases.atom",
    group: "代码动态",
    enabled: true,
    refreshIntervalMinutes: 120,
    lastFetchedAt: "2026-05-24T10:43:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 10,
    unreadCount: 11
  },
  {
    id: "hugging-face-blog",
    name: "Hugging Face Blog",
    type: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    group: "模型厂商",
    enabled: true,
    refreshIntervalMinutes: 120,
    lastFetchedAt: "2026-05-24T10:47:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 784,
    unreadCount: 5
  },
  {
    id: "hacker-news-rss",
    name: "Hacker News",
    type: "rss",
    url: "https://news.ycombinator.com/rss",
    group: "社区讨论",
    enabled: true,
    refreshIntervalMinutes: 20,
    lastFetchedAt: "2026-05-24T10:55:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 30,
    unreadCount: 15
  },
  {
    id: "arxiv-cs-ai",
    name: "arXiv cs.AI",
    type: "atom",
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending",
    group: "论文研究",
    enabled: true,
    refreshIntervalMinutes: 720,
    lastFetchedAt: "2026-05-24T10:38:00+08:00",
    failureCount: 0,
    ...healthySourceMeta,
    itemCount: 25,
    unreadCount: 8
  }
];

export const mockLenses: Lens[] = [
  {
    id: "ai-coding",
    name: "AI 编程工具",
    description: "关注 IDE、agentic coding、企业权限、模型上下文和开源插件。",
    sourceGroupFilters: ["产品更新", "代码动态", "社区讨论", "模型厂商"],
    keywordFilters: ["Cursor", "Claude Code", "Windsurf", "IDE", "code agent"],
    entityFilters: ["Cursor", "Anthropic", "OpenAI", "Windsurf"],
    tagFilters: ["ai-ide", "developer-tooling"],
    rankingMode: "event_first",
    active: true,
    unreadCount: 18
  },
  {
    id: "funding",
    name: "投资融资",
    description: "捕捉开发者工具、基础设施和模型应用公司的融资变化。",
    sourceGroupFilters: ["新闻站点", "产品更新"],
    keywordFilters: ["funding", "series", "valuation", "acquisition"],
    entityFilters: ["Lovable", "Cognition", "LangChain"],
    tagFilters: ["market", "funding"],
    rankingMode: "important",
    unreadCount: 7
  },
  {
    id: "tech-trends",
    name: "技术趋势",
    description: "看框架、运行时、云平台和工程实践的长期变化。",
    sourceGroupFilters: ["代码动态", "社区讨论"],
    keywordFilters: ["runtime", "framework", "observability", "compiler"],
    entityFilters: ["Vercel", "Cloudflare", "Bun", "Rust"],
    tagFilters: ["trend", "infrastructure"],
    rankingMode: "latest",
    unreadCount: 9
  },
  {
    id: "company-watch",
    name: "公司监控",
    description: "跟踪重点公司的产品、招聘、价格和生态动作。",
    sourceGroupFilters: ["产品更新", "新闻站点", "招聘"],
    keywordFilters: ["pricing", "enterprise", "hiring", "partnership"],
    entityFilters: ["OpenAI", "Anthropic", "Google", "Microsoft"],
    tagFilters: ["company", "pricing"],
    rankingMode: "important",
    unreadCount: 3
  }
];

export const mockEventGroups: EventGroup[] = [
  {
    id: "event-cursor-enterprise",
    title: "企业版 AI IDE 权限模型开始分化",
    summary: "Cursor、Windsurf 和多款开源工具都在调整团队权限、审计和代码上下文策略。",
    itemIds: ["item-cursor-permissions", "item-windsurf-collab"],
    mainEntities: ["Cursor", "Windsurf", "Anthropic"],
    firstSeenAt: "2026-05-24T07:34:00+08:00",
    lastSeenAt: "2026-05-24T10:41:00+08:00",
    importanceScore: 87,
    sourceCount: 2,
    status: "tracking"
  },
  {
    id: "event-claude-code-oss",
    title: "Claude Code 周边开源工具升温",
    summary: "GitHub 与社区讨论同时出现配置、审计、代理执行和多仓库上下文相关项目。",
    itemIds: ["item-claude-code-oss", "item-agent-routing"],
    mainEntities: ["Claude Code", "GitHub", "MCP"],
    firstSeenAt: "2026-05-24T08:12:00+08:00",
    lastSeenAt: "2026-05-24T10:28:00+08:00",
    importanceScore: 79,
    sourceCount: 2,
    status: "new"
  }
];

export const mockItems: Item[] = [
  {
    id: "item-cursor-permissions",
    sourceId: "github-changelog",
    title: "GitHub Changelog 继续强化仓库规则和企业治理能力",
    url: "https://github.blog/changelog/",
    author: "GitHub Changelog",
    publishedAt: "2026-05-24T09:18:00+08:00",
    fetchedAt: "2026-05-24T10:52:00+08:00",
    summary: "产品博客提到细粒度项目权限、审计日志和团队级策略，社区讨论集中在代码上下文上传边界。",
    aiSummary: "这不是一次普通的设置项更新。企业客户开始把 AI IDE 纳入工程治理，权限、审计和上下文隔离会变成采购门槛。",
    language: "zh",
    tags: ["ai-ide", "enterprise", "governance"],
    entities: ["Cursor", "AI IDE", "权限"],
    importanceScore: 91,
    duplicateGroupId: "dup-cursor-enterprise",
    readStatus: "unread",
    saved: false,
    hidden: false,
    eventGroupId: "event-cursor-enterprise",
    reason: "同一事件在产品博客、Hacker News 和工程团队周报中同时出现。",
    actionLabels: ["保存", "隐藏", "追踪", "打开原文"]
  },
  {
    id: "item-claude-code-oss",
    sourceId: "github-release-nextjs",
    title: "Next.js release feed 继续保持高频版本更新",
    url: "https://github.com/vercel/next.js/releases",
    author: "GitHub Releases",
    publishedAt: "2026-05-24T08:46:00+08:00",
    fetchedAt: "2026-05-24T10:43:00+08:00",
    summary: "多个项目围绕命令审计、上下文压缩和多仓库任务编排展开，star 增长集中在最近 72 小时。",
    aiSummary: "工具生态正在从简单封装转向团队可控的执行环境，后续值得观察是否会出现事实标准。",
    language: "zh",
    tags: ["open-source", "agentic-coding", "trend"],
    entities: ["Claude Code", "GitHub", "MCP"],
    importanceScore: 84,
    readStatus: "unread",
    saved: true,
    hidden: false,
    eventGroupId: "event-claude-code-oss",
    reason: "GitHub 增长和社区讨论方向一致，更像趋势信号而不是单点新闻。",
    actionLabels: ["取消保存", "对比", "追踪", "打开原文"]
  },
  {
    id: "item-windsurf-collab",
    sourceId: "hacker-news-rss",
    title: "Windsurf 新协作功能被拿来和企业 IDE 做对比",
    url: "https://news.ycombinator.com/item?id=narro-windsurf-collab",
    author: "Hacker News",
    publishedAt: "2026-05-24T07:55:00+08:00",
    fetchedAt: "2026-05-24T10:55:00+08:00",
    summary: "讨论焦点不是协同编辑本身，而是 AI agent 在多人项目中的权限归属和变更可追溯性。",
    aiSummary: "协作功能正在和 agent 执行权绑定，团队会要求更清楚的责任边界。",
    language: "zh",
    tags: ["collaboration", "ai-ide", "product"],
    entities: ["Windsurf", "Cursor", "企业 IDE"],
    importanceScore: 77,
    duplicateGroupId: "dup-cursor-enterprise",
    readStatus: "reading",
    saved: false,
    hidden: false,
    eventGroupId: "event-cursor-enterprise",
    reason: "与 Cursor 权限更新共享同一条企业治理主线。",
    actionLabels: ["保存", "隐藏", "总结", "打开原文"]
  },
  {
    id: "item-agent-routing",
    sourceId: "hugging-face-blog",
    title: "开源模型生态继续推动本地 agent 工具链",
    url: "https://huggingface.co/blog",
    author: "Hugging Face Blog",
    publishedAt: "2026-05-24T06:20:00+08:00",
    fetchedAt: "2026-05-24T10:47:00+08:00",
    summary: "上下文长度、工具调用成本和代码审查阶段的可靠性差异，让不少团队尝试分层路由。",
    aiSummary: "模型选择正在从全局配置变成任务级策略，Narro 后续可以把这类话题自动归为技术趋势。",
    language: "zh",
    tags: ["model-routing", "developer-tooling", "strategy"],
    entities: ["Anthropic", "OpenAI", "代码 agent"],
    importanceScore: 73,
    readStatus: "unread",
    saved: false,
    hidden: false,
    eventGroupId: "event-claude-code-oss",
    reason: "与开源工具增长共同指向 agent 工程化。",
    actionLabels: ["保存", "隐藏", "解释", "打开原文"]
  }
];

export const mockAgentTasks: AgentTask[] = [
  {
    id: "task-daily-brief",
    type: "daily_brief",
    title: "生成今日简报",
    description: "基于当前 Lens，把重要事件整理成 5 分钟可读版本，并保留原文回链。",
    lensId: "ai-coding",
    status: "ready",
    input: "AI 编程工具 Lens 今日未读与重要事件",
    output: "草稿将覆盖企业权限、开源周边和模型路由三个主题。",
    createdAt: "2026-05-24T10:40:00+08:00",
    updatedAt: "2026-05-24T10:56:00+08:00",
    primary: true
  },
  {
    id: "task-track-lens",
    type: "track_lens",
    title: "创建持续追踪",
    description: "把当前视角保存为监控任务，每天记录新增事件和明显变化。",
    lensId: "ai-coding",
    status: "queued",
    input: "AI 编程工具 Lens 的公司、产品、关键词组合",
    createdAt: "2026-05-24T09:58:00+08:00",
    updatedAt: "2026-05-24T10:31:00+08:00"
  },
  {
    id: "task-explain-item",
    type: "explain_item",
    title: "解释选中信息",
    description: "选中任意新闻后，补充背景、相关实体和可能影响。",
    itemId: "item-cursor-permissions",
    status: "ready",
    input: "当前信息卡片",
    createdAt: "2026-05-24T10:02:00+08:00",
    updatedAt: "2026-05-24T10:02:00+08:00"
  },
  {
    id: "task-source-discovery",
    type: "source_discovery",
    title: "发现新信息源",
    description: "根据近期常读主题推荐 RSS、博客、项目更新源和公司 changelog。",
    lensId: "ai-coding",
    status: "ready",
    input: "最近 7 天已保存信息与高频实体",
    createdAt: "2026-05-24T08:36:00+08:00",
    updatedAt: "2026-05-24T09:20:00+08:00"
  }
];

export const workspaceSummary: WorkspaceSummary = {
  activeLensId: "ai-coding",
  updatedSourceCount: 12,
  totalUnreadCount: 37,
  digestTitle: "今日智能摘要",
  digestBody:
    "过去 6 小时内，AI 编程工具相关信息集中在企业权限、开源周边工具和模型路由策略。Narro 已把 11 条相似内容收敛成 2 个事件组，并留下 4 条值得优先阅读的信息。"
};

export const dataSourceCandidates: DataSourceCandidate[] = [
  {
    id: "validated-free-sources",
    name: "已验证免费源目录",
    channel: "rss",
    priority: "M1",
    coverage: `${verifiedFreeSourcePresets.length} 个免费公开源已通过 HTTP 和解析校验，其中 ${defaultPresetCount} 个适合默认启用。`,
    sourceUrl: "docs/validated-free-sources.md",
    reason: "只包含 RSS/Atom、官方公开 API 和 GitHub release Atom，不含付费源、爬虫源或需要登录绕限制的入口。"
  },
  {
    id: "github-releases",
    name: "GitHub Releases",
    channel: "atom",
    priority: "M1",
    coverage: `${sourcePresetGroups.release.length} 个重点仓库 release、版本说明和 breaking changes`,
    sourceUrl: "https://github.com/{owner}/{repo}/releases.atom",
    reason: "最适合作为第一批高信号工程数据，不需要登录即可订阅单仓库更新。"
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    channel: "rss",
    priority: "M1",
    coverage: "开发者工具、AI IDE、开源项目的早期社区讨论",
    sourceUrl: "https://news.ycombinator.com/rss",
    reason: "官方 RSS 已通过校验；后续 M2 再接官方 Firebase API 做热度和评论增强。"
  },
  {
    id: "arxiv",
    name: "arXiv",
    channel: "api",
    priority: "M1",
    coverage: "cs.AI、cs.CL、cs.LG、cs.SE、stat.ML 相关论文和 agent 工程研究",
    sourceUrl: "https://export.arxiv.org/api/query?search_query=cat:cs.AI",
    reason: "接口稳定、返回 Atom，能直接复用 RSS/Atom 解析链路。"
  },
  {
    id: "official-product-feeds",
    name: "官方产品 Feed",
    channel: "rss",
    priority: "M1",
    coverage: "GitHub、Vercel、Node.js、React、TypeScript、Cloudflare 等官方更新",
    sourceUrl: "https://github.blog/changelog/feed/",
    reason: "官方发布比二手新闻噪声低，适合作为第一版的信息底座。"
  },
  {
    id: "public-api-backlog",
    name: "免费公开 API Backlog",
    channel: "api",
    priority: "M2",
    coverage: `${sourcePresetGroups.api.length} 个已验证 JSON API，包括 HN、npm registry 和 PyPI。`,
    sourceUrl: "docs/validated-free-sources.md#m2-免费-api-源",
    reason: "这些源免费且能执行，但需要 API adapter，不混进 M1 Feed Adapter。"
  }
];
