import { describe, it, expect } from "vitest";
import { balance, wikiTitles, localDate } from "../lib/utils";
import type { Finance } from "../lib/types";
describe("regras de apresentação", () => {
  it("soma centavos sem artefatos de ponto flutuante", () => {
    const rows = [
      { amount: 0.1, type: "income" },
      { amount: 0.2, type: "income" },
      { amount: 0.3, type: "expense" },
    ] as Finance[];
    expect(balance(rows)).toBe(0);
  });
  it("reconhece wikilinks únicos, ignora formatos incompletos e novas linhas", () => {
    expect(
      wikiTitles(
        "[[ React ]] [[react]] [[Banco de dados]] [[sem fim] [[duas\nlinhas]]",
      ),
    ).toEqual(["react", "banco de dados"]);
  });
  it("usa o dia em São Paulo quando o servidor já está no dia seguinte em UTC", () => {
    expect(localDate(new Date("2026-10-14T02:59:00Z"))).toBe("2026-10-13");
  });
});
