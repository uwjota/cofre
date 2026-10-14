"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto my-24 max-w-lg panel">
      <h1 className="text-xl font-semibold">
        Não foi possível abrir seu Cofre
      </h1>
      <p className="my-4 text-sm text-muted">
        Verifique sua conexão e se a migração SQL foi aplicada no Supabase.
      </p>
      <button className="btn" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
