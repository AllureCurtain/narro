import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/repositories";
import { refreshDueSources } from "@/lib/ingestion/refresh";

declare global {
  // Test-only hook. Production uses the platform fetch implementation.
  var __narroTestRefreshFetcher: typeof fetch | undefined;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expectedSecret = process.env.NARRO_REFRESH_SECRET;
  const providedSecrets = [
    request.headers.get("x-narro-refresh-secret"),
    url.searchParams.get("secret"),
    bearerToken(request.headers.get("authorization"))
  ].filter(Boolean);

  if (expectedSecret && !providedSecrets.includes(expectedSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const database = getDatabase();
  await prepareDatabase(database);

  const results = await refreshDueSources(database, {
    concurrency: numberParam(url.searchParams.get("concurrency"), 4, 1, 8),
    fetcher: globalThis.__narroTestRefreshFetcher,
    limit: numberParam(url.searchParams.get("limit"), 12, 1, 50),
    timeoutMs: numberParam(url.searchParams.get("timeoutMs"), 8000, 1000, 30000)
  });
  const failed = results.filter((result) => !result.ok).length;

  return NextResponse.json({
    ok: failed === 0,
    refreshed: results.length,
    inserted: results.reduce((total, result) => total + result.insertedCount, 0),
    fetched: results.reduce((total, result) => total + result.fetchedCount, 0),
    failed,
    results,
    refreshedAt: new Date().toISOString()
  });
}

function numberParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function bearerToken(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
