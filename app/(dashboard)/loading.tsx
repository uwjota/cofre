export default function Loading() {
  return (
    <div role="status" className="animate-pulse space-y-6">
      <div className="h-12 w-60 rounded-xl bg-[#e5ebdf]" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-32 rounded-xl bg-[#e5ebdf]" />
        ))}
      </div>
      <p className="text-sm text-muted">Abrindo seu Cofre…</p>
    </div>
  );
}
