export default function UnificarPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Unificar CSV</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Próximamente: combinará los CSV de <code>data/raw/</code> y generará el CSV final con
          las columnas para entrenar el modelo (Elo, forma reciente, valor de plantilla,
          head-to-head) en <code>data/processed/</code>.
        </p>
      </div>
    </div>
  );
}
