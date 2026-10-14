"use client";
import { APP_TIME_ZONE } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Search,
  FileText,
  Network,
  Save,
  Trash2,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVault, useMutation } from "./vault-provider";
import { Field, Notice, Empty, PageHeading, Submit } from "./ui";
import type { Note } from "@/lib/types";
import { wikiTitles } from "@/lib/utils";
const NoteGraph = dynamic(() => import("./note-graph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center text-sm text-muted">
      Abrindo suas conexões…
    </div>
  ),
});
export function Notes() {
  const { data } = useVault();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("note");
    if (id) setSelectedId(id);
  }, []);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  // Também protege a navegação interna da sidebar contra perda de rascunhos.
  useEffect(() => {
    if (!dirty) return;
    function leave(event: MouseEvent) {
      const a = (event.target as Element).closest("a");
      if (
        a &&
        a.origin === location.origin &&
        a.pathname !== "/notes" &&
        !window.confirm("Descartar as alterações não salvas?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("click", leave, true);
    return () => document.removeEventListener("click", leave, true);
  }, [dirty]);
  const select = useCallback(
    (id: string | null) => {
      if (id === selectedId) return;
      if (dirty && !window.confirm("Descartar as alterações não salvas?"))
        return;
      setDirty(false);
      setSelectedId(id);
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("note", id);
      else url.searchParams.delete("note");
      window.history.replaceState(null, "", url);
    },
    [dirty, selectedId],
  );
  const selected = data.notes.find((n) => n.id === selectedId);
  const filtered = data.notes.filter((n) =>
    `${n.title} ${n.category} ${n.tags.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="Seu conhecimento, conectado"
        title="Segundo Cérebro"
        description="Guarde o que inspira você. Descubra as conexões."
        action={
          <button
            className="btn"
            onClick={() => {
              if (!selectedId && dirty) {
                if (window.confirm("Limpar este rascunho?")) {
                  setDirty(false);
                  window.location.assign("/notes");
                }
              } else select(null);
            }}
          >
            <Plus size={16} />
            Nova nota
          </button>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <section className="panel p-4!">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Minhas notas</h2>
            <span className="text-xs text-muted">{data.notes.length}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-muted" />
            <input
              aria-label="Buscar notas"
              placeholder="Buscar ideias…"
              className="field pl-9!"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 max-h-[560px] space-y-1 overflow-y-auto">
            {filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => select(note.id)}
                className={`w-full rounded-lg p-3 text-left ${note.id === selectedId ? "bg-[#eaf0e2]" : "hover:bg-[#f6f8f2]"}`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="shrink-0 text-accent" />
                  <p className="truncate text-xs font-semibold">{note.title}</p>
                </div>
                <p className="mt-2 truncate pl-5 text-[10px] text-muted">
                  {note.category} ·{" "}
                  {new Date(note.updated_at).toLocaleDateString("pt-BR", {
                    timeZone: APP_TIME_ZONE,
                  })}
                </p>
              </button>
            ))}
            {!filtered.length && (
              <Empty>
                {search
                  ? "Nenhuma nota encontrada."
                  : "Suas ideias começam aqui."}
              </Empty>
            )}
          </div>
        </section>
        <NoteEditor
          key={selectedId || "new"}
          note={selected}
          onDirty={setDirty}
          onSelect={select}
          onSaved={(id) => {
            setDirty(false);
            setSelectedId(id);
          }}
        />
        <aside className="space-y-5">
          <section className="panel p-4!">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Network size={16} />
              Mapa de conexões
            </h2>
            {data.notes.length ? (
              <NoteGraph
                notes={data.notes}
                links={data.note_links}
                selectedId={selectedId}
                onSelect={select}
              />
            ) : (
              <Empty>
                Crie notas e use [[Título da nota]] para ver suas conexões.
              </Empty>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Arraste os nós, aproxime com o scroll e clique para abrir uma
              nota.
            </p>
          </section>
          <section className="panel p-4!">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Link2 size={16} />
              Backlinks
            </h2>
            <p className="mt-2 text-xs text-muted">
              Notas que apontam para esta ideia.
            </p>
            {data.note_links
              .filter((l) => l.target_note_id === selectedId)
              .map((link) => {
                const source = data.notes.find(
                  (n) => n.id === link.source_note_id,
                );
                return source ? (
                  <button
                    key={link.id}
                    className="mt-3 flex w-full items-center justify-between rounded-lg bg-[#f4f7ee] p-3 text-left text-xs"
                    onClick={() => select(source.id)}
                  >
                    {source.title}
                    <ArrowUpRight size={14} />
                  </button>
                ) : null;
              })}
            {!data.note_links.some((l) => l.target_note_id === selectedId) && (
              <p className="mt-5 text-xs text-muted">Nenhuma menção ainda.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
function NoteEditor({
  note,
  onDirty,
  onSelect,
  onSaved,
}: {
  note: Note | undefined;
  onDirty: (dirty: boolean) => void;
  onSelect: (id: string | null) => void;
  onSaved: (id: string) => void;
}) {
  const { data, userId } = useVault();
  const { busy, error, run } = useMutation();
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [category, setCategory] = useState(note?.category || "Pessoal");
  const [tags, setTags] = useState(note?.tags.join(", ") || "");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    title !== (note?.title || "") ||
    content !== (note?.content || "") ||
    category !== (note?.category || "Pessoal") ||
    tags !== (note?.tags.join(", ") || "");
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  const references = wikiTitles(content);
  const unresolved = references.filter(
    (title) => !data.notes.some((n) => n.title.trim().toLowerCase() === title),
  );
  const markdown = content.replace(
    /\[\[([^\[\]\n]+)\]\]/g,
    (_, name: string) => {
      const target = data.notes.find(
        (n) => n.title.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      const label = name.replace(/[\\`*_{}\[\]()#+.!<>]/g, "\\$&");
      return target ? `[${label}](/notes?note=${target.id})` : label;
    },
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const id = note?.id || crypto.randomUUID();
    const row = {
      id,
      user_id: userId,
      title: title.trim(),
      content,
      category: category.trim() || "Pessoal",
      tags: [
        ...new Set(
          tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ],
    };
    await run(
      () =>
        note
          ? createClient()
              .from("notes")
              .update(row)
              .eq("id", id)
              .eq("user_id", userId)
          : createClient().from("notes").insert(row),
      () => {
        setTitle(row.title);
        setCategory(row.category);
        setTags(row.tags.join(", "));
        setSaved(true);
        onSaved(id);
      },
    );
  }
  return (
    <section className="panel min-w-0">
      <form onSubmit={save}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">
            {note ? "Editar nota" : "Uma nova ideia"}
          </span>
          <div className="flex gap-1 rounded-lg bg-[#f1f4ec] p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs ${!preview ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setPreview(false)}
            >
              Escrever
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs ${preview ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setPreview(true)}
            >
              Visualizar
            </button>
          </div>
        </div>
        <input
          aria-label="Título da nota"
          className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-[#b6c2ac]"
          placeholder="Dê um título à sua ideia"
          required
          maxLength={200}
          pattern="[^\[\]\n]+"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
        />
        <div className="my-5 grid gap-3 sm:grid-cols-2">
          <Field label="Categoria">
            <input
              className="field"
              maxLength={80}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
          <Field label="Tags (separadas por vírgula)">
            <input
              className="field"
              maxLength={500}
              placeholder="ideias, leitura, trabalho"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </Field>
        </div>
        <div className="border-y border-[#e5ebdf] py-4">
          {preview ? (
            <div className="markdown min-h-80 text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) =>
                    href?.startsWith("/notes?note=") ? (
                      <button
                        type="button"
                        className="font-medium text-accent underline"
                        onClick={() =>
                          onSelect(
                            new URL(
                              href,
                              window.location.origin,
                            ).searchParams.get("note"),
                          )
                        }
                      >
                        {children}
                      </button>
                    ) : (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  img: ({ alt }) => (
                    <span className="text-muted">[Imagem: {alt}]</span>
                  ),
                }}
              >
                {markdown || "*Sua ideia começa com a primeira palavra.*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              aria-label="Conteúdo em Markdown"
              className="min-h-80 w-full resize-y border-0 bg-transparent text-sm leading-7 outline-none placeholder:text-[#a6b59b]"
              maxLength={1000000}
              placeholder={
                "Escreva livremente…\n\nUse # para títulos, **negrito** para destacar e\n[[Título de outra nota]] para conectar suas ideias."
              }
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaved(false);
              }}
            />
          )}
        </div>
        {unresolved.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Ainda sem nota: {unresolved.join(", ")}. As conexões serão criadas
            quando essas notas existirem.
          </p>
        )}
        <Notice message={error} />
        {saved && !dirty && (
          <Notice message="Nota e conexões salvas." success />
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] text-muted">
            {dirty
              ? "Alterações não salvas"
              : note
                ? "Tudo salvo no seu Cofre"
                : "Markdown + [[conexões]]"}
          </p>
          <div className="flex gap-2">
            {note && (
              <button
                type="button"
                disabled={busy}
                className="icon-btn"
                aria-label="Excluir nota"
                onClick={() => {
                  if (
                    window.confirm(`Excluir “${note.title}” e suas conexões?`)
                  )
                    void run(
                      () =>
                        createClient()
                          .from("notes")
                          .delete()
                          .eq("id", note.id)
                          .eq("user_id", userId),
                      () => onSaved(""),
                    );
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <Submit busy={busy}>
              <Save size={14} />
              Salvar nota
            </Submit>
          </div>
        </div>
      </form>
    </section>
  );
}
