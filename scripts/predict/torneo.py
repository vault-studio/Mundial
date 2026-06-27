"""
Genera el estado completo del Mundial 2026 (grupos + eliminatorias) en
data/processed/torneo.json para que la web lo muestre por pestañas.

- Grupos: los 12 grupos se reconstruyen a partir del propio calendario (cada
  grupo es un conjunto de 4 equipos que solo se enfrentan entre sí). Las
  letras oficiales A-L (GROUP_LETTERS) se tomaron de la clasificación
  publicada en as.com y se asignan emparejando el conjunto de equipos, no
  por orden de aparición.
- Clasificados: 2 primeros de cada grupo + los 8 mejores terceros (por
  puntos, con el promedio de probabilidad de victoria del modelo como
  criterio de desempate, ya que no tenemos diferencia de goles para los
  partidos todavía no jugados).
- Eliminatorias: los 8 cruces entre primero/segundo de grupo que NO dependen
  de qué terceros clasifiquen son los oficiales de la FIFA (FIXED_PAIRS). Los
  otros 8 cruces sí dependen de terceros, así que la lista de candidatos por
  cruce (THIRD_PLACE_SLOTS) también es la oficial - pero la asignación exacta
  de CUÁL tercero concreto le toca a cada slot depende de una tabla de 495
  combinaciones publicada en el Anexo C del reglamento FIFA que no se
  reproduce aquí; se asigna el mejor tercero disponible entre los candidatos
  de cada slot, lo cual puede no coincidir con el sorteo oficial exacto en
  los casos ambiguos. Se marca en la web.
- Cada partido (jugado o no) lleva la probabilidad del modelo. Para
  eliminatorias, que no admiten empate, la probabilidad de empate se
  reparte 50/50 entre ambos equipos para decidir quién avanza.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
MODEL_PATH = PROCESSED / "model.joblib"
TRAINING_PATH = PROCESSED / "training_data.csv"
OUT_PATH = PROCESSED / "torneo.json"

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

ROUND_NAMES = [
    "Dieciseisavos (Ronda de 32)",
    "Octavos de final",
    "Cuartos de final",
    "Semifinales",
    "Final",
]

# Letras oficiales del sorteo (fuente: as.com/resultados/futbol/mundial/clasificacion),
# emparejadas por el conjunto de equipos de cada grupo, no por orden de aparición.
GROUP_LETTERS = {
    frozenset(["Czech Republic", "Mexico", "South Africa", "South Korea"]): "A",
    frozenset(["Bosnia and Herzegovina", "Canada", "Qatar", "Switzerland"]): "B",
    frozenset(["Brazil", "Haiti", "Morocco", "Scotland"]): "C",
    frozenset(["Australia", "Paraguay", "Turkey", "United States"]): "D",
    frozenset(["Curaçao", "Ecuador", "Germany", "Ivory Coast"]): "E",
    frozenset(["Japan", "Netherlands", "Sweden", "Tunisia"]): "F",
    frozenset(["Belgium", "Egypt", "Iran", "New Zealand"]): "G",
    frozenset(["Cape Verde", "Saudi Arabia", "Spain", "Uruguay"]): "H",
    frozenset(["France", "Iraq", "Norway", "Senegal"]): "I",
    frozenset(["Algeria", "Argentina", "Austria", "Jordan"]): "J",
    frozenset(["Colombia", "DR Congo", "Portugal", "Uzbekistan"]): "K",
    frozenset(["Croatia", "England", "Ghana", "Panama"]): "L",
}


def group_letter(teams):
    return GROUP_LETTERS.get(frozenset(teams), "?")


# Round of 32 oficial (fuente: reglamento FIFA / Wikipedia "2026 FIFA World Cup
# knockout stage"). Los 8 cruces fijos no dependen de qué terceros clasifiquen.
FIXED_PAIRS = [
    ("2A", "2B"),
    ("1F", "2C"),
    ("1C", "2F"),
    ("2E", "2I"),
    ("2K", "2L"),
    ("1H", "2J"),
    ("2D", "2G"),
    ("1J", "2H"),
]

# Los otros 8 cruces enfrentan a un ganador de grupo contra uno de los 8
# mejores terceros, dentro de esta lista de grupos candidatos (también oficial).
# Qué tercero EXACTO le toca a cada slot depende del Anexo C (495 combinaciones)
# que no se reproduce aquí: se asigna el mejor tercero disponible entre los
# candidatos del slot, procesando los slots en este mismo orden.
THIRD_PLACE_SLOTS = [
    ("1E", ["A", "B", "C", "D", "F"]),
    ("1I", ["C", "D", "F", "G", "H"]),
    ("1A", ["C", "E", "F", "H", "I"]),
    ("1L", ["E", "H", "I", "J", "K"]),
    ("1D", ["B", "E", "F", "I", "J"]),
    ("1G", ["A", "E", "H", "I", "J"]),
    ("1B", ["E", "F", "G", "I", "J"]),
    ("1K", ["D", "E", "I", "J", "L"]),
]


def load_group_matches():
    with open(RAW / "kaggle_results.csv", encoding="utf-8") as f:
        rows = [
            r
            for r in csv.DictReader(f)
            if r["tournament"] == "FIFA World Cup" and r["date"].startswith("2026")
        ]
    return rows


def reconstruct_groups(matches):
    edges = defaultdict(set)
    for m in matches:
        edges[m["home_team"]].add(m["away_team"])
        edges[m["away_team"]].add(m["home_team"])

    seen = set()
    groups = []
    for team in edges:
        if team in seen:
            continue
        stack, comp = [team], set()
        while stack:
            t = stack.pop()
            if t in comp:
                continue
            comp.add(t)
            stack.extend(edges[t] - comp)
        seen |= comp
        groups.append(sorted(comp))

    groups.sort(key=lambda g: g[0])
    return groups


def build_team_snapshot(training_df):
    """Última fila (más reciente) de cada equipo en training_data.csv, para
    usar su Elo/forma/valor de plantilla más actual en partidos hipotéticos
    de eliminatorias."""
    snapshot = {}
    for _, row in training_df.sort_values("date").iterrows():
        snapshot[row["home_team"]] = {
            "elo": row["elo_home"],
            "form": row["form_home"],
            "goals_for": row["goals_for_home"],
            "goals_against": row["goals_against_home"],
            "win_streak": row["win_streak_home"],
            "squad_value": row["squad_value_home"],
        }
        snapshot[row["away_team"]] = {
            "elo": row["elo_away"],
            "form": row["form_away"],
            "goals_for": row["goals_for_away"],
            "goals_against": row["goals_against_away"],
            "win_streak": row["win_streak_away"],
            "squad_value": row["squad_value_away"],
        }
    return snapshot


def predict_match(model, snap, team1, team2, neutral=1):
    s1, s2 = snap[team1], snap[team2]
    row = pd.DataFrame(
        [
            {
                "elo_home": s1["elo"],
                "elo_away": s2["elo"],
                "elo_diff": s1["elo"] - s2["elo"],
                "form_home": s1["form"],
                "form_away": s2["form"],
                "neutral": neutral,
                "goals_for_home": s1["goals_for"],
                "goals_against_home": s1["goals_against"],
                "goals_for_away": s2["goals_for"],
                "goals_against_away": s2["goals_against"],
                "win_streak_home": s1["win_streak"],
                "win_streak_away": s2["win_streak"],
                "squad_value_home": s1["squad_value"] or 0,
                "squad_value_away": s2["squad_value"] or 0,
                "squad_value_diff": (s1["squad_value"] or 0) - (s2["squad_value"] or 0),
            }
        ]
    )
    probs = model.predict_proba(row[FEATURES])[0]
    return dict(zip(model.classes_, probs))  # {"H":..,"D":..,"A":..}


def group_match_view(m, model, snap):
    has_score = m["home_score"] not in ("", "NA") and m["away_score"] not in ("", "NA")
    probs = predict_match(model, snap, m["home_team"], m["away_team"], neutral=1)
    entry = {
        "date": m["date"],
        "home_team": m["home_team"],
        "away_team": m["away_team"],
        "played": has_score,
        "prob_H": round(float(probs["H"]), 4),
        "prob_D": round(float(probs["D"]), 4),
        "prob_A": round(float(probs["A"]), 4),
    }
    if has_score:
        entry["home_score"] = int(float(m["home_score"]))
        entry["away_score"] = int(float(m["away_score"]))
    else:
        entry["predicted"] = max(probs, key=probs.get)
    return entry


def compute_standings(group_teams, match_views):
    table = {
        t: {"team": t, "pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0, "pts": 0, "prob_sum": 0.0}
        for t in group_teams
    }

    for mv in match_views:
        h, a = mv["home_team"], mv["away_team"]
        if mv["played"]:
            hs, as_ = mv["home_score"], mv["away_score"]
        else:
            # Resultado proyectado a partir de la predicción del modelo, solo
            # para completar la tabla; no implica un marcador real.
            pred = mv["predicted"]
            hs, as_ = {"H": (1, 0), "D": (0, 0), "A": (0, 1)}[pred]

        table[h]["pj"] += 1
        table[a]["pj"] += 1
        table[h]["gf"] += hs
        table[h]["gc"] += as_
        table[a]["gf"] += as_
        table[a]["gc"] += hs
        table[h]["prob_sum"] += mv["prob_H"]
        table[a]["prob_sum"] += mv["prob_A"]

        if hs > as_:
            table[h]["pg"] += 1
            table[h]["pts"] += 3
            table[a]["pp"] += 1
        elif hs < as_:
            table[a]["pg"] += 1
            table[a]["pts"] += 3
            table[h]["pp"] += 1
        else:
            table[h]["pe"] += 1
            table[a]["pe"] += 1
            table[h]["pts"] += 1
            table[a]["pts"] += 1

    ranked = sorted(
        table.values(),
        key=lambda r: (-r["pts"], -(r["gf"] - r["gc"]), -r["gf"], -r["prob_sum"]),
    )
    for i, r in enumerate(ranked):
        r["gd"] = r["gf"] - r["gc"]
        r["pos"] = i + 1
    return ranked


def official_bracket(groups_out, best_thirds):
    """Resuelve el Round of 32 oficial: los 8 cruces fijos tal cual, y los 8
    cruces con tercero asignando el mejor tercero disponible entre los
    candidatos de cada slot (ver THIRD_PLACE_SLOTS)."""
    by_letter = {g["label"].split()[-1]: g["standings"] for g in groups_out}

    def slot_team(code):
        # "1A" -> ganador de A, "2A" -> segundo de A
        pos, letter = int(code[0]), code[1]
        return by_letter[letter][pos - 1]["team"]

    pairs = []
    for a_code, b_code in FIXED_PAIRS:
        pairs.append((slot_team(a_code), slot_team(b_code)))

    third_letters = {t["group"].split()[-1] for t in best_thirds}
    assignment = match_thirds_to_slots(third_letters)

    third_team_by_letter = {t["group"].split()[-1]: t["team"] for t in best_thirds}
    for winner_code, letter in assignment:
        pairs.append((slot_team(winner_code), third_team_by_letter[letter]))

    return pairs


def match_thirds_to_slots(qualified_letters):
    """Empareja cada uno de los 8 slots de THIRD_PLACE_SLOTS con un tercero
    clasificado distinto, respetando su lista de grupos candidatos. Es un
    emparejamiento bipartito exacto (con backtracking) en vez de voraz, porque
    asignar de forma voraz puede dejar un slot sin candidato válido aunque
    exista una asignación global correcta."""

    def backtrack(i, used):
        if i == len(THIRD_PLACE_SLOTS):
            return []
        winner_code, candidates = THIRD_PLACE_SLOTS[i]
        for letter in candidates:
            if letter in qualified_letters and letter not in used:
                rest = backtrack(i + 1, used | {letter})
                if rest is not None:
                    return [(winner_code, letter)] + rest
        return None

    result = backtrack(0, set())
    if result is None:
        raise ValueError("No se encontró una asignación válida de terceros a los slots")
    return result


def main():
    matches = load_group_matches()
    groups = reconstruct_groups(matches)
    groups.sort(key=lambda teams: group_letter(teams))
    model = joblib.load(MODEL_PATH)
    training_df = pd.read_csv(TRAINING_PATH)
    for col in ["squad_value_home", "squad_value_away", "squad_value_diff"]:
        training_df[col] = pd.to_numeric(training_df[col], errors="coerce").fillna(0)
    snap = build_team_snapshot(training_df)

    groups_out = []
    all_qualifiers = []  # 1ros y 2dos
    thirds = []

    for i, teams in enumerate(groups):
        group_matches = [m for m in matches if m["home_team"] in teams and m["away_team"] in teams]
        match_views = [group_match_view(m, model, snap) for m in group_matches]
        standings = compute_standings(teams, match_views)

        group_label = f"Grupo {group_letter(teams)}"
        groups_out.append({"label": group_label, "standings": standings, "matches": match_views})

        for r in standings[:2]:
            all_qualifiers.append({**r, "group": group_label, "elo": snap[r["team"]]["elo"]})
        thirds.append({**standings[2], "group": group_label, "elo": snap[standings[2]["team"]]["elo"]})

    thirds_sorted = sorted(thirds, key=lambda r: (-r["pts"], -r["gd"], -r["gf"], -r["prob_sum"]))
    best_thirds = thirds_sorted[:8]
    all_qualifiers.extend(best_thirds)
    team_group = {q["team"]: q["group"] for q in all_qualifiers}

    bracket = []
    pairs = official_bracket(groups_out, best_thirds)
    round_matches = []
    for team1, team2 in pairs:
        probs = predict_match(model, snap, team1, team2, neutral=1)
        p_a = float(probs["H"]) + float(probs["D"]) / 2
        p_b = float(probs["A"]) + float(probs["D"]) / 2
        winner = team1 if p_a >= p_b else team2
        round_matches.append(
            {
                "team1": team1,
                "team2": team2,
                "group1": team_group.get(team1, ""),
                "group2": team_group.get(team2, ""),
                "prob1": round(p_a, 4),
                "prob2": round(p_b, 4),
                "winner": winner,
            }
        )
    bracket.append({"round": ROUND_NAMES[0], "matches": round_matches})

    current = [
        {"team": m["winner"], "elo": snap[m["winner"]]["elo"], "group": m["group1"] if m["winner"] == m["team1"] else m["group2"]}
        for m in round_matches
    ]

    for round_name in ROUND_NAMES[1:]:
        next_matches = []
        for k in range(0, len(current), 2):
            a, b = current[k], current[k + 1]
            probs = predict_match(model, snap, a["team"], b["team"], neutral=1)
            p_a = float(probs["H"]) + float(probs["D"]) / 2
            p_b = float(probs["A"]) + float(probs["D"]) / 2
            winner = a if p_a >= p_b else b
            next_matches.append(
                {
                    "team1": a["team"],
                    "team2": b["team"],
                    "group1": a["group"],
                    "group2": b["group"],
                    "prob1": round(p_a, 4),
                    "prob2": round(p_b, 4),
                    "winner": winner["team"],
                }
            )
        bracket.append({"round": round_name, "matches": next_matches})
        current = [
            {
                "team": m["winner"],
                "elo": snap[m["winner"]]["elo"],
                "group": m["group1"] if m["winner"] == m["team1"] else m["group2"],
            }
            for m in next_matches
        ]

    champion = current[0]["team"] if current else None

    out = {
        "groups": groups_out,
        "bracket": bracket,
        "champion": champion,
        "disclaimer": (
            "El Round of 32 usa la estructura oficial de la FIFA (8 cruces fijos + "
            "8 cruces de ganador de grupo contra tercero, con su lista real de grupos "
            "candidatos). La única parte no oficial es qué tercero EXACTO le toca a "
            "cada uno de esos 8 cruces: depende de una tabla de 495 combinaciones "
            "(Anexo C del reglamento FIFA) que no se reproduce aquí, así que se asigna "
            "el mejor tercero disponible entre los candidatos de cada cruce."
        ),
    }

    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Listo: {OUT_PATH}")
    print(f"Campeón proyectado: {champion}")


if __name__ == "__main__":
    main()
