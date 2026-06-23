import Link from "next/link";

type Section = {
  href: string;
  title: string;
  description: string;
  status: "ready" | "soon";
};

const SECTIONS: Section[] = [
  {
    href: "/extraer",
    title: "Extraer datos",
    description:
      "Una fuente por fila (eloratings.net, football-data.org, Transfermarkt, Kaggle) con un botón para generar su CSV en data/raw/.",
    status: "ready",
  },
  {
    href: "/unificar",
    title: "Unificar y entrenar",
    description:
      "Combina los CSV de data/raw/, calcula Elo histórico, forma reciente y valor de plantilla, y entrena el modelo de predicción.",
    status: "ready",
  },
  {
    href: "/predicciones",
    title: "Predicciones",
    description:
      "Probabilidades de victoria/empate/derrota para los partidos del Mundial 2026, calculadas por el modelo entrenado.",
    status: "ready",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Predicción Mundial
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pipeline de datos y modelo de predicción para el Mundial.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="block rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-black dark:text-zinc-50">{section.title}</h2>
                {section.status === "soon" && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Próximamente
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
