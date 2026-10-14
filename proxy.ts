import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfig, isConfigured } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  const publicRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/auth/");
  if (!isConfigured()) {
    if (publicRoute) return NextResponse.next();
    if (request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 503 },
      );
    return NextResponse.redirect(new URL("/login", request.url));
  }
  let response = NextResponse.next({ request });
  const { url, key } = getConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if ((!data?.claims || error) && !publicRoute) {
    const redirected = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Não autenticado." }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
