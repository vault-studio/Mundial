"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/sources";

type Status = {
  loading: boolean;
  error?: string;
  rows?: number;
  outputFile?: string;
};

export default function ExtraerPage() {
  const [status, setStatus] = useState<Record<string, Status>>({});

  async function handleExtract(id: string) {
    setStatus((s) => ({ ...s, [id]: { loading: true } }));
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus((s) => ({ ...s, [id]: { loading: false, error: data.error } }));
        return;
      }
      setStatus((s) => ({
        ...s,
        [id]: { loading: false, rows: data.rows, outputFile: data.outputFile },
      }));
    } catch (e) {
      setStatus((s) => ({
        ...s,
        [id]: { loading: false, error: e instanceof Error ? e.message : "Error desconocido" },
      }));
    }
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-gradient">Extraer datos</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Cada fuente genera su propio CSV en <code>data/raw/</code>. Solo funciona en local.
        </p>

        <div className="mt-8 grid gap-4">
          {SOURCES.map((source) => {
            const st = status[source.id];
            return (
              <div key={source.id} className="glass glass-hover rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-white underline-offset-4 hover:underline"
                    >
                      {source.name}
                    </a>
                    <p className="mt-1 text-sm text-white/60">{source.description}</p>
                    {st?.error && <p className="mt-2 text-sm text-rose-300">{st.error}</p>}
                    {st?.rows !== undefined && !st.error && (
                      <p className="mt-2 text-sm text-emerald-300">
                        {st.rows} filas guardadas en {st.outputFile}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleExtract(source.id)}
                    disabled={st?.loading}
                    className="glow-accent shrink-0 rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {st?.loading ? "Extrayendo..." : "Extraer"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
