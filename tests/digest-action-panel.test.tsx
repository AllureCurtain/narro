import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DigestActionStatus } from "@/components/digest/digest-action-panel";

describe("digest action status", () => {
  test("shows refresh, inserted, and failed counts", () => {
    render(
      <DigestActionStatus
        state={{
          failedCount: 8,
          insertedCount: 0,
          ok: false,
          refreshedCount: 8,
          message: "已生成本地简报，引用 0 条信息；8 个源刷新失败"
        }}
      />
    );

    expect(screen.getByText("刷新 8 个源")).toBeInTheDocument();
    expect(screen.getByText("新增 0 条")).toBeInTheDocument();
    expect(screen.getByText("失败 8 个")).toBeInTheDocument();
    expect(screen.getByText(/8 个源刷新失败/)).toHaveClass("text-amber-700");
  });
});
