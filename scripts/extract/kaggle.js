// Histórico de partidos internacionales 1872-presente, incluyendo el calendario
// del Mundial 2026 (con marcador NA para los partidos que aún no se jugaron).
// Esta es la misma fuente que respalda el dataset de Kaggle "international-football-
// results-from-1872-to-2017": el repo público de GitHub del propio autor.
const fs = require("fs");
const path = require("path");

const URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";
const OUT_PATH = path.join(__dirname, "..", "..", "data", "raw", "kaggle_results.csv");

async function main() {
  console.log("Descargando histórico de partidos...");
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Fallo al pedir ${URL}: ${res.status}`);
  const csv = await res.text();

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, csv, "utf-8");

  const rows = csv.trim().split("\n").length - 1;
  console.log(`Listo: ${rows} partidos guardados en ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
