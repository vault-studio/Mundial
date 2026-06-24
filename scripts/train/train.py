"""
Entrena un modelo de clasificación (Victoria local / Empate / Victoria visitante)
con el CSV unificado en data/processed/training_data.csv.

Genera dos salidas para el Mundial 2026:
- predictions.csv: partidos sin jugar, con las probabilidades del modelo.
- historico_mundial.csv: partidos ya jugados, con el resultado real, lo que
  predijo el modelo y si acertó o no.
"""
import csv
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "processed" / "training_data.csv"
MODEL_PATH = ROOT / "data" / "processed" / "model.joblib"
PREDICTIONS_PATH = ROOT / "data" / "processed" / "predictions.csv"
HISTORICO_PATH = ROOT / "data" / "processed" / "historico_mundial.csv"

WORLD_CUP_2026_START = "2026-01-01"

FEATURES = [
    "elo_home",
    "elo_away",
    "elo_diff",
    "form_home",
    "form_away",
    "neutral",
    "squad_value_home",
    "squad_value_away",
    "squad_value_diff",
]


def load_data():
    df = pd.read_csv(DATA_PATH)
    for col in ["squad_value_home", "squad_value_away", "squad_value_diff"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df


def write_csv(path, rows):
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main():
    df = load_data()

    train_df = df[df["result"].notna() & (df["result"] != "")]
    predict_df = df[df["result"].isna() | (df["result"] == "")]

    X = train_df[FEATURES]
    y = train_df["result"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    model = HistGradientBoostingClassifier(max_iter=200, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(f"Accuracy en test: {accuracy_score(y_test, y_pred):.3f}")
    print(classification_report(y_test, y_pred))

    joblib.dump(model, MODEL_PATH)
    print(f"Modelo guardado en {MODEL_PATH}")

    # Partidos del Mundial 2026 sin jugar -> predictions.csv
    if not predict_df.empty:
        probs = model.predict_proba(predict_df[FEATURES])
        classes = model.classes_
        out_rows = []
        for (_, row), prob_row in zip(predict_df.iterrows(), probs):
            entry = {
                "date": row["date"],
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "tournament": row["tournament"],
            }
            for cls, p in zip(classes, prob_row):
                entry[f"prob_{cls}"] = round(float(p), 4)
            out_rows.append(entry)

        write_csv(PREDICTIONS_PATH, out_rows)
        print(f"Predicciones guardadas en {PREDICTIONS_PATH} ({len(out_rows)} partidos)")

    # Partidos del Mundial 2026 ya jugados -> historico_mundial.csv (acierto del modelo)
    wc2026_played = train_df[
        (train_df["tournament"] == "FIFA World Cup") & (train_df["date"] >= WORLD_CUP_2026_START)
    ]
    if not wc2026_played.empty:
        probs = model.predict_proba(wc2026_played[FEATURES])
        predicted = model.predict(wc2026_played[FEATURES])
        classes = model.classes_
        out_rows = []
        for (_, row), prob_row, pred in zip(wc2026_played.iterrows(), probs, predicted):
            entry = {
                "date": row["date"],
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "home_score": row["home_score"],
                "away_score": row["away_score"],
                "result": row["result"],
                "predicted": pred,
                "correct": int(pred == row["result"]),
            }
            for cls, p in zip(classes, prob_row):
                entry[f"prob_{cls}"] = round(float(p), 4)
            out_rows.append(entry)

        out_rows.sort(key=lambda r: r["date"])
        write_csv(HISTORICO_PATH, out_rows)
        aciertos = sum(r["correct"] for r in out_rows)
        print(
            f"Histórico Mundial 2026 guardado en {HISTORICO_PATH} "
            f"({aciertos}/{len(out_rows)} aciertos)"
        )


if __name__ == "__main__":
    main()
