# Narro 免费可靠数据源清单

验证时间：2026-05-24。

验证标准：

- 免费公开可访问。
- 不需要登录、付费、绕过验证码或网页爬虫。
- endpoint 返回 HTTP 200。
- RSS / Atom 能解析出 `<item>` 或 `<entry>`；JSON API 能解析出对象或数组。
- 内容具备发布时间、标题、链接或稳定 ID，能被标准化为 Narro `Item`。

结论：

- 首轮检查 89 个候选，通过 76 个。
- 精选复验 74 个候选，通过 74 个。
- 默认源建议优先接 `default` 里的社区/博客/论文源；`release` 组保留在目录，默认关闭，避免首页被源码 release 信息占满。
- `api` 组放到 M2 API adapter。
- `optional` 组能执行，但噪声或来源稳定性略弱，不建议默认开启。

## 默认 Feed 源

| 名称 | 类型 | URL | 条目数 | 最新日期 | 质量结论 |
| --- | --- | --- | ---: | --- | --- |
| Hugging Face Blog | RSS | https://huggingface.co/blog/feed.xml | 784 | 2026-05-23 | 达标，高信号 AI 工具/模型生态 |
| Ollama Blog | RSS | https://ollama.com/blog/rss.xml | 48 | 2026-03-30 | 达标，本地模型生态 |
| AWS Machine Learning Blog | RSS | https://aws.amazon.com/blogs/machine-learning/feed/ | 20 | 2026-05-21 | 达标，官方 AI/ML 实践 |
| Google AI Blog | RSS | https://blog.google/innovation-and-ai/technology/ai/rss/ | 20 | 2026-05-22 | 达标，官方 AI 新闻 |
| GitHub Changelog | RSS | https://github.blog/changelog/feed/ | 10 | 2026-05-22 | 达标，官方产品更新 |
| GitHub Engineering | RSS | https://github.blog/engineering/feed/ | 10 | 2026-05-14 | 达标，官方工程文章 |
| Vercel Changelog | Atom | https://vercel.com/atom | 1171 | 2026-05-21 | 达标，官方产品更新 |
| Next.js Blog | RSS | https://nextjs.org/feed.xml | 64 | 2026-03-25 | 达标，官方框架动态 |
| React Blog | RSS | https://react.dev/rss.xml | 23 | 2026-05-14 | 达标，官方框架动态 |
| Node.js Blog | RSS | https://nodejs.org/en/feed/blog.xml | 1033 | 2026-05-21 | 达标，官方运行时动态 |
| Node.js Releases | RSS | https://nodejs.org/en/feed/releases.xml | 790 | 2026-05-21 | 达标，官方版本发布 |
| TypeScript Blog | RSS | https://devblogs.microsoft.com/typescript/feed/ | 10 | 2026-04-21 | 达标，官方语言动态 |
| Tailwind CSS Blog | RSS | https://tailwindcss.com/feeds/feed.xml | 62 | 2026-05-08 | 达标，官方框架动态 |
| Deno Blog | Atom | https://deno.com/feed | 248 | 2026-05-24 | 达标，官方运行时动态 |
| Bun Blog | RSS | https://bun.sh/rss.xml | 175 | 2026-05-21 | 达标，官方运行时动态 |
| Rust Blog | Atom | https://blog.rust-lang.org/feed.xml | 10 | 2026-05-18 | 达标，官方语言动态 |
| Go Blog | Atom | https://go.dev/blog/feed.atom | 10 | 2026-05-21 | 达标，官方语言动态 |
| Kubernetes Blog | RSS | https://kubernetes.io/feed.xml | 50 | 2026-05-20 | 达标，官方云原生动态 |
| Docker Blog | RSS | https://www.docker.com/feed/ | 10 | 2026-05-19 | 达标，官方基础设施动态 |
| Cloudflare Blog | RSS | https://blog.cloudflare.com/rss/ | 20 | 2026-05-21 | 达标，高质量基础设施/安全 |
| Mozilla Hacks | RSS | https://hacks.mozilla.org/feed/ | 20 | 2026-05-21 | 达标，Web 平台工程文章 |
| web.dev | RSS | https://web.dev/static/blog/feed.xml | 10 | 2026-04-24 | 达标，Web 平台工程文章 |
| Chrome Developers Blog | RSS | https://developer.chrome.com/blog/feed.xml | 10 | 2026-05-22 | 达标，浏览器/平台官方动态 |
| Android Developers Blog | RSS | https://android-developers.googleblog.com/feeds/posts/default?alt=rss | 25 | 2026-05-19 | 达标，Android 官方动态 |
| Chromium Blog | RSS | https://blog.chromium.org/feeds/posts/default?alt=rss | 25 | 2026-03-31 | 达标，浏览器官方动态 |
| Apple Developer News | RSS | https://developer.apple.com/news/rss/news.rss | 163 | 2026-05-21 | 达标，Apple 官方开发者动态 |
| Stripe Blog | RSS | https://stripe.com/blog/feed.rss | 10 | 2026-05-11 | 达标，产品/平台工程内容 |
| CISA Advisories | RSS | https://www.cisa.gov/cybersecurity-advisories/all.xml | 30 | 2026-05-22 | 达标，官方安全公告 |
| Google Security Blog | RSS/Atom | http://feeds.feedburner.com/GoogleOnlineSecurityBlog | 25 | 2026-05-23 | 达标，官方安全博客 |
| GitHub Security Blog | RSS | https://github.blog/security/feed/ | 10 | 2026-05-20 | 达标，开发者安全 |
| arXiv cs.AI | Atom API | https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending | 25 | 2026-05-24 | 达标，AI 论文 |
| arXiv cs.CL | Atom API | https://export.arxiv.org/api/query?search_query=cat:cs.CL&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending | 25 | 2026-05-24 | 达标，NLP 论文 |
| arXiv cs.LG | Atom API | https://export.arxiv.org/api/query?search_query=cat:cs.LG&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending | 25 | 2026-05-24 | 达标，机器学习论文 |
| arXiv cs.SE | Atom API | https://export.arxiv.org/api/query?search_query=cat:cs.SE&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending | 25 | 2026-05-24 | 达标，软件工程论文 |
| arXiv stat.ML | Atom API | https://export.arxiv.org/api/query?search_query=cat:stat.ML&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending | 25 | 2026-05-24 | 达标，统计机器学习 |
| Hacker News RSS | RSS | https://news.ycombinator.com/rss | 30 | 2026-05-24 | 达标，开发者社区高信号，M1 默认启用 |
| Lobsters RSS | RSS | https://lobste.rs/rss | 25 | 2026-05-24 | 达标，开发者社区高信号 |
| 阮一峰周刊 | RSS | https://feeds.feedburner.com/ruanyifeng | 6 | 2026-05-21 | 达标，中文高信号 |
| 少数派 | RSS | https://sspai.com/feed | 10 | 2026-05-23 | 达标，中文科技/效率内容 |
| InfoQ 中文 | RSS | https://www.infoq.cn/feed | 20 | 2026-05-24 | 达标，中文工程/架构内容 |
| 美团技术团队 | RSS | https://tech.meituan.com/feed/ | 10 | 2026-05-15 | 达标，中文工程实践 |
| PingCAP Blog | RSS | https://www.pingcap.com/blog/feed/ | 10 | 2026-05-19 | 达标，数据库/基础设施 |
| Solidot | RSS | https://www.solidot.org/index.rss | 20 | 2026-05-24 | 达标，中文科技新闻 |

