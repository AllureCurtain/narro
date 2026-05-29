import type { CategoryId } from "@/lib/rankings/category-board";

export const rankingBoardSourceIdsByCategory: Record<CategoryId, string[]> = {
  "ai-models": ["hugging-face-blog", "google-ai-blog", "aws-machine-learning-blog", "ollama-blog"],
  "developer-community": ["hacker-news-rss", "lobsters-rss"],
  "engineering-open-source": [
    "github-engineering",
    "react-blog",
    "nextjs-blog",
    "nodejs-blog",
    "nodejs-releases",
    "typescript-blog",
    "tailwind-css-blog",
    "cloudflare-blog"
  ],
  "product-platform": ["github-changelog", "vercel-changelog", "stripe-blog", "apple-developer-news"],
  "chinese-tech": ["ruanyifeng-weekly", "sspai", "infoq-cn", "meituan-tech", "solidot"]
};

export const rankingBoardSourceIds = [
  ...rankingBoardSourceIdsByCategory["developer-community"],
  ...rankingBoardSourceIdsByCategory["ai-models"],
  ...rankingBoardSourceIdsByCategory["engineering-open-source"],
  ...rankingBoardSourceIdsByCategory["product-platform"],
  ...rankingBoardSourceIdsByCategory["chinese-tech"]
].filter((sourceId, index, sourceIds) => sourceIds.indexOf(sourceId) === index);

export const rankingBoardSourceIdSet = new Set<string>(rankingBoardSourceIds);
