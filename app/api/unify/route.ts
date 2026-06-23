import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

export async function POST() {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "La unificación solo se ejecuta en local, no en producción." },
      { status: 403 }
    );
  }

  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "unify", "unify.py");

  try {
    const { stdout, stderr } = await execFileAsync("python", [scriptPath], {
      cwd: root,
      timeout: 120_000,
    });

    const outputPath = path.join(root, "data", "processed", "training_data.csv");
    const exists = fs.existsSync(outputPath);
    const rows = exists
      ? fs.readFileSync(outputPath, "utf-8").trim().split("\n").length - 1
      : 0;

    return NextResponse.json({ ok: true, stdout, stderr, rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
