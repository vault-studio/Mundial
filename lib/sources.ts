export type Source = {
  id: string;
  name: string;
  url: string;
  description: string;
  scriptPath: string; // relative to project root
  outputFile: string; // relative to project root
};

export const SOURCES: Source[] = [
  {
    id: "elo",
    name: "World Football Elo Ratings",
    url: "https://www.eloratings.net",
    description: "Ranking Elo actualizado de selecciones nacionales.",
    scriptPath: "scripts/extract/eloratings.js",
    outputFile: "data/raw/elo_ratings.csv",
  },
  {
    id: "transfermarkt",
    name: "Transfermarkt",
    url: "https://www.transfermarkt.com",
    description: "Valor de plantilla por selección (scraping conservador, top 50 por Elo).",
    scriptPath: "scripts/extract/transfermarkt.js",
    outputFile: "data/raw/transfermarkt_squad_values.csv",
  },
  {
    id: "kaggle",
    name: "Histórico de partidos (1872-2026)",
    url: "https://github.com/martj42/international_results",
    description:
      "Resultados históricos y calendario del Mundial 2026 (incluye partidos por jugar).",
    scriptPath: "scripts/extract/kaggle.js",
    outputFile: "data/raw/kaggle_results.csv",
  },
];
