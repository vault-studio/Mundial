import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { SOURCES } from "@/lib/sources";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "La extracción solo se ejecuta en local, no en producción." },
      { status: 403 }
    );
  }

  const { id } = await req.json();
  const source = SOURCES.find((s) => s.id === id);
  if (!source) {
    return NextResponse.json({ error: "Fuente desconocida." }, { status: 404 });
  }

  const root = process.cwd();
  const scriptPath = path.join(root, source.scriptPath);

  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      { error: `Script no encontrado: ${source.scriptPath}` },
      { status: 404 }
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync("node", [scriptPath], {
      cwd: root,
      timeout: 15 * 60_000, // Transfermarkt con rate limiting conservador puede tardar varios minutos
      maxBuffer: 10 * 1024 * 1024,
    });

    const outputPath = path.join(root, source.outputFile);
    const exists = fs.existsSync(outputPath);
    const rows = exists
      ? fs.readFileSync(outputPath, "utf-8").trim().split("\n").length - 1
      : 0;

    return NextResponse.json({ ok: true, stdout, stderr, rows, outputFile: source.outputFile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
