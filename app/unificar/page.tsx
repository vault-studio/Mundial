"use client";

import { useState } from "react";

type Status = {
  loading: boolean;
  error?: string;
  message?: string;
};

function ActionCard({
  title,
  description,
  buttonLabel,
  endpoint,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  endpoint: string;
}) {
  const [status, setStatus] = useState<Status>({ loading: false });

  async function handleClick() {
    setStatus({ loading: true });
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ loading: false, error: data.error });
        return;
      }
      setStatus({
        loading: false,
        message: data.rows !== undefined ? `${data.rows} filas generadas` : "Listo",
      });
    } catch (e) {
      setStatus({ loading: false, error: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        {status.error && <p className="mt-1 text-sm text-red-600">{status.error}</p>}
        {status.message && !status.error && (
          <p className="mt-1 text-sm text-green-600">{status.message}</p>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={status.loading}
        className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status.loading ? "Procesando..." : buttonLabel}
      </button>
    </div>
  );
}

export default function UnificarPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Unificar y entrenar
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Solo funciona en local. Requiere haber extraído antes los CSV en{" "}
          <code>/extraer</code>.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <ActionCard
            title="Unificar CSV"
            description="Combina data/raw/kaggle_results.csv y data/raw/transfermarkt_squad_values.csv, calcula Elo histórico (partido a partido), forma reciente y valor de plantilla, y genera data/processed/training_data.csv."
            buttonLabel="Unificar"
            endpoint="/api/unify"
          />
          <ActionCard
            title="Entrenar modelo"
            description="Entrena un clasificador (Victoria local / Empate / Victoria visitante) con training_data.csv y genera las predicciones para los partidos sin jugar en data/processed/predictions.csv."
            buttonLabel="Entrenar"
            endpoint="/api/train"
          />
        </div>
      </div>
    </div>
  );
}
