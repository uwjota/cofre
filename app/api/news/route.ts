import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
const categories = {
  general: "general",
  technology: "technology",
  business: "business",
  science: "science",
} as const;
export async function GET(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const category = request.nextUrl.searchParams.get("category") || "general";
  if (!(category in categories))
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      {
        error:
          "Configure NEWS_API_KEY no servidor para ativar o feed de notícias.",
      },
      { status: 503 },
    );
  try {
    const url = new URL("https://newsapi.org/v2/top-headlines");
    url.searchParams.set(
      "category",
      categories[category as keyof typeof categories],
    );
    url.searchParams.set("country", "us");
    url.searchParams.set("pageSize", "9");
    // Apenas conteúdo público do provedor é compartilhado em cache; autenticação ocorre antes.
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("provider");
    const payload = await response.json();
    if (payload.status !== "ok" || !Array.isArray(payload.articles))
      throw new Error("payload");
    const articles = payload.articles
      .filter(
        (a: { title?: string; url?: string }) =>
          a.title &&
          a.title !== "[Removed]" &&
          a.url &&
          /^https?:\/\//.test(a.url),
      )
      .map(
        (a: {
          title: string;
          url: string;
          description?: string;
          publishedAt: string;
          source: { name: string };
        }) => ({
          title: a.title,
          url: a.url,
          description: a.description,
          publishedAt: a.publishedAt,
          source: a.source?.name || "Notícias",
        }),
      );
    return NextResponse.json(
      { articles },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "O feed está indisponível. Verifique a chave e o plano da NewsAPI ou tente novamente mais tarde.",
      },
      { status: 502 },
    );
  }
}
