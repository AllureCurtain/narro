import { getDatabase } from "@/lib/db/client";
import { exportSourcesToOpml, prepareDatabase } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = getDatabase();
  await prepareDatabase(database);
  const opml = await exportSourcesToOpml(database);

  return new Response(opml, {
    headers: {
      "content-disposition": "attachment; filename=\"narro-sources.opml\"",
      "content-type": "text/x-opml; charset=utf-8"
    }
  });
}