## GitHub Release 源

GitHub release Atom 源格式稳定，适合作为 M1 的第一批 source preset。模板：`https://github.com/{owner}/{repo}/releases.atom`。

当前产品决策：这些源保留在 source directory，但默认不启用。它们适合后续“关注某个 repo / 产品”的专项 Lens，不适合默认首页。

| 名称 | URL | 条目数 | 最新日期 | 质量结论 |
| --- | --- | ---: | --- | --- |
| Next.js | https://github.com/vercel/next.js/releases.atom | 10 | 2026-05-24 | 达标 |
| React | https://github.com/facebook/react/releases.atom | 10 | 2026-05-06 | 达标 |
| Node.js | https://github.com/nodejs/node/releases.atom | 10 | 2026-05-21 | 达标 |
| TypeScript | https://github.com/microsoft/TypeScript/releases.atom | 10 | 2026-04-17 | 达标 |
| pnpm | https://github.com/pnpm/pnpm/releases.atom | 10 | 2026-05-24 | 达标 |
| Vite | https://github.com/vitejs/vite/releases.atom | 10 | 2026-05-21 | 达标 |
| Vitest | https://github.com/vitest-dev/vitest/releases.atom | 10 | 2026-05-20 | 达标 |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss/releases.atom | 10 | 2026-05-08 | 达标 |
| ESLint | https://github.com/eslint/eslint/releases.atom | 10 | 2026-05-15 | 达标 |
| Playwright | https://github.com/microsoft/playwright/releases.atom | 10 | 2026-05-22 | 达标 |
| Drizzle ORM | https://github.com/drizzle-team/drizzle-orm/releases.atom | 10 | 2026-05-18 | 达标 |
| Turborepo | https://github.com/vercel/turborepo/releases.atom | 10 | 2026-05-22 | 达标 |
| Bun | https://github.com/oven-sh/bun/releases.atom | 10 | 2026-05-13 | 达标 |
| Deno | https://github.com/denoland/deno/releases.atom | 10 | 2026-05-22 | 达标 |
| Supabase | https://github.com/supabase/supabase/releases.atom | 10 | 2026-05-07 | 达标 |
| LangChain JS | https://github.com/langchain-ai/langchainjs/releases.atom | 10 | 2026-05-21 | 达标 |
| OpenAI Node SDK | https://github.com/openai/openai-node/releases.atom | 10 | 2026-05-21 | 达标 |
| OpenAI Python SDK | https://github.com/openai/openai-python/releases.atom | 10 | 2026-05-21 | 达标 |
| Anthropic TypeScript SDK | https://github.com/anthropics/anthropic-sdk-typescript/releases.atom | 10 | 2026-05-21 | 达标 |

