"use client";
import { LoaderCircle, Inbox } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-4 py-8 text-center text-sm text-muted">
      <Inbox size={24} strokeWidth={1.3} />
      {children}
    </div>
  );
}
export function Notice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return message ? (
    <p
      role={success ? "status" : "alert"}
      className={`my-3 rounded-lg p-3 text-sm ${success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
    >
      {message}
    </p>
  ) : null;
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="btn" type="submit" disabled={busy}>
      {busy && <LoaderCircle className="animate-spin" size={16} />} {children}
    </button>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
