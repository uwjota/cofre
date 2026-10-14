"use client";
import { APP_TIME_ZONE } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper, RefreshCw } from "lucide-react";
import { Empty, Notice, PageHeading } from "./ui";
type Article = {
  title: string;
  url: string;
  description: string | null;
  publishedAt: string;
  source: string;
};
const categories = [
  ["general", "Geral"],
  ["technology", "Tech"],
  ["business", "Economia"],
  ["science", "Ciência"],
];
export function News({ compact = false }: { compact?: boolean }) {
  const [category, setCategory] = useState("general");
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/news?category=${category}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Não foi possível carregar as notícias.",
          );
        setArticles(payload.articles);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, reload]);
  return (
    <>
      {!compact && (
        <PageHeading
          eyebrow="Uma janela para o mundo"
          title="Notícias"
          description="Manchetes internacionais para alimentar sua curiosidade."
        />
      )}
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Newspaper size={18} className="text-accent" />
            No radar
          </h2>
          <div className="flex items-center gap-1">
            {categories.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] ${category === value ? "bg-[#eaf0e3] font-semibold text-accent" : "text-muted hover:bg-[#f2f5ee]"}`}
              >
                {label}
              </button>
            ))}
            <button
              aria-label="Atualizar notícias"
              className="icon-btn"
              onClick={() => setReload((n) => n + 1)}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <Notice message={error} />
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-muted">
            Buscando notícias…
          </p>
        ) : !error && !articles.length ? (
          <Empty>Nenhuma notícia disponível nesta categoria.</Empty>
        ) : (
          !error && (
            <div
              className={`mt-4 grid gap-4 ${compact ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}
            >
              {articles.slice(0, compact ? 3 : 9).map((article, i) => (
                <a
                  href={article.url}
                  key={`${article.url}-${i}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-xl border border-[#e6ebdf] p-4 transition hover:border-[#a3bd8c] hover:bg-[#f7f9f3]"
                >
                  <div className="mb-4 flex justify-between text-[10px] text-muted">
                    <span>{article.source}</span>
                    <ArrowUpRight size={14} />
                  </div>
                  <h3 className="text-sm font-semibold leading-relaxed group-hover:text-accent">
                    {article.title}
                  </h3>
                  {!compact && article.description && (
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">
                      {article.description}
                    </p>
                  )}
                  <p className="mt-auto pt-5 text-[10px] text-muted">
                    {new Date(article.publishedAt).toLocaleDateString("pt-BR", {
                      timeZone: APP_TIME_ZONE,
                    })}
                  </p>
                </a>
              ))}
            </div>
          )
        )}
        <p className="mt-4 text-[10px] text-muted">
          NewsAPI · Fontes internacionais · Atualização a cada 15 minutos
        </p>
      </section>
    </>
  );
}
