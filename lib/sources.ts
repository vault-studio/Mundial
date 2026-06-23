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
    id: "footballdata",
    name: "football-data.org",
    url: "https://www.football-data.org",
    description: "Calendario y resultados recientes de selecciones.",
    scriptPath: "scripts/extract/footballdata.js",
    outputFile: "data/raw/footballdata_matches.csv",
  },
  {
    id: "transfermarkt",
    name: "Transfermarkt",
    url: "https://www.transfermarkt.com",
    description: "Valor de plantilla por selección (scraping conservador).",
    scriptPath: "scripts/extract/transfermarkt.js",
    outputFile: "data/raw/transfermarkt_squad_values.csv",
  },
  {
    id: "kaggle",
    name: "Kaggle - International Results",
    url: "https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017",
    description: "Histórico de partidos 1872-2024 (descarga manual, no se scrapea).",
    scriptPath: "scripts/extract/kaggle.js",
    outputFile: "data/raw/kaggle_results.csv",
  },
];
