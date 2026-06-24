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
    <div className="glass glass-hover flex items-center justify-between gap-4 rounded-2xl p-5">
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/60">{description}</p>
        {status.error && <p className="mt-2 text-sm text-rose-300">{status.error}</p>}
        {status.message && !status.error && (
          <p className="mt-2 text-sm text-emerald-300">{status.message}</p>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={status.loading}
        className="glow-accent shrink-0 rounded-full bg-indigo-400/90 px-5 py-2 text-sm font-semibold text-indigo-950 transition-all hover:bg-indigo-300 disabled:opacity-50"
      >
        {status.loading ? "Procesando..." : buttonLabel}
      </button>
    </div>
  );
}

export default function UnificarPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-gradient">Unificar y entrenar</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Solo funciona en local. Requiere haber extraído antes los CSV en{" "}
          <code>/extraer</code>.
        </p>

        <div className="mt-8 grid gap-4">
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
          <ActionCard
            title="Generar grupos y eliminatorias"
            description="Reconstruye los 12 grupos del Mundial, calcula la clasificación y simula el cuadro de eliminatorias (dieciseisavos a final) con las predicciones del modelo, en data/processed/torneo.json."
            buttonLabel="Generar"
            endpoint="/api/torneo"
          />
        </div>
      </div>
    </div>
  );
}
