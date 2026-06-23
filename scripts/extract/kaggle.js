// Kaggle no se scrapea: hay que descargar el dataset manualmente y colocarlo en
// data/raw/kaggle_results.csv. Este script solo valida que el archivo exista.
const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "..", "data", "raw", "kaggle_results.csv");

if (!fs.existsSync(OUT_PATH)) {
  console.error(
    `Falta el archivo ${OUT_PATH}. Descárgalo manualmente desde Kaggle y colócalo ahí.`
  );
  process.exit(1);
}

console.log(`OK: ${OUT_PATH} ya existe.`);
