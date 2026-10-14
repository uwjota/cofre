"use client";
import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { Note, NoteLink } from "@/lib/types";
export default function NoteGraph({
  notes,
  links,
  selectedId,
  onSelect,
}: {
  notes: Note[];
  links: NoteLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<cytoscape.Core | null>(null);
  const callback = useRef(onSelect);
  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!container.current) return;
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...notes.map((note) => ({ data: { id: note.id, label: note.title } })),
        ...links.map((link) => ({
          data: {
            id: link.id,
            source: link.source_note_id,
            target: link.target_note_id,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#40775a",
            label: "data(label)",
            color: "#42644d",
            "font-size": 11,
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 18,
            height: 18,
            "border-width": 5,
            "border-color": "#e3edd8",
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#a4bf71",
            "border-color": "#cbdcba",
            width: 26,
            height: 26,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.2,
            "line-color": "#bccfb0",
            "target-arrow-color": "#a4ba95",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.6,
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        randomize: false,
        padding: 45,
        nodeRepulsion: () => 7000,
      },
      minZoom: 0.25,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });
    graph.current = cy;
    cy.on("tap", "node", (event) => callback.current(event.target.id()));
    const observer = new ResizeObserver(() => cy.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      cy.destroy();
      graph.current = null;
    };
  }, [notes, links]);
  useEffect(() => {
    const cy = graph.current;
    if (cy) {
      cy.nodes().unselect();
      if (selectedId) cy.getElementById(selectedId).select();
    }
  }, [selectedId, notes, links]);
  return (
    <div>
      <div
        ref={container}
        role="img"
        aria-label={`Grafo interativo com ${notes.length} notas. Selecione também pela lista de notas.`}
        className="h-80 w-full rounded-xl bg-[#f4f7ef]"
      />
      <button
        className="mt-3 text-xs font-semibold text-accent"
        onClick={() => graph.current?.fit(undefined, 45)}
      >
        Centralizar grafo
      </button>
    </div>
  );
}
