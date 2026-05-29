import { describe, expect, test } from "vitest";
import { rankingBoardSourceIds, rankingBoardSourceIdsByCategory } from "@/lib/rankings/category-source-pack";
import { categoryDefinitions } from "@/lib/rankings/category-board";

describe("category ranking source pack", () => {
  test("covers every visible ranking category with at least two refresh sources", () => {
    expect(Object.keys(rankingBoardSourceIdsByCategory)).toEqual(categoryDefinitions.map((category) => category.id));

    for (const category of categoryDefinitions) {
      expect(rankingBoardSourceIdsByCategory[category.id].length, `${category.id} source count`).toBeGreaterThanOrEqual(2);
    }
  });

  test("deduplicates ranking board refresh source ids in display priority order", () => {
    expect(rankingBoardSourceIds).toEqual([...new Set(rankingBoardSourceIds)]);
    expect(rankingBoardSourceIds.slice(0, 6)).toEqual([
      "hacker-news-rss",
      "lobsters-rss",
      "hugging-face-blog",
      "google-ai-blog",
      "aws-machine-learning-blog",
      "ollama-blog"
    ]);
    expect(rankingBoardSourceIds).toContain("react-blog");
    expect(rankingBoardSourceIds).toContain("github-changelog");
    expect(rankingBoardSourceIds).toContain("infoq-cn");
  });
});
