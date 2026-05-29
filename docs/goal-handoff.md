# Narro Goal Handoff

## 当前项目状态

Narro 当前主路径是“大分类科技热榜”。首页只保留基础功能产品路径：获取最新信息、按五个科技分类浏览榜单、打开原文、标记已读、隐藏噪声文章，以及可选生成今日科技简报。

旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选、信息流工作台不是当前首页主功能，后续不要在没有明确要求时重新加回首页。

## 当前推荐 Goal

```text
请进入 goal 模式，目标是按照 docs/superpowers/plans/2026-05-29-basic-ranking-board-followup.md 完成 Narro 大分类科技热榜基础功能补齐。

重要约束：
- 不要重新 brainstorming。
- 不要重新改产品方向。
- 按文档任务顺序执行。
- 使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务提交一次。
- 不要恢复旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build。
```

## 执行约束

- 优先完成主功能：获取、分类榜单、打开原文、已读、隐藏。
- 简报和 AI 模型设置是增强能力，不要压过分类榜单。
- 不讨论部署、迁移、维护作为当前缺口。
- 不扩大到 Source Directory、Lens 编辑器、语义搜索、聊天问答。
- 每个任务完成后运行对应测试。
- 最后一轮必须运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
