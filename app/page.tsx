import Link from "next/link";

type Section = {
  href: string;
  title: string;
  description: string;
  accent: string;
};

const SECTIONS: Section[] = [
  {
    href: "/extraer",
    title: "Extraer datos",
    description:
      "Una fuente por fila (eloratings.net, Transfermarkt, histórico 1872-2026) con un botón para generar su CSV en data/raw/.",
    accent: "from-emerald-400/20 to-emerald-400/0",
  },
  {
    href: "/unificar",
    title: "Unificar y entrenar",
    description:
      "Combina los CSV de data/raw/, calcula Elo histórico, forma reciente y valor de plantilla, y entrena el modelo de predicción.",
    accent: "from-indigo-400/20 to-indigo-400/0",
  },
  {
    href: "/predicciones",
    title: "Predicciones",
    description:
      "Probabilidades de victoria/empate/derrota para los partidos del Mundial 2026, calculadas por el modelo entrenado.",
    accent: "from-amber-400/20 to-amber-400/0",
  },
  {
    href: "/resultados",
    title: "Resultados",
    description:
      "Partidos del Mundial 2026 ya jugados: resultado real, predicción del modelo y si acertó o no.",
    accent: "from-rose-400/20 to-rose-400/0",
  },
];

export default function Home() {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="animate-float text-4xl font-bold tracking-tight text-white">
          <span className="text-gradient">Predicción Mundial</span>
        </h1>
        <p className="mt-3 text-white/60">
          Pipeline de datos y modelo de predicción para el Mundial 2026.
        </p>

        <div className="mt-10 grid gap-5">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`glass glass-hover relative overflow-hidden rounded-2xl p-6`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${section.accent}`}
              />
              <div className="relative">
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