## M2 免费 API 源

这些都能执行，但不建议塞进 M1 Feed Adapter；应该走 Public API Adapter。

| 名称 | 类型 | URL | 结果 | 质量结论 |
| --- | --- | --- | --- | --- |
| Hacker News Top Stories | JSON API | https://hacker-news.firebaseio.com/v0/topstories.json | 500 ids | 达标 |
| Hacker News New Stories | JSON API | https://hacker-news.firebaseio.com/v0/newstories.json | 500 ids | 达标 |
| Hacker News Best Stories | JSON API | https://hacker-news.firebaseio.com/v0/beststories.json | 500 ids | 待 M2 adapter 复验 |
| Hacker News Item Detail | JSON API | https://hacker-news.firebaseio.com/v0/item/{id}.json | JSON object | 待 M2 adapter 复验，可拿 score、descendants、by、time、url |
| npm Registry React | JSON API | https://registry.npmjs.org/react | JSON object | 达标 |
| npm Registry Next | JSON API | https://registry.npmjs.org/next | JSON object | 达标 |
| PyPI FastAPI | JSON API | https://pypi.org/pypi/fastapi/json | JSON object | 达标 |
| PyPI LangChain | JSON API | https://pypi.org/pypi/langchain/json | JSON object | 达标 |

## 可选增强源

这些能执行，但默认不开。原因通常是噪声更高、不是官方原始源，或需要更强过滤。

| 名称 | 类型 | URL | 条目数 | 最新日期 | 处理建议 |
| --- | --- | --- | ---: | --- | --- |
| HNRSS Frontpage | RSS | https://hnrss.org/frontpage | 20 | 2026-05-24 | 可用于 HN 过滤增强，但核心依赖用 HN 官方 RSS/API |
| Krebs on Security | RSS | https://krebsonsecurity.com/feed/ | 10 | 2026-05-22 | 安全 Lens 可选 |
| V2EX | Atom | https://www.v2ex.com/index.xml | 50 | 2026-05-24 | 中文社区源，需过滤节点和关键词 |
| 开源中国资讯 | RSS | https://www.oschina.net/news/rss | 50 | 2026-05-23 | 中文资讯源，需去噪 |
| DEV.to AI Tag | RSS | https://dev.to/feed/tag/ai | 12 | 2026-05-24 | 噪声偏高，需评分过滤 |
| DEV.to JavaScript Tag | RSS | https://dev.to/feed/tag/javascript | 12 | 2026-05-24 | 噪声偏高，需评分过滤 |

## 暂不接入

| 名称 | 候选 URL | 原因 |
| --- | --- | --- |
| OpenAI News RSS | https://openai.com/news/rss.xml | 官方页面有新闻内容，但当前本机校验出现 TLS handshake / timeout，未纳入可执行源 |
| Anthropic News RSS | https://www.anthropic.com/news/rss.xml | 返回 404 |
| Google DeepMind Blog RSS | https://deepmind.google/discover/blog/rss.xml | 返回 404 或请求超时 |
| Mistral AI News RSS | https://mistral.ai/news/rss.xml | 返回 404 |
| Cohere Blog RSS | https://cohere.com/blog/rss.xml | 返回 HTML，不是 RSS/Atom |
| LangChain Blog RSS | https://blog.langchain.com/rss/ | 跳转到 HTML，不是 RSS/Atom；先用 GitHub release 源 |
| LlamaIndex Blog RSS | https://www.llamaindex.ai/blog/rss.xml | 返回 404 |
| Weights & Biases RSS | https://wandb.ai/site/rss.xml | 返回 404 |
| Stack Overflow tag feeds | `https://stackoverflow.com/feeds/tag?...` | 当前环境返回 403 / Cloudflare 验证，不作为可靠免费源 |
| Supabase Changelog RSS | https://supabase.com/changelog/rss.xml | 返回 404；先用 GitHub release 源 |
| 阮一峰博客 atom | https://www.ruanyifeng.com/blog/atom.xml | 当前环境返回 403；用 FeedBurner 源替代 |

## M1 建议首批启用

首批不要一次开启全部默认/release 源。建议用约 14 个覆盖主要 Lens：

- 社区：Hacker News RSS、Lobsters RSS。
- AI / 模型生态：Hugging Face Blog、Google AI Blog、AWS Machine Learning Blog、Ollama Blog。
- 基础设施/工程：Cloudflare Blog。
- 研究：arXiv cs.AI、arXiv cs.CL、arXiv cs.LG。
- 中文：阮一峰周刊、InfoQ 中文、美团技术团队、Solidot。
