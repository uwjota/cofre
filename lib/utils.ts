import type { Finance } from "./types";
// Mesmo fuso no SSR/Vercel e no navegador, inclusive nos KPIs diários.
export const APP_TIME_ZONE = "America/Sao_Paulo";
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export const dateLabel = (value: string | null) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Sem prazo";
// Soma em centavos para evitar erros de ponto flutuante em valores monetários.
export const balance = (rows: Finance[]) =>
  rows.reduce(
    (sum, row) =>
      sum +
      (row.type === "income" ? 1 : -1) * Math.round(Number(row.amount) * 100),
    0,
  ) / 100;
export function wikiTitles(content: string) {
  return [
    ...new Set(
      Array.from(content.matchAll(/\[\[([^\[\]\n]+)\]\]/g), (match) =>
        match[1].trim().toLowerCase(),
      ).filter(Boolean),
    ),
  ];
}
export function errorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : (error as { message?: string })?.message;
  if (message?.includes("notes_user_title"))
    return "Você já tem uma nota com esse título.";
  return message || "Não foi possível concluir. Tente novamente.";
}
