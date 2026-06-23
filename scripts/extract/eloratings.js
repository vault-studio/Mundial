// Extrae el ranking Elo actual de selecciones desde eloratings.net
// Fuente pública: World.tsv (ranking actual) + en.teams.tsv (nombres de equipos)
const fs = require("fs");
const path = require("path");

const BASE = "https://www.eloratings.net";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MundialDataBot/1.0)" };
const OUT_PATH = path.join(__dirname, "..", "..", "data", "raw", "elo_ratings.csv");

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Fallo al pedir ${url}: ${res.status}`);
  return res.text();
}

function parseTeamNames(tsv) {
  const names = {};
  for (const line of tsv.split("\n")) {
    if (!line.trim()) continue;
    const [code, name] = line.split("\t");
    if (code && name) names[code] = name;
  }
  return names;
}

function parseWorldRanking(tsv) {
  const rows = [];
  for (const line of tsv.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    const [rank, , code, elo] = cols;
    rows.push({ rank: Number(rank), code, elo: Number(elo) });
  }
  return rows;
}

function toCsv(rows) {
  const header = "rank,code,team,elo";
  const lines = rows.map((r) => `${r.rank},${r.code},"${r.team}",${r.elo}`);
  return [header, ...lines].join("\n") + "\n";
}

async function main() {
  console.log("Descargando ranking Elo desde eloratings.net...");
  const [worldTsv, namesTsv] = await Promise.all([
    fetchText(`${BASE}/World.tsv`),
    fetchText(`${BASE}/en.teams.tsv`),
  ]);

  const names = parseTeamNames(namesTsv);
  const ranking = parseWorldRanking(worldTsv).map((r) => ({
    ...r,
    team: names[r.code] || r.code,
  }));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, toCsv(ranking), "utf-8");
  console.log(`Listo: ${ranking.length} selecciones guardadas en ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
