"use client";

import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "@/lib/pagination";

export function Pagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  onPageChange,
  pageHrefPrefix,
}: {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange?: (page: number) => void;
  pageHrefPrefix?: string;
}) {
  const meta = getPaginationMeta(page, pageSize, total);
  if (!meta.shouldRender) return null;

  const pages = Array.from({ length: meta.totalPages }, (_, index) => index + 1);
  const hrefForPage = (nextPage: number) => `${pageHrefPrefix}${nextPage}`;
  return (
    <nav
      aria-label="การแบ่งหน้า"
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-5"
    >
      <p className="text-xs text-zinc-500">
        แสดง {meta.start.toLocaleString("th-TH")}–{meta.end.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} รายการ
      </p>
      <div className="flex items-center gap-1.5">
        {pageHrefPrefix ? (
          <a
            aria-label="หน้าก่อนหน้า"
            aria-disabled={!meta.hasPrevious}
            href={meta.hasPrevious ? hrefForPage(page - 1) : undefined}
            className="grid size-9 place-items-center rounded-full border border-zinc-300 transition hover:bg-zinc-100 aria-disabled:pointer-events-none aria-disabled:opacity-30"
          >
            <RiArrowLeftLine />
          </a>
        ) : (
          <button
            type="button"
            aria-label="หน้าก่อนหน้า"
            disabled={!meta.hasPrevious}
            onClick={() => onPageChange?.(page - 1)}
            className="grid size-9 place-items-center rounded-full border border-zinc-300 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <RiArrowLeftLine />
          </button>
        )}
        {pages.map((item) => (
          pageHrefPrefix ? (
            <a
              key={item}
              aria-current={item === page ? "page" : undefined}
              href={hrefForPage(item)}
              className={`grid size-9 place-items-center rounded-full text-xs font-medium transition ${item === page ? "bg-black text-white" : "border border-zinc-200 hover:bg-zinc-100"}`}
            >
              {item}
            </a>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange?.(item)}
              className={`grid size-9 place-items-center rounded-full text-xs font-medium transition ${item === page ? "bg-black text-white" : "border border-zinc-200 hover:bg-zinc-100"}`}
            >
              {item}
            </button>
          )
        ))}
        {pageHrefPrefix ? (
          <a
            aria-label="หน้าถัดไป"
            aria-disabled={!meta.hasNext}
            href={meta.hasNext ? hrefForPage(page + 1) : undefined}
            className="grid size-9 place-items-center rounded-full border border-zinc-300 transition hover:bg-zinc-100 aria-disabled:pointer-events-none aria-disabled:opacity-30"
          >
            <RiArrowRightLine />
          </a>
        ) : (
          <button
            type="button"
            aria-label="หน้าถัดไป"
            disabled={!meta.hasNext}
            onClick={() => onPageChange?.(page + 1)}
            className="grid size-9 place-items-center rounded-full border border-zinc-300 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <RiArrowRightLine />
          </button>
        )}
      </div>
    </nav>
  );
}
