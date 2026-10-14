"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVault, useMutation } from "./vault-provider";
import { Field, Submit, Notice, Empty, PageHeading } from "./ui";
import { dateLabel } from "@/lib/utils";
import type { Project } from "@/lib/types";
const statuses = {
  active: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
};
function Progress({ project }: { project: Project }) {
  const { userId } = useVault();
  const { busy, error, run } = useMutation();
  const [value, setValue] = useState(project.progress);
  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between text-[11px] text-muted">
        <span>Progresso</span>
        <span>{value}%</span>
      </div>
      <input
        aria-label={`Progresso de ${project.title}`}
        className="w-full accent-accent"
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      {value !== project.progress && (
        <button
          disabled={busy}
          className="mt-2 text-xs font-semibold text-accent"
          onClick={() =>
            run(() =>
              createClient()
                .from("projects")
                .update({
                  progress: value,
                  status:
                    value === 100
                      ? "completed"
                      : project.status === "completed"
                        ? "active"
                        : project.status,
                })
                .eq("id", project.id)
                .eq("user_id", userId),
            )
          }
        >
          Salvar progresso
        </button>
      )}
      <Notice message={error} />
    </div>
  );
}
export function Projects({ compact = false }: { compact?: boolean }) {
  const { data, userId } = useVault();
  const { busy, error, run } = useMutation();
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status")) as Project["status"];
    const row = {
      user_id: userId,
      title: String(form.get("title")).trim(),
      description: String(form.get("description")),
      status,
      deadline: String(form.get("deadline")) || null,
      progress: status === "completed" ? 100 : Number(form.get("progress")),
    };
    await run(
      () =>
        editing && editing !== "new"
          ? createClient()
              .from("projects")
              .update(row)
              .eq("id", editing.id)
              .eq("user_id", userId)
          : createClient().from("projects").insert(row),
      () => setEditing(null),
    );
  }
  return (
    <>
      {!compact && (
        <PageHeading
          eyebrow="Da ideia à realização"
          title="Projetos"
          description="Um lugar para os planos que merecem sair do papel."
          action={
            <button className="btn" onClick={() => setEditing("new")}>
              <Plus size={16} />
              Novo projeto
            </button>
          }
        />
      )}
      <section className={compact ? "panel" : ""}>
        {compact && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderKanban size={18} className="text-accent" />
              Projetos em movimento
            </h2>
            <button
              className="icon-btn"
              aria-label="Novo projeto"
              onClick={() => setEditing("new")}
            >
              <Plus size={18} />
            </button>
          </div>
        )}
        <Notice message={error} />
        {editing && (
          <form
            key={editing === "new" ? "new" : editing.id}
            className="panel mb-5 space-y-4"
            onSubmit={save}
          >
            <Field label="Título">
              <input
                name="title"
                className="field"
                required
                maxLength={200}
                defaultValue={editing === "new" ? "" : editing.title}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                name="description"
                className="field"
                maxLength={10000}
                defaultValue={editing === "new" ? "" : editing.description}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Status">
                <select
                  className="field"
                  name="status"
                  defaultValue={editing === "new" ? "active" : editing.status}
                >
                  {Object.entries(statuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  name="deadline"
                  className="field"
                  defaultValue={editing === "new" ? "" : editing.deadline || ""}
                />
              </Field>
              <Field label="Progresso (%)">
                <input
                  type="number"
                  name="progress"
                  className="field"
                  min="0"
                  max="100"
                  required
                  defaultValue={editing === "new" ? 0 : editing.progress}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Submit busy={busy}>Salvar projeto</Submit>
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
        {!(compact ? data.projects.filter((p) => p.status === "active") : data.projects).length ? (
          <Empty>Todo projeto começa com uma ideia. Qual é a sua?</Empty>
        ) : (
          <div
            className={
              compact ? "space-y-5" : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            }
          >
            {(compact
              ? data.projects.filter((p) => p.status === "active").slice(0, 3)
              : data.projects
            ).map((project) => (
              <article
                className={compact ? "border-t border-[#edf0e8] pt-4" : "panel"}
                key={project.id}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{project.title}</h3>
                    <p className="mt-2 text-[10px] text-muted">
                      {statuses[project.status]} · {dateLabel(project.deadline)}
                    </p>
                  </div>
                  <div className="flex">
                    <button
                      className="icon-btn"
                      aria-label={`Editar ${project.title}`}
                      onClick={() => setEditing(project)}
                    >
                      <Pencil size={14} />
                    </button>
                    {!compact && (
                      <button
                        disabled={busy}
                        className="icon-btn"
                        aria-label={`Excluir ${project.title}`}
                        onClick={() => {
                          if (window.confirm("Excluir este projeto?"))
                            void run(() =>
                              createClient()
                                .from("projects")
                                .delete()
                                .eq("id", project.id)
                                .eq("user_id", userId),
                            );
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {!compact && (
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {project.description}
                  </p>
                )}
                <Progress
                  key={`${project.id}-${project.progress}`}
                  project={project}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
