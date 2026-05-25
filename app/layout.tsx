import type { Metadata } from "next";
import Script from "next/script";
import { AutoRefresh } from "@/components/app-shell/auto-refresh";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narro | 信息工作台",
  description: "Narro 个人信息中枢的 M0 产品骨架"
};

export const extensionErrorFilterScript = `
(() => {
  const isExtensionError = (value) => {
    const text = String(value?.filename || value?.reason?.stack || value?.reason?.message || value?.error?.stack || value?.message || "");
    return text.includes("chrome-extension://");
  };

  window.addEventListener("error", (event) => {
    if (!isExtensionError(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (!isExtensionError(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const extensionErrorFilter =
    process.env.NODE_ENV !== "production" ? (
      <Script
        id="extension-error-filter"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: extensionErrorFilterScript
        }}
      />
    ) : null;

  return (
    <html lang="zh-CN">
      <head>{extensionErrorFilter}</head>
      <body>
        <AutoRefresh intervalMinutes={15} />
        {children}
      </body>
    </html>
  );
}
