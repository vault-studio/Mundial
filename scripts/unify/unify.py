"""
Unifica los CSV de data/raw/ en un único CSV listo para entrenar.

- kaggle_results.csv: histórico de partidos 1872-presente (incluye el calendario
  del Mundial 2026 con marcador vacío, que es lo que queremos predecir).
- transfermarkt_squad_values.csv: valor de plantilla actual por selección.

El Elo no se lee de un snapshot estático: se recalcula partido a partido con la
misma fórmula pública que usa eloratings.net, así cada fila del histórico tiene
el Elo real que tenían los equipos *antes* de jugar ese partido (evita fuga de
datos del futuro hacia el pasado).
"""
import csv
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "training_data.csv"

INITIAL_ELO = 1500
FORM_WINDOW = 5

TOURNAMENT_K = {
    "FIFA World Cup": 60,
    "FIFA World Cup qualification": 40,
    "Friendly": 20,
}
DEFAULT_K = 40


def k_factor(tournament):
    return TOURNAMENT_K.get(tournament, DEFAULT_K)


def goal_diff_multiplier(goal_diff):
    if goal_diff <= 1:
        return 1.0
    if goal_diff == 2:
        return 1.5
    return (11 + goal_diff) / 8


def load_squad_values():
    path = RAW / "transfermarkt_squad_values.csv"
    values = {}
    if path.exists():
        with open(path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["squad_value_eur"]:
                    values[row["team"]] = float(row["squad_value_eur"])
    return values


def load_matches():
    path = RAW / "kaggle_results.csv"
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    matches = load_matches()
    squad_values = load_squad_values()

    elo = {}
    recent_results = {}  # team -> list of points (0/1/3) en orden cronológico
    rows = []

    for m in matches:
        home, away = m["home_team"], m["away_team"]
        elo.setdefault(home, INITIAL_ELO)
        elo.setdefault(away, INITIAL_ELO)
        recent_results.setdefault(home, [])
        recent_results.setdefault(away, [])

        elo_home_pre = elo[home]
        elo_away_pre = elo[away]
        form_home = sum(recent_results[home][-FORM_WINDOW:]) / max(
            len(recent_results[home][-FORM_WINDOW:]), 1
        )
        form_away = sum(recent_results[away][-FORM_WINDOW:]) / max(
            len(recent_results[away][-FORM_WINDOW:]), 1
        )

        has_score = m["home_score"] not in ("", "NA") and m["away_score"] not in ("", "NA")
        result = None
        if has_score:
            hs, as_ = int(float(m["home_score"])), int(float(m["away_score"]))
            if hs > as_:
                result, w_home, points_home, points_away = "H", 1.0, 3, 0
            elif hs < as_:
                result, w_home, points_home, points_away = "A", 0.0, 0, 3
            else:
                result, w_home, points_home, points_away = "D", 0.5, 1, 1

        sv_home = squad_values.get(home)
        sv_away = squad_values.get(away)

        rows.append(
            {
                "date": m["date"],
                "home_team": home,
                "away_team": away,
                "tournament": m["tournament"],
                "neutral": 1 if m["neutral"] == "TRUE" else 0,
                "elo_home": round(elo_home_pre, 1),
                "elo_away": round(elo_away_pre, 1),
                "elo_diff": round(elo_home_pre - elo_away_pre, 1),
                "form_home": round(form_home, 2),
                "form_away": round(form_away, 2),
                "squad_value_home": sv_home or "",
                "squad_value_away": sv_away or "",
                "squad_value_diff": (sv_home - sv_away) if sv_home and sv_away else "",
                "home_score": hs if has_score else "",
                "away_score": as_ if has_score else "",
                "result": result or "",
            }
        )

        if has_score:
            dr = elo_home_pre - elo_away_pre + (0 if m["neutral"] == "TRUE" else 100)
            we_home = 1 / (10 ** (-dr / 400) + 1)
            goal_diff = abs(hs - as_)
            g = goal_diff_multiplier(goal_diff)
            k = k_factor(m["tournament"])
            delta = k * g * (w_home - we_home)

            elo[home] = elo_home_pre + delta
            elo[away] = elo_away_pre - delta

            recent_results[home].append(points_home)
            recent_results[away].append(points_away)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    trainable = sum(1 for r in rows if r["result"])
    to_predict = len(rows) - trainable
    print(f"Listo: {len(rows)} filas guardadas en {OUT}")
    print(f"  - {trainable} partidos con resultado (para entrenar)")
    print(f"  - {to_predict} partidos sin jugar (para predecir, ej. Mundial 2026)")


if __name__ == "__main__":
    main()
