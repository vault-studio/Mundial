"""
Entrena un modelo de clasificación (Victoria local / Empate / Victoria visitante)
con el CSV unificado en data/processed/training_data.csv.

El modelo de producción se entrena SOLO con partidos anteriores al Mundial 2026,
para que los partidos ya jugados del torneo sean una evaluación real fuera de
muestra (si se incluyeran en el entrenamiento, "Resultados" mostraría aciertos
inflados porque el modelo ya los habría visto).

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
from sklearn.metrics import accuracy_score, classification_report

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "processed" / "training_data.csv"
MODEL_PATH = ROOT / "data" / "processed" / "model.joblib"
PREDICTIONS_PATH = ROOT / "data" / "processed" / "predictions.csv"
HISTORICO_PATH = ROOT / "data" / "processed" / "historico_mundial.csv"

WORLD_CUP_2026_START = "2026-01-01"

# "+ goles recientes" fue la única mejora que aportó algo real al probarla contra
# un split temporal (ver scripts/train/experiment.py): peso por torneo y Poisson
# no mejoraron, así que no se incluyen para no añadir complejidad sin beneficio.
FEATURES = [
    "elo_home",
    "elo_away",
    "elo_diff",
    "form_home",
    "form_away",
    "neutral",
    "goals_for_home",
    "goals_against_home",
    "goals_for_away",
    "goals_against_away",
    "win_streak_home",
    "win_streak_away",
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

    has_result = df["result"].notna() & (df["result"] != "")
    is_wc2026 = (df["tournament"] == "FIFA World Cup") & (df["date"] >= WORLD_CUP_2026_START)

    # Entrenamiento: todo lo anterior al Mundial 2026. Los partidos del propio
    # torneo se dejan fuera para que la evaluación en /resultados sea honesta.
    train_df = df[has_result & ~is_wc2026]
    predict_df = df[~has_result]
    wc2026_played = df[has_result & is_wc2026]

    # Holdout temporal (último 10% por fecha) solo para reportar accuracy honesta.
    train_sorted = train_df.sort_values("date")
    cutoff = int(len(train_sorted) * 0.9)
    eval_train, eval_test = train_sorted.iloc[:cutoff], train_sorted.iloc[cutoff:]

    eval_model = HistGradientBoostingClassifier(max_iter=200, random_state=42)
    eval_model.fit(eval_train[FEATURES], eval_train["result"])
    y_pred = eval_model.predict(eval_test[FEATURES])
    print(f"Accuracy en holdout temporal: {accuracy_score(eval_test['result'], y_pred):.3f}")
    print(classification_report(eval_test["result"], y_pred))

    # Modelo de producción: se reentrena con TODO el histórico pre-Mundial 2026
    # (el holdout de arriba es solo para medir, no para quedarse con menos datos).
    model = HistGradientBoostingClassifier(max_iter=200, random_state=42)
    model.fit(train_df[FEATURES], train_df["result"])
    joblib.dump(model, MODEL_PATH)
    print(f"Modelo guardado en {MODEL_PATH}")

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
            f"({aciertos}/{len(out_rows)} aciertos, fuera de muestra)"
        )


if __name__ == "__main__":
    main()
