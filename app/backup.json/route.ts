import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { exportWorkspaceBackup } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const backup = await exportWorkspaceBackup(getDatabase());
  return NextResponse.json(backup, {
    headers: {
      "content-disposition": `attachment; filename="narro-backup-${backup.exportedAt.slice(0, 10)}.json"`
    }
  });
}
