"use client";

import { useState, type ComponentProps } from "react";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { FormField } from "@/components/ui/form-field";

export function PasswordField(
  props: Omit<ComponentProps<typeof FormField>, "type">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <FormField
        {...props}
        type={visible ? "text" : "password"}
        className={`pr-14 ${props.className ?? ""}`}
      />
      <button
        type="button"
        aria-label={`${visible ? "ซ่อน" : "แสดง"}${props.label}`}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute right-2 top-8 grid size-11 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
      </button>
    </div>
  );
}
