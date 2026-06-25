import fs from "fs";
import path from "path";

type Historico = {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: "H" | "D" | "A";
  predicted: "H" | "D" | "A";
  correct: boolean;
  prob_H: number;
  prob_D: number;
  prob_A: number;
};

const LABEL: Record<string, string> = { H: "Local", D: "Empate", A: "Visitante" };

function loadHistorico(): Historico[] {
  const filePath = path.join(process.cwd(), "data", "processed", "historico_mundial.csv");
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
      home_score: Number(entry.home_score),
      away_score: Number(entry.away_score),
      result: entry.result as Historico["result"],
      predicted: entry.predicted as Historico["predicted"],
      correct: entry.correct === "1",
      prob_H: Number(entry.prob_H),
      prob_D: Number(entry.prob_D),
      prob_A: Number(entry.prob_A),
    };
  });
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function predictedProb(h: Historico) {
  return h[`prob_${h.predicted}` as "prob_H" | "prob_D" | "prob_A"];
}

function realProb(h: Historico) {
  return h[`prob_${h.result}` as "prob_H" | "prob_D" | "prob_A"];
}

function average(nums: number[]) {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function ResultadosPage() {
  const historico = loadHistorico().slice().reverse();
  const aciertos = historico.filter((h) => h.correct).length;
  const avgAciertos = average(historico.filter((h) => h.correct).map(predictedProb));
  const avgFallos = average(historico.filter((h) => !h.correct).map(predictedProb));

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-gradient">Resultados</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Partidos del Mundial 2026 ya jugados: resultado real vs. lo que predijo el modelo.
        </p>

        {historico.length === 0 ? (
          <p className="glass mt-8 rounded-2xl p-6 text-sm text-white/60">
            Todavía no hay partidos jugados procesados. Genera{" "}
            <code>data/processed/historico_mundial.csv</code> desde <code>/unificar</code> en
            local.
          </p>
        ) : (
          <>
            <div className="glass mt-6 flex items-center justify-between rounded-2xl p-5">
              <span className="text-sm text-white/60">Aciertos del modelo hasta ahora</span>
              <span className="text-2xl font-bold text-white">
                {aciertos}/{historico.length}{" "}
                <span className="text-base font-medium text-white/50">
                  ({Math.round((aciertos / historico.length) * 100)}%)
                </span>
              </span>
            </div>

            <div className="glass mt-3 flex items-center justify-between rounded-2xl p-5">
              <span className="text-sm text-white/60">Media de confianza: aciertos y fallos</span>
              <span className="flex gap-2 text-sm font-semibold">
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-300">
                  ✓ {avgAciertos !== null ? pct(avgAciertos) : "–"}
                </span>
                <span className="rounded-full bg-rose-400/20 px-3 py-1 text-rose-300">
                  ✗ {avgFallos !== null ? pct(avgFallos) : "–"}
                </span>
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {historico.map((h, i) => (
                <div
                  key={i}
                  className={`glass glass-hover rounded-2xl p-5 ${
                    h.correct ? "glass-correct" : "glass-incorrect"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">
                      {h.home_team} <span className="text-white/40">{h.home_score}-{h.away_score}</span>{" "}
                      {h.away_team}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                        {h.date}
                      </span>
                      {h.correct ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                          ✓ {pct(predictedProb(h))}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-rose-400/20 px-3 py-1 text-sm font-semibold text-rose-300">
                          ✗ {pct(predictedProb(h))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/60">
                    <span>
                      Real: <span className="font-medium text-white">{LABEL[h.result]}</span>{" "}
                      ({pct(realProb(h))})
                    </span>
                    <span className="text-white/30">·</span>
                    <span>
                      Predicción del modelo:{" "}
                      <span className="font-medium text-white">{LABEL[h.predicted]}</span>{" "}
                      ({pct(predictedProb(h))})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
