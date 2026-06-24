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

  const lines = fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim().length > 0);
  const [header, ...rows] = lines;
  const cols = header.split(",");

  return rows.map((line) => {
    const values = line.split(",");
    const entry: Record<string, string> = {};
    cols.forEach((col, i) => (entry[col] = values[i]?.trim()));
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

const RANK_STYLE = {
  high: "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
  mid: "bg-white/8 text-white/70 border border-white/10",
  low: "bg-rose-400/15 text-rose-300 border border-rose-400/30",
};

function rankStyles(probH: number, probD: number, probA: number) {
  const entries = [
    { key: "H", value: probH },
    { key: "D", value: probD },
    { key: "A", value: probA },
  ].sort((a, b) => b.value - a.value);

  const styleByKey: Record<string, string> = {
    [entries[0].key]: RANK_STYLE.high,
    [entries[1].key]: RANK_STYLE.mid,
    [entries[2].key]: RANK_STYLE.low,
  };

  return styleByKey;
}

export default function PrediccionesPage() {
  const predictions = loadPredictions();

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-gradient">Predicciones</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Probabilidades calculadas por el modelo para los partidos sin jugar.
        </p>

        {predictions.length === 0 ? (
          <p className="glass mt-8 rounded-2xl p-6 text-sm text-white/60">
            Todavía no hay predicciones. Genera <code>data/processed/predictions.csv</code> desde{" "}
            <code>/unificar</code> en local.
          </p>
        ) : (
          <div className="mt-8 grid gap-4">
            {predictions.map((p, i) => {
              const styles = rankStyles(p.prob_H, p.prob_D, p.prob_A);
              return (
                <div key={i} className="glass glass-hover rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {p.home_team} <span className="text-white/40">vs</span> {p.away_team}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                      {p.date}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
                    <span className={`rounded-xl px-2 py-2 text-center ${styles.H}`}>
                      Local {pct(p.prob_H)}
                    </span>
                    <span className={`rounded-xl px-2 py-2 text-center ${styles.D}`}>
                      Empate {pct(p.prob_D)}
                    </span>
                    <span className={`rounded-xl px-2 py-2 text-center ${styles.A}`}>
                      Visitante {pct(p.prob_A)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
