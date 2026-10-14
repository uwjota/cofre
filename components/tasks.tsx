"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Check, ListTodo } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVault, useMutation } from "./vault-provider";
import { Field, Submit, Notice, Empty, PageHeading } from "./ui";
import { dateLabel } from "@/lib/utils";
import type { Task } from "@/lib/types";
const priorityLabel = { high: "Alta", medium: "Média", low: "Baixa" };
export function Tasks({ compact = false }: { compact?: boolean }) {
  const { data, userId } = useVault();
  const { busy, error, run } = useMutation();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [filter, setFilter] = useState("all");
  const tasks = data.tasks.filter(
    (t) => filter === "all" || (filter === "done" ? t.completed : !t.completed),
  );
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row = {
      user_id: userId,
      title: String(form.get("title")).trim(),
      category: String(form.get("category")).trim() || "Pessoal",
      priority: String(form.get("priority")) as Task["priority"],
      due_date: String(form.get("due_date")) || null,
    };
    await run(
      () =>
        typeof editing === "object" && editing
          ? createClient()
              .from("tasks")
              .update(row)
              .eq("id", editing.id)
              .eq("user_id", userId)
          : createClient().from("tasks").insert(row),
      () => setEditing(null),
    );
  }
  return (
    <>
      {!compact && (
        <PageHeading
          eyebrow="Um passo de cada vez"
          title="Tarefas"
          description="Tire os planos da cabeça e coloque em movimento."
        />
      )}
      <section className="panel">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ListTodo size={18} className="text-accent" />
            {compact ? "Suas tarefas" : "Lista de tarefas"}
            <span className="rounded-md bg-[#f0f3eb] px-2 py-1 text-[10px] text-muted">
              {data.tasks.filter((t) => !t.completed).length} pendentes
            </span>
          </h2>
          <button
            className="icon-btn"
            aria-label="Nova tarefa"
            onClick={() => setEditing("new")}
          >
            <Plus size={19} />
          </button>
        </div>
        <div className="mt-5 flex gap-4 border-b border-[#edf0e8] text-xs">
          {[
            ["all", "Todas"],
            ["pending", "Pendentes"],
            ["done", "Concluídas"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`pb-3 ${filter === value ? "border-b-2 border-accent font-semibold text-accent" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Notice message={error} />
        {editing && (
          <form
            key={editing === "new" ? "new" : editing.id}
            onSubmit={save}
            className="my-4 space-y-3 rounded-xl bg-[#f5f7f1] p-4"
          >
            <Field label="Tarefa">
              <input
                className="field"
                name="title"
                autoFocus
                required
                maxLength={200}
                defaultValue={editing === "new" ? "" : editing.title}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Categoria">
                <input
                  name="category"
                  className="field"
                  maxLength={80}
                  defaultValue={
                    editing === "new" ? "Pessoal" : editing.category
                  }
                />
              </Field>
              <Field label="Prioridade">
                <select
                  name="priority"
                  className="field"
                  defaultValue={editing === "new" ? "medium" : editing.priority}
                >
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  name="due_date"
                  className="field"
                  defaultValue={editing === "new" ? "" : editing.due_date || ""}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Submit busy={busy}>Salvar tarefa</Submit>
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
        {!tasks.length ? (
          <Empty>Seu dia está aberto. Adicione uma tarefa para começar.</Empty>
        ) : (
          <ul className="divide-y divide-[#edf0e8]">
            {(compact ? tasks.slice(0, 5) : tasks).map((task) => (
              <li key={task.id} className="group flex items-center gap-3 py-4">
                <button
                  aria-label={
                    task.completed ? "Marcar como pendente" : "Concluir tarefa"
                  }
                  aria-pressed={task.completed}
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      createClient()
                        .from("tasks")
                        .update({ completed: !task.completed })
                        .eq("id", task.id)
                        .eq("user_id", userId),
                    )
                  }
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${task.completed ? "border-accent bg-accent text-white" : "border-[#ccd6c4]"}`}
                >
                  {task.completed && <Check size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${task.completed ? "text-muted line-through" : ""}`}
                  >
                    {task.title}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {task.category} · {dateLabel(task.due_date)}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-[10px] ${task.priority === "high" ? "bg-[#fbede4] text-[#b47950]" : task.priority === "medium" ? "bg-[#f7f3df] text-[#9c8a3a]" : "bg-[#eaf1e5] text-[#6d8e56]"}`}
                >
                  {priorityLabel[task.priority]}
                </span>
                <button
                  className="icon-btn"
                  aria-label={`Editar ${task.title}`}
                  onClick={() => setEditing(task)}
                >
                  <Pencil size={13} />
                </button>
                {!compact && (
                  <button
                    disabled={busy}
                    className="icon-btn"
                    aria-label={`Excluir ${task.title}`}
                    onClick={() => {
                      if (window.confirm(`Excluir a tarefa “${task.title}”?`))
                        void run(() =>
                          createClient()
                            .from("tasks")
                            .delete()
                            .eq("id", task.id)
                            .eq("user_id", userId),
                        );
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
