"""
Compara variantes del modelo de forma controlada:

1. baseline           - features actuales (Elo, forma, valor de plantilla), split aleatorio.
2. split_temporal      - mismas features, pero evaluado con split temporal (más honesto).
3. + goles_recientes   - añade goles a favor/en contra y racha de victorias.
4. + peso_torneo       - pondera menos los amistosos al entrenar (sample_weight).
5. combinada           - goles_recientes + peso_torneo juntos.
6. poisson             - modelo de Poisson para goles, derivando P(H/D/A).

Cada variante se mide con dos métricas:
- Accuracy en un holdout temporal (último 10% de partidos por fecha, excluyendo Mundial 2026).
- Accuracy real en los partidos ya jugados del Mundial 2026 (el test que más nos importa).
"""
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split
from scipy.stats import poisson

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "processed" / "training_data.csv"
WORLD_CUP_2026_START = "2026-01-01"

BASE_FEATURES = [
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
GOAL_FEATURES = [
    "goals_for_home",
    "goals_against_home",
    "goals_for_away",
    "goals_against_away",
    "win_streak_home",
    "win_streak_away",
]


def load_data():
    df = pd.read_csv(DATA_PATH)
    for col in ["squad_value_home", "squad_value_away", "squad_value_diff"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0) / 1_000_000_000
    df["elo_home"] = df["elo_home"] / 1000
    df["elo_away"] = df["elo_away"] / 1000
    df["elo_diff"] = df["elo_diff"] / 1000
    return df


def time_holdout(train_df):
    played = train_df[train_df["date"] < WORLD_CUP_2026_START].sort_values("date")
    cutoff = int(len(played) * 0.9)
    return played.iloc[:cutoff], played.iloc[cutoff:]


def eval_classifier(features, sample_weight_col=None, label=""):
    df = load_data()
    train_df = df[df["result"].notna() & (df["result"] != "")]
    wc2026 = train_df[
        (train_df["tournament"] == "FIFA World Cup") & (train_df["date"] >= WORLD_CUP_2026_START)
    ]

    time_train, time_test = time_holdout(train_df)

    sw = time_train[sample_weight_col].values if sample_weight_col else None
    model = HistGradientBoostingClassifier(max_iter=200, random_state=42)
    model.fit(time_train[features], time_train["result"], sample_weight=sw)

    time_acc = accuracy_score(time_test["result"], model.predict(time_test[features]))
    time_ll = log_loss(
        time_test["result"], model.predict_proba(time_test[features]), labels=model.classes_
    )

    wc_acc = None
    if not wc2026.empty:
        wc_acc = accuracy_score(wc2026["result"], model.predict(wc2026[features]))

    print(
        f"{label:28s} time_acc={time_acc:.3f}  time_logloss={time_ll:.3f}  "
        f"wc2026_acc={wc_acc:.3f} ({int(wc_acc * len(wc2026))}/{len(wc2026)})"
    )
    return time_acc, wc_acc


def fit_poisson_goals(time_train, features):
    from sklearn.linear_model import PoissonRegressor

    home_model = PoissonRegressor(max_iter=1000)
    home_model.fit(time_train[features], time_train["home_score"])
    away_model = PoissonRegressor(max_iter=1000)
    away_model.fit(time_train[features], time_train["away_score"])
    return home_model, away_model


def poisson_outcome_probs(lam_home, lam_away, max_goals=10):
    h = poisson.pmf(np.arange(max_goals + 1), lam_home)
    a = poisson.pmf(np.arange(max_goals + 1), lam_away)
    grid = np.outer(h, a)
    p_home = np.tril(grid, -1).sum()
    p_draw = np.trace(grid)
    p_away = np.triu(grid, 1).sum()
    return p_home, p_draw, p_away


def eval_poisson(features, label="poisson"):
    df = load_data()
    train_df = df[df["result"].notna() & (df["result"] != "")]
    wc2026 = train_df[
        (train_df["tournament"] == "FIFA World Cup") & (train_df["date"] >= WORLD_CUP_2026_START)
    ]
    time_train, time_test = time_holdout(train_df)

    home_model, away_model = fit_poisson_goals(time_train, features)

    def predict_df(d):
        lam_home = home_model.predict(d[features])
        lam_away = away_model.predict(d[features])
        preds, probs = [], []
        for lh, la in zip(lam_home, lam_away):
            ph, pd_, pa = poisson_outcome_probs(lh, la)
            probs.append([pa, pd_, ph])  # orden alfabético A,D,H para log_loss labels
            preds.append(["A", "D", "H"][int(np.argmax([pa, pd_, ph]))])
        return np.array(preds), np.array(probs)

    preds_test, probs_test = predict_df(time_test)
    time_acc = accuracy_score(time_test["result"], preds_test)
    time_ll = log_loss(time_test["result"], probs_test, labels=["A", "D", "H"])

    wc_acc = None
    if not wc2026.empty:
        preds_wc, _ = predict_df(wc2026)
        wc_acc = accuracy_score(wc2026["result"], preds_wc)

    print(
        f"{label:28s} time_acc={time_acc:.3f}  time_logloss={time_ll:.3f}  "
        f"wc2026_acc={wc_acc:.3f} ({int(wc_acc * len(wc2026))}/{len(wc2026)})"
    )


def eval_recency_and_tuning():
    """7-9. Pondera partidos recientes más que los antiguos, y ajusta hiperparámetros."""
    df = load_data()
    train_df = df[df["result"].notna() & (df["result"] != "")]
    wc2026 = train_df[
        (train_df["tournament"] == "FIFA World Cup") & (train_df["date"] >= WORLD_CUP_2026_START)
    ]
    time_train, time_test = time_holdout(train_df)

    years_ago = (pd.to_datetime("2025-01-01") - pd.to_datetime(time_train["date"])).dt.days / 365
    recency_weight = np.exp(-years_ago / 15)  # vida media ~15 años

    for params, label in [
        ({"max_iter": 200, "random_state": 42}, "7. baseline (referencia)"),
        ({"max_iter": 200, "random_state": 42}, "8. + peso por recencia"),
        (
            {"max_iter": 300, "max_depth": 6, "learning_rate": 0.05, "random_state": 42},
            "9. hiperparams ajustados",
        ),
    ]:
        model = HistGradientBoostingClassifier(**params)
        sw = recency_weight.values if "recencia" in label else None
        features = BASE_FEATURES + GOAL_FEATURES
        model.fit(time_train[features], time_train["result"], sample_weight=sw)

        time_acc = accuracy_score(time_test["result"], model.predict(time_test[features]))
        wc_acc = (
            accuracy_score(wc2026["result"], model.predict(wc2026[features]))
            if not wc2026.empty
            else None
        )
        print(
            f"{label:28s} time_acc={time_acc:.3f}  "
            f"wc2026_acc={wc_acc:.3f} ({int(wc_acc * len(wc2026))}/{len(wc2026)})"
        )


def main():
    eval_classifier(BASE_FEATURES, label="1. baseline (split temporal)")
    eval_classifier(BASE_FEATURES + GOAL_FEATURES, label="2. + goles recientes")
    eval_classifier(BASE_FEATURES, sample_weight_col="sample_weight", label="3. + peso por torneo")
    eval_classifier(
        BASE_FEATURES + GOAL_FEATURES,
        sample_weight_col="sample_weight",
        label="4. goles + peso (combinada)",
    )
    eval_poisson(BASE_FEATURES, label="5. poisson (goles)")
    eval_poisson(BASE_FEATURES + GOAL_FEATURES, label="6. poisson + goles")
    eval_recency_and_tuning()


if __name__ == "__main__":
    main()
