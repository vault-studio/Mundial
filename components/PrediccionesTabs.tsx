"use client";

import { useState } from "react";

type GroupMatch = {
  date: string;
  home_team: string;
  away_team: string;
  played: boolean;
  prob_H: number;
  prob_D: number;
  prob_A: number;
  home_score?: number;
  away_score?: number;
  predicted?: "H" | "D" | "A";
};

type Standing = {
  pos: number;
  team: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  gd: number;
  pts: number;
};

type Group = {
  label: string;
  standings: Standing[];
  matches: GroupMatch[];
};

type BracketMatch = {
  team1: string;
  team2: string;
  group1: string;
  group2: string;
  prob1: number;
  prob2: number;
  winner: string;
};

type BracketRound = {
  round: string;
  matches: BracketMatch[];
};

type Torneo = {
  groups: Group[];
  bracket: BracketRound[];
  champion: string | null;
  disclaimer: string;
};

type Prediction = {
  date: string;
  home_team: string;
  away_team: string;
  prob_H: number;
  prob_D: number;
  prob_A: number;
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

const RANK_STYLE = {
  high: "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
  mid: "bg-white/8 text-white/70 border border-white/10",
  low: "bg-rose-400/15 text-rose-300 border border-rose-400/30",
};

function rankStyles(probH: number, probD: number, probA: number) {
  const entries = [
    { key: "H", value: probH },
    { key: "D", value: probD },
    { key: "A", value: probA },
  ].sort((a, b) => b.value - a.value);

  return {
    [entries[0].key]: RANK_STYLE.high,
    [entries[1].key]: RANK_STYLE.mid,
    [entries[2].key]: RANK_STYLE.low,
  } as Record<string, string>;
}

const TABS = ["Próximos partidos", "Grupos", "Eliminatorias"] as const;

export default function PrediccionesTabs({
  predictions,
  torneo,
}: {
  predictions: Prediction[];
  torneo: Torneo | null;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Próximos partidos");

  return (
    <div>
      <div className="mt-6 inline-flex gap-1 rounded-full bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Próximos partidos" && <ProximosPartidos predictions={predictions} />}
        {tab === "Grupos" && <GruposView torneo={torneo} />}
        {tab === "Eliminatorias" && <EliminatoriasView torneo={torneo} />}
      </div>
    </div>
  );
}

function ProximosPartidos({ predictions }: { predictions: Prediction[] }) {
  if (predictions.length === 0) {
    return (
      <p className="glass rounded-2xl p-6 text-sm text-white/60">
        Todavía no hay predicciones. Genera <code>data/processed/predictions.csv</code> desde{" "}
        <code>/unificar</code> en local.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {predictions.map((p, i) => {
        const styles = rankStyles(p.prob_H, p.prob_D, p.prob_A);
        return (
          <div key={i} className="glass glass-hover rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">
                {p.home_team} <span className="text-white/40">vs</span> {p.away_team}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                {p.date}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
              <span className={`rounded-xl px-2 py-2 text-center ${styles.H}`}>
                Local {pct(p.prob_H)}
              </span>
              <span className={`rounded-xl px-2 py-2 text-center ${styles.D}`}>
                Empate {pct(p.prob_D)}
              </span>
              <span className={`rounded-xl px-2 py-2 text-center ${styles.A}`}>
                Visitante {pct(p.prob_A)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GruposView({ torneo }: { torneo: Torneo | null }) {
  if (!torneo) {
    return (
      <p className="glass rounded-2xl p-6 text-sm text-white/60">
        Todavía no hay datos del torneo. Genera <code>data/processed/torneo.json</code> ejecutando{" "}
        <code>scripts/predict/torneo.py</code> en local.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {torneo.groups.map((g) => (
        <div key={g.label} className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white">{g.label}</h3>

          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-white/40">
                <th className="text-left font-normal">Equipo</th>
                <th className="font-normal">PJ</th>
                <th className="font-normal">DG</th>
                <th className="font-normal">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.standings.map((s) => (
                <tr
                  key={s.team}
                  className={`border-t border-white/5 ${
                    s.pos <= 2 ? "text-emerald-300" : "text-white/70"
                  }`}
                >
                  <td className="py-1.5">{s.team}</td>
                  <td className="text-center">{s.pj}</td>
                  <td className="text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                  <td className="text-center font-semibold">{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col gap-2">
            {g.matches.map((m, i) => {
              const styles = rankStyles(m.prob_H, m.prob_D, m.prob_A);
              return (
                <div key={i} className="rounded-lg bg-white/5 p-2.5 text-xs">
                  <div className="flex items-center justify-between text-white/80">
                    <span>
                      {m.home_team} <span className="text-white/30">vs</span> {m.away_team}
                    </span>
                    {m.played ? (
                      <span className="font-semibold text-white">
                        {m.home_score}-{m.away_score}
                      </span>
                    ) : (
                      <span className="text-white/40">{m.date}</span>
                    )}
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    <span className={`rounded px-1 py-0.5 text-center ${styles.H}`}>
                      L {pct(m.prob_H)}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-center ${styles.D}`}>
                      E {pct(m.prob_D)}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-center ${styles.A}`}>
                      V {pct(m.prob_A)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EliminatoriasView({ torneo }: { torneo: Torneo | null }) {
  if (!torneo) {
    return (
      <p className="glass rounded-2xl p-6 text-sm text-white/60">
        Todavía no hay datos del torneo. Genera <code>data/processed/torneo.json</code> ejecutando{" "}
        <code>scripts/predict/torneo.py</code> en local.
      </p>
    );
  }

  return (
    <div>
      <p className="glass rounded-2xl p-4 text-xs text-amber-200/80">⚠️ {torneo.disclaimer}</p>

      <div className="mt-6 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-6">
          {torneo.bracket.map((round, ri) => (
            <div key={round.round} className="flex w-56 flex-col justify-around gap-4">
              <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-white/50">
                {round.round}
              </h3>
              <div
                className="flex flex-1 flex-col justify-around gap-4"
                style={{ gap: `${Math.pow(2, ri) * 0.75}rem` }}
              >
                {round.matches.map((m, i) => (
                  <div key={i} className="glass glass-hover rounded-xl p-3">
                    <TeamRow
                      team={m.team1}
                      group={m.group1}
                      prob={m.prob1}
                      isWinner={m.winner === m.team1}
                    />
                    <div className="my-1 h-px bg-white/10" />
                    <TeamRow
                      team={m.team2}
                      group={m.group2}
                      prob={m.prob2}
                      isWinner={m.winner === m.team2}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {torneo.champion && (
            <div className="flex w-56 flex-col items-center justify-center gap-3">
              <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-white/50">
                Campeón
              </h3>
              <div className="glass glow-accent flex flex-col items-center gap-2 rounded-2xl p-6">
                <span className="text-3xl">🏆</span>
                <span className="text-center font-bold text-white">{torneo.champion}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamRow({
  team,
  group,
  prob,
  isWinner,
}: {
  team: string;
  group: string;
  prob: number;
  isWinner: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${isWinner ? "text-white" : "text-white/40"}`}>
      <div className="flex flex-col">
        <span className={isWinner ? "font-semibold" : ""}>{team}</span>
        <span className="text-[10px] text-white/30">{group}</span>
      </div>
      <span
        className={`rounded px-1.5 py-0.5 text-xs ${
          isWinner ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5"
        }`}
      >
        {pct(prob)}
      </span>
    </div>
  );
}
