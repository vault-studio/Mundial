// Scraping conservador de valor de plantilla por selección en Transfermarkt.
// Estrategia: 1) buscar el equipo nacional con el buscador rápido de Transfermarkt,
// 2) entrar a su página y leer el valor total de mercado.
// Rate limit alto (4s entre requests) y solo lectura de páginas públicas.
const fs = require("fs");
const path = require("path");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};
const DELAY_MS = 4000;
const ELO_PATH = path.join(__dirname, "..", "..", "data", "raw", "elo_ratings.csv");
const OUT_PATH = path.join(__dirname, "..", "..", "data", "raw", "transfermarkt_squad_values.csv");
const TOP_N = Number(process.env.TM_TOP_N || 50);

const YOUTH_RE = /-u\d{2}\b/;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readTeamNames() {
  if (!fs.existsSync(ELO_PATH)) {
    throw new Error(`Falta ${ELO_PATH}. Extrae primero eloratings.net.`);
  }
  const lines = fs.readFileSync(ELO_PATH, "utf-8").trim().split("\n").slice(1);
  return lines.slice(0, TOP_N).map((line) => {
    const match = line.match(/^\d+,[A-Z]+,"([^"]+)"/);
    return match ? match[1] : null;
  }).filter(Boolean);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findNationalTeamSlug(teamName) {
  const url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(teamName)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Búsqueda falló para ${teamName}: ${res.status}`);
  const html = await res.text();
  // Busca el enlace exacto "<a title="Equipo" href=".../verein/ID">Equipo</a>"
  // que es como Transfermarkt marca el resultado dentro de su tabla de búsqueda.
  const exactRe = new RegExp(
    `<a title="${escapeRegex(teamName)}" href="(/[a-z0-9-]+/startseite/verein/(\\d+))">${escapeRegex(teamName)}</a>`
  );
  const exact = html.match(exactRe);
  if (exact) return { href: exact[1], id: exact[2] };

  const matches = [...html.matchAll(/href="(\/[a-z0-9-]+\/startseite\/verein\/(\d+))"/g)];
  const candidate = matches.find(([href]) => !YOUTH_RE.test(href));
  return candidate ? { href: candidate[1], id: candidate[2] } : null;
}

async function getSquadValue(href) {
  const url = `https://www.transfermarkt.com${href}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Página falló (${url}): ${res.status}`);
  const html = await res.text();
  const valueMatch = html.match(/data-header__market-value-wrapper">.*?€<\/span>([\d.,]+)<span class="waehrung">(m|bn|Th\.)/s);
  if (!valueMatch) return null;
  const [, rawValue, unit] = valueMatch;
  const num = parseFloat(rawValue.replace(",", ""));
  const multiplier = unit === "bn" ? 1_000_000_000 : unit === "m" ? 1_000_000 : 1_000;
  return Math.round(num * multiplier);
}

function toCsv(rows) {
  const header = "team,squad_value_eur";
  const lines = rows.map((r) => `"${r.team}",${r.squad_value_eur ?? ""}`);
  return [header, ...lines].join("\n") + "\n";
}

async function main() {
  const teams = readTeamNames();
  console.log(`Procesando ${teams.length} selecciones (rate limit ${DELAY_MS}ms)...`);

  const results = [];
  for (const team of teams) {
    try {
      const slug = await findNationalTeamSlug(team);
      if (!slug) {
        console.warn(`No encontrado en Transfermarkt: ${team}`);
        results.push({ team, squad_value_eur: null });
        await sleep(DELAY_MS);
        continue;
      }
      await sleep(DELAY_MS);
      const value = await getSquadValue(slug.href);
      console.log(`${team}: ${value ? `€${value.toLocaleString()}` : "sin dato"}`);
      results.push({ team, squad_value_eur: value });
    } catch (err) {
      console.warn(`Error con ${team}: ${err.message}`);
      results.push({ team, squad_value_eur: null });
    }
    await sleep(DELAY_MS);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, toCsv(results), "utf-8");
  console.log(`Listo: ${results.length} selecciones guardadas en ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
