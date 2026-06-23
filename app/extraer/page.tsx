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
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Extraer datos</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Cada fuente genera su propio CSV en <code>data/raw/</code>. Solo funciona en local.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {SOURCES.map((source) => {
            const st = status[source.id];
            return (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black underline dark:text-zinc-50"
                  >
                    {source.name}
                  </a>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{source.description}</p>
                  {st?.error && <p className="mt-1 text-sm text-red-600">{st.error}</p>}
                  {st?.rows !== undefined && !st.error && (
                    <p className="mt-1 text-sm text-green-600">
                      {st.rows} filas guardadas en {st.outputFile}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleExtract(source.id)}
                  disabled={st?.loading}
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  {st?.loading ? "Extrayendo..." : "Extraer"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
