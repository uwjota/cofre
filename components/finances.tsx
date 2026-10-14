"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVault, useMutation } from "./vault-provider";
import { Field, Submit, Notice, Empty, PageHeading } from "./ui";
import { money, balance, localDate, dateLabel } from "@/lib/utils";
import type { Finance } from "@/lib/types";
const colors = [
  "#245b48",
  "#91ac76",
  "#c5d5af",
  "#d7ba83",
  "#a3b9b0",
  "#718e7b",
];
export function ExpenseChart() {
  const { data } = useVault();
  const grouped = data.finances
    .filter((r) => r.type === "expense")
    .reduce<Record<string, number>>((acc, row) => {
      acc[row.category] =
        (acc[row.category] || 0) + Math.round(Number(row.amount) * 100);
      return acc;
    }, {});
  const rows = Object.entries(grouped).map(([name, cents]) => ({
    name,
    value: cents / 100,
  }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <section className="panel h-full">
      <div className="flex justify-between">
        <h2 className="text-base font-semibold">Para onde vai seu dinheiro</h2>
        <span className="text-[10px] text-muted">Todo o período</span>
      </div>
      {rows.length ? (
        <>
          <div className="relative mx-auto h-52 max-w-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={66}
                  outerRadius={86}
                  paddingAngle={4}
                  stroke="none"
                >
                  {rows.map((row, i) => (
                    <Cell key={row.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted">Total de despesas</span>
              <strong className="mt-1 text-lg">{money(total)}</strong>
            </div>
          </div>
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li key={row.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="flex-1 text-muted">{row.name}</span>
                <span>{money(row.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty>Suas despesas aparecerão aqui após o primeiro lançamento.</Empty>
      )}
    </section>
  );
}
export function Finances() {
  const { data, userId } = useVault();
  const { busy, error, run } = useMutation();
  const [editing, setEditing] = useState<Finance | "new" | null>(null);
  const [filter, setFilter] = useState("all");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row = {
      user_id: userId,
      description: String(form.get("description")).trim(),
      amount: Math.round(Number(form.get("amount")) * 100) / 100,
      type: String(form.get("type")) as Finance["type"],
      category: String(form.get("category")).trim() || "Outros",
      date: String(form.get("date")),
    };
    await run(
      () =>
        editing && editing !== "new"
          ? createClient()
              .from("finances")
              .update(row)
              .eq("id", editing.id)
              .eq("user_id", userId)
          : createClient().from("finances").insert(row),
      () => setEditing(null),
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Vida financeira"
        title="Finanças"
        description="Clareza para fazer boas escolhas."
        action={
          <button className="btn" onClick={() => setEditing("new")}>
            <Plus size={16} />
            Novo lançamento
          </button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Saldo atual", balance(data.finances)],
          [
            "Receitas",
            balance(data.finances.filter((r) => r.type === "income")),
          ],
          [
            "Despesas",
            -balance(data.finances.filter((r) => r.type === "expense")),
          ],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="eyebrow">{label}</p>
            <p className="mt-3 text-2xl font-semibold">
              {money(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <Notice message={error} />
      {editing && (
        <form
          key={editing === "new" ? "new" : editing.id}
          onSubmit={save}
          className="panel mb-6 space-y-4"
        >
          <h2 className="font-semibold">
            {editing === "new" ? "Novo lançamento" : "Editar lançamento"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Descrição">
              <input
                name="description"
                className="field"
                required
                maxLength={200}
                defaultValue={editing === "new" ? "" : editing.description}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                name="amount"
                className="field"
                type="number"
                required
                min="0.01"
                max="999999999999.99"
                step="0.01"
                defaultValue={editing === "new" ? "" : editing.amount}
              />
            </Field>
            <Field label="Tipo">
              <select
                name="type"
                className="field"
                defaultValue={editing === "new" ? "expense" : editing.type}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </Field>
            <Field label="Categoria">
              <input
                name="category"
                className="field"
                required
                maxLength={80}
                list="finance-categories"
                defaultValue={editing === "new" ? "" : editing.category}
              />
              <datalist id="finance-categories">
                {[
                  "Alimentação",
                  "Moradia",
                  "Transporte",
                  "Lazer",
                  "Saúde",
                  "Salário",
                  "Outros",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Data">
              <input
                name="date"
                className="field"
                type="date"
                required
                defaultValue={editing === "new" ? localDate() : editing.date}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Submit busy={busy}>Salvar lançamento</Submit>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Movimentações</h2>
            <select
              aria-label="Filtrar movimentações"
              className="field max-w-36"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </div>
          {!data.finances.filter((r) => filter === "all" || r.type === filter)
            .length ? (
            <Empty>Nenhum lançamento por aqui ainda.</Empty>
          ) : (
            <ul className="divide-y divide-[#edf0e8]">
              {data.finances
                .filter((r) => filter === "all" || r.type === filter)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-3 py-4">
                    <div
                      className={`rounded-xl p-2 ${row.type === "income" ? "bg-[#eaf1e5] text-accent" : "bg-[#fbede4] text-[#aa7752]"}`}
                    >
                      {row.type === "income" ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.description}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {row.category} · {dateLabel(row.date)}
                      </p>
                    </div>
                    <strong
                      className={`text-sm ${row.type === "income" ? "text-accent" : ""}`}
                    >
                      {row.type === "income" ? "+" : "−"}{" "}
                      {money(Number(row.amount))}
                    </strong>
                    <button
                      className="icon-btn"
                      aria-label={`Editar ${row.description}`}
                      onClick={() => setEditing(row)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      disabled={busy}
                      className="icon-btn"
                      aria-label={`Excluir ${row.description}`}
                      onClick={() => {
                        if (window.confirm("Excluir este lançamento?"))
                          void run(() =>
                            createClient()
                              .from("finances")
                              .delete()
                              .eq("id", row.id)
                              .eq("user_id", userId),
                          );
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <ExpenseChart />
      </div>
    </>
  );
}
