export const DEFAULT_PAGE_SIZE = 10;

export function getPaginationMeta(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  total: number,
) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safeTotal = Math.max(0, Math.floor(total));
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const end = safeTotal === 0 ? 0 : Math.min(currentPage * safePageSize, safeTotal);

  return {
    totalPages,
    start,
    end,
    shouldRender: safeTotal > safePageSize,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

