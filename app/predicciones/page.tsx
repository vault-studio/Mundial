import fs from "fs";
import path from "path";
import PrediccionesTabs from "@/components/PrediccionesTabs";

function loadPredictions() {
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
      prob_H: Number(entry.prob_H),
      prob_D: Number(entry.prob_D),
      prob_A: Number(entry.prob_A),
    };
  });
}

function loadTorneo() {
  const filePath = path.join(process.cwd(), "data", "processed", "torneo.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export default function PrediccionesPage() {
  const predictions = loadPredictions();
  const torneo = loadTorneo();

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-gradient">Predicciones</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Probabilidades calculadas por el modelo: próximos partidos, grupos y eliminatorias.
        </p>

        <PrediccionesTabs predictions={predictions} torneo={torneo} />
      </div>
    </div>
  );
}
