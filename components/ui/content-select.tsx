"use client";

import { useLayoutEffect, useRef, type SelectHTMLAttributes } from "react";

function resizeToSelection(select: HTMLSelectElement) {
  const styles = getComputedStyle(select);
  const text = document.createElement("span");
  text.textContent = select.selectedOptions[0]?.textContent ?? "";
  Object.assign(text.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre",
    font: styles.font,
    letterSpacing: styles.letterSpacing,
    textTransform: styles.textTransform,
  });
  document.body.append(text);
  const width = text.getBoundingClientRect().width;
  text.remove();
  const inset = [
    styles.paddingLeft,
    styles.paddingRight,
    styles.borderLeftWidth,
    styles.borderRightWidth,
  ].reduce((total, value) => total + (parseFloat(value) || 0), 0);
  select.style.width = `${Math.ceil(width + inset + 2)}px`;
}

/** Keep the native popup while sizing the closed control to its selected label. */
export function ContentSelect({
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const ref = useRef<HTMLSelectElement>(null);

  useLayoutEffect(() => {
    if (ref.current) resizeToSelection(ref.current);
  });

  useLayoutEffect(() => {
    let active = true;
    const resize = () => {
      if (active && ref.current) resizeToSelection(ref.current);
    };
    void document.fonts.ready.then(resize);
    document.fonts.addEventListener("loadingdone", resize);
    return () => {
      active = false;
      document.fonts.removeEventListener("loadingdone", resize);
    };
  }, []);

  return (
    <select
      {...props}
      ref={ref}
      onChange={(event) => {
        resizeToSelection(event.currentTarget);
        onChange?.(event);
      }}
    />
  );
}
