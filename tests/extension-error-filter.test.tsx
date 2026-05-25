import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import RootLayout, { extensionErrorFilterScript } from "@/app/layout";

describe("development browser noise filter", () => {
  test("installs a narrow chrome-extension error filter before the app body", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Narro</main>
      </RootLayout>
    );

    expect(markup).toContain("Narro");
    expect(extensionErrorFilterScript).toContain("chrome-extension://");
    expect(extensionErrorFilterScript).toContain("stopImmediatePropagation");
    expect(extensionErrorFilterScript).toContain("unhandledrejection");
  });
});
