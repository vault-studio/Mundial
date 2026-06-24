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

TOURNAMENT_WEIGHT = {
    "FIFA World Cup": 1.5,
    "FIFA World Cup qualification": 1.0,
    "Friendly": 0.5,
}
DEFAULT_WEIGHT = 1.0


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
    recent_goals_for = {}  # team -> list de goles marcados, en orden cronológico
    recent_goals_against = {}  # team -> list de goles recibidos
    win_streak = {}  # team -> racha de victorias consecutivas hasta antes de este partido
    h2h = {}  # (equipo_A, equipo_B) ordenados alfabéticamente -> [puntos de A en cada cruce]
    rows = []

    for m in matches:
        home, away = m["home_team"], m["away_team"]
        elo.setdefault(home, INITIAL_ELO)
        elo.setdefault(away, INITIAL_ELO)
        recent_results.setdefault(home, [])
        recent_results.setdefault(away, [])
        recent_goals_for.setdefault(home, [])
        recent_goals_for.setdefault(away, [])
        recent_goals_against.setdefault(home, [])
        recent_goals_against.setdefault(away, [])
        win_streak.setdefault(home, 0)
        win_streak.setdefault(away, 0)

        elo_home_pre = elo[home]
        elo_away_pre = elo[away]
        form_home = sum(recent_results[home][-FORM_WINDOW:]) / max(
            len(recent_results[home][-FORM_WINDOW:]), 1
        )
        form_away = sum(recent_results[away][-FORM_WINDOW:]) / max(
            len(recent_results[away][-FORM_WINDOW:]), 1
        )
        gf_home = sum(recent_goals_for[home][-FORM_WINDOW:]) / max(
            len(recent_goals_for[home][-FORM_WINDOW:]), 1
        )
        ga_home = sum(recent_goals_against[home][-FORM_WINDOW:]) / max(
            len(recent_goals_against[home][-FORM_WINDOW:]), 1
        )
        gf_away = sum(recent_goals_for[away][-FORM_WINDOW:]) / max(
            len(recent_goals_for[away][-FORM_WINDOW:]), 1
        )
        ga_away = sum(recent_goals_against[away][-FORM_WINDOW:]) / max(
            len(recent_goals_against[away][-FORM_WINDOW:]), 1
        )
        streak_home_pre = win_streak[home]
        streak_away_pre = win_streak[away]

        pair_key = tuple(sorted([home, away]))
        pair_history = h2h.get(pair_key, [])  # puntos (0/1/3) del primer equipo del par, por cruce
        invert_points = {0: 3, 1: 1, 3: 0}
        if pair_history:
            points_for_home = (
                pair_history if home == pair_key[0] else [invert_points[p] for p in pair_history]
            )
            h2h_home_score = sum(points_for_home) / len(points_for_home)
        else:
            h2h_home_score = 1.5  # sin historial: neutral (a medio camino entre 0 y 3)
        h2h_matches = len(pair_history)

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
                "goals_for_home": round(gf_home, 2),
                "goals_against_home": round(ga_home, 2),
                "goals_for_away": round(gf_away, 2),
                "goals_against_away": round(ga_away, 2),
                "win_streak_home": streak_home_pre,
                "win_streak_away": streak_away_pre,
                "h2h_home_score": round(h2h_home_score, 2),
                "h2h_matches": h2h_matches,
                "squad_value_home": sv_home or "",
                "squad_value_away": sv_away or "",
                "squad_value_diff": (sv_home - sv_away) if sv_home and sv_away else "",
                "home_score": hs if has_score else "",
                "away_score": as_ if has_score else "",
                "result": result or "",
                "sample_weight": TOURNAMENT_WEIGHT.get(m["tournament"], DEFAULT_WEIGHT),
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
            recent_goals_for[home].append(hs)
            recent_goals_against[home].append(as_)
            recent_goals_for[away].append(as_)
            recent_goals_against[away].append(hs)

            win_streak[home] = streak_home_pre + 1 if result == "H" else 0
            win_streak[away] = streak_away_pre + 1 if result == "A" else 0

            points_first = points_home if home == pair_key[0] else points_away
            h2h.setdefault(pair_key, []).append(points_first)

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
