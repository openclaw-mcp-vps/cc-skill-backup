import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const scriptPath = path.join(process.cwd(), "scripts", "install.sh");
  const script = await fs.readFile(scriptPath, "utf8");

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
