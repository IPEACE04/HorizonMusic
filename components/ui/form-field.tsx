import { useId, type InputHTMLAttributes } from "react";

export function FormField({
  error,
  hint,
  label,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label: string;
}) {
  const generatedId = useId();
  const id = input.id ?? generatedId;
  const messageId = `${id}-message`;
  const describedBy =
    [input["aria-describedby"], error || hint ? messageId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        {...input}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : input["aria-invalid"]}
        className={`min-h-13 w-full rounded-[var(--radius-control)] border border-[var(--line)] bg-white px-4 outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 ${className}`}
      />
      {error || hint ? (
        <span
          id={messageId}
          className={`mt-2 block text-xs ${error ? "text-red-700" : "text-zinc-500"}`}
        >
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
