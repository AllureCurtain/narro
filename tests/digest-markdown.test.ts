import { describe, expect, test } from "vitest";
import { parseDigestMarkdown } from "@/lib/digest/markdown";

describe("digest markdown parser", () => {
  test("parses sections, bullets, and citation indexes", () => {
    const document = parseDigestMarkdown(
      "## 今日重点\n- [1] AI coding workspace 正在升温。\n- [2][3] 模型工具链变化值得关注。\n\n## 值得继续跟踪\n- [4] 开源运行时继续迭代。",
      4
    );

    expect(document.sections).toHaveLength(2);
    expect(document.sections[0]).toMatchObject({
      title: "今日重点",
      bullets: [
        { references: [1], text: "AI coding workspace 正在升温。" },
        { references: [2, 3], text: "模型工具链变化值得关注。" }
      ]
    });
    expect(document.referenceIndexes).toEqual([1, 2, 3, 4]);
    expect(document.invalidReferences).toEqual([]);
  });

  test("reports citations that do not have matching articles", () => {
    const document = parseDigestMarkdown("## 今日重点\n- [1] 正常引用。\n- [5] 缺失引用。", 2);

    expect(document.invalidReferences).toEqual([5]);
  });
});
