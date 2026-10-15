export function nextHeroIndex(current: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return (current + 1) % imageCount;
}

export function normalizeHeroIndex(
  requested: number,
  imageCount: number,
): number {
  if (imageCount <= 0) return 0;
  return Math.min(Math.max(requested, 0), imageCount - 1);
}
