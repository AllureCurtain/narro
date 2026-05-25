import { existsSync } from "node:fs";
import path from "node:path";
import nextConfig from "@/next.config";
import { describe, expect, test } from "vitest";

describe("runtime and data-source polish", () => {
  test("disables the development badge that appears in the lower-left corner", () => {
    expect(nextConfig.devIndicators).toBe(false);
  });

  test("pins Turbopack to the project root for pnpm workspaces", () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd());
  });

  test("allows local browser origins used during development to load Next assets", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(expect.arrayContaining(["127.0.0.1", "198.18.0.1"]));
  });

  test("allows local forwarded hosts for development Server Actions", () => {
    expect(nextConfig.experimental?.serverActions?.allowedOrigins).toEqual(
      expect.arrayContaining(["127.0.0.1", "127.0.0.1:3001", "localhost", "localhost:3001", "198.18.0.1:3001"])
    );
  });

  test("provides an app icon so browser requests do not fall through to 404", () => {
    expect(existsSync(path.join(process.cwd(), "app", "icon.svg"))).toBe(true);
  });

  test("documents concrete source candidates for the next data milestone", async () => {
    const { dataSourceCandidates, mockSources } = await import("@/lib/mock-data");

    expect(dataSourceCandidates.map((candidate) => candidate.name)).toEqual(
      expect.arrayContaining(["已验证免费源目录", "GitHub Releases", "Hacker News", "arXiv"])
    );
    expect(dataSourceCandidates.map((candidate) => candidate.name)).not.toContain("产品 Changelog");
    expect(mockSources.every((source) => source.type !== "webpage")).toBe(true);
    expect(mockSources.map((source) => source.url)).not.toContain("https://www.anthropic.com/news/rss.xml");
  });
});
