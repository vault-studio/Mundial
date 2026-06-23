import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST() {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "El entrenamiento solo se ejecuta en local, no en producción." },
      { status: 403 }
    );
  }

  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "train", "train.py");

  try {
    const { stdout, stderr } = await execFileAsync("python", [scriptPath], {
      cwd: root,
      timeout: 180_000,
    });
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
