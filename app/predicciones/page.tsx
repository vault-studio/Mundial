export default function PrediccionesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Predicciones</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Próximamente: probabilidades de victoria/empate/derrota por partido del Mundial,
          calculadas con el modelo entrenado.
        </p>
      </div>
    </div>
  );
}
