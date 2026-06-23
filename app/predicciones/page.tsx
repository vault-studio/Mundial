import fs from "fs";
import path from "path";

type Prediction = {
  date: string;
  home_team: string;
  away_team: string;
  tournament: string;
  prob_H: number;
  prob_D: number;
  prob_A: number;
};

function loadPredictions(): Prediction[] {
  const filePath = path.join(process.cwd(), "data", "processed", "predictions.csv");
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  const [header, ...rows] = lines;
  const cols = header.split(",");

  return rows.map((line) => {
    const values = line.split(",");
    const entry: Record<string, string> = {};
    cols.forEach((col, i) => (entry[col] = values[i]));
    return {
      date: entry.date,
      home_team: entry.home_team,
      away_team: entry.away_team,
      tournament: entry.tournament,
      prob_H: Number(entry.prob_H),
      prob_D: Number(entry.prob_D),
      prob_A: Number(entry.prob_A),
    };
  });
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default function PrediccionesPage() {
  const predictions = loadPredictions();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Predicciones</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Probabilidades calculadas por el modelo para los partidos sin jugar.
        </p>

        {predictions.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            Todavía no hay predicciones. Genera <code>data/processed/predictions.csv</code> desde{" "}
            <code>/unificar</code> en local.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {predictions.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-black dark:text-zinc-50">
                    {p.home_team} vs {p.away_team}
                  </span>
                  <span className="text-xs text-zinc-500">{p.date}</span>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <span className="flex-1 rounded bg-zinc-100 px-2 py-1 text-center dark:bg-zinc-800">
                    Local {pct(p.prob_H)}
                  </span>
                  <span className="flex-1 rounded bg-zinc-100 px-2 py-1 text-center dark:bg-zinc-800">
                    Empate {pct(p.prob_D)}
                  </span>
                  <span className="flex-1 rounded bg-zinc-100 px-2 py-1 text-center dark:bg-zinc-800">
                    Visitante {pct(p.prob_A)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
