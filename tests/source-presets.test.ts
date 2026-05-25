import { describe, expect, test } from "vitest";
import {
  getDefaultSourcePresets,
  getSourcePresetsByGroup,
  verifiedFreeSourcePresets
} from "@/lib/sources/presets";

describe("verified free source presets", () => {
  test("provides many free executable source presets without crawler-only entries", () => {
    expect(verifiedFreeSourcePresets.length).toBeGreaterThanOrEqual(70);

    const ids = new Set(verifiedFreeSourcePresets.map((source) => source.id));
    expect(ids.size).toBe(verifiedFreeSourcePresets.length);

    expect(verifiedFreeSourcePresets.every((source) => source.free)).toBe(true);
    expect(verifiedFreeSourcePresets.every((source) => source.verified)).toBe(true);
    expect(verifiedFreeSourcePresets.every((source) => source.access !== "crawler")).toBe(true);
    expect(verifiedFreeSourcePresets.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  test("keeps failed or unstable candidates out of the executable preset list", () => {
    const names = verifiedFreeSourcePresets.map((source) => source.name);

    expect(names).not.toContain("OpenAI News RSS");
    expect(names).not.toContain("Anthropic News RSS");
    expect(names).not.toContain("Stack Overflow JavaScript Tag");
    expect(names).not.toContain("LangChain Blog RSS");
  });

  test("includes key M1 feed presets while keeping release feeds available as non-default presets", () => {
    const names = getDefaultSourcePresets().map((source) => source.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "Hugging Face Blog",
        "arXiv cs.AI",
        "Hacker News RSS",
        "阮一峰周刊",
        "GitHub Release: Next.js",
        "GitHub Release: pnpm"
      ])
    );
  });

  test("prioritizes Hacker News RSS as the default community source before GitHub sources", () => {
    const presets = getDefaultSourcePresets();
    const hackerNewsIndex = presets.findIndex((source) => source.id === "hacker-news-rss");
    const githubChangelogIndex = presets.findIndex((source) => source.id === "github-changelog");
    const nextReleaseIndex = presets.findIndex((source) => source.id === "github-release-nextjs");

    expect(hackerNewsIndex).toBeGreaterThanOrEqual(0);
    expect(githubChangelogIndex).toBeGreaterThanOrEqual(0);
    expect(nextReleaseIndex).toBeGreaterThanOrEqual(0);
    expect(hackerNewsIndex).toBeLessThan(githubChangelogIndex);
    expect(hackerNewsIndex).toBeLessThan(nextReleaseIndex);
  });

  test("groups presets for source directory rendering", () => {
    const groups = getSourcePresetsByGroup();

    expect(groups.default.length).toBeGreaterThan(35);
    expect(groups.release.length).toBeGreaterThan(15);
    expect(groups.api.length).toBeGreaterThanOrEqual(6);
    expect(groups.optional.length).toBeGreaterThanOrEqual(6);
  });
});
