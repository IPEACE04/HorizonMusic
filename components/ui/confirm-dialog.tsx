"use client";

import { useEffect, useId, useRef } from "react";

export function ConfirmDialog({
  busy,
  confirmLabel,
  description,
  onClose,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  confirmLabel: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        if (open && !busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-7 sm:p-9">
        <h2 id={`${id}-title`} className="text-2xl font-medium tracking-normal">
          {title}
        </h2>
        <p
          id={`${id}-description`}
          className="mt-3 leading-7 text-[var(--muted)]"
        >
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            className="studio-button studio-button--secondary disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={onConfirm}
            className="grid min-h-12 min-w-28 place-items-center rounded-[var(--radius-control)] bg-amber-700 px-5 py-2.5 font-medium text-white transition enabled:hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden className="invisible col-start-1 row-start-1">
              {confirmLabel}
            </span>
            <span aria-hidden className="invisible col-start-1 row-start-1">
              กำลังดำเนินการ…
            </span>
            <span className="col-start-1 row-start-1">
              {busy ? "กำลังดำเนินการ…" : confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
