export interface MergeableResource {
  _id: { toString(): string } | string;
  resourceType: string;
  [key: string]: unknown;
}

function comparable(value: unknown): string | number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return String(value ?? "");
}

/** Merge already sorted per-collection windows into one globally ordered page. */
export function mergeResourcePage<T extends MergeableResource>(
  pages: readonly (readonly T[])[],
  page: number,
  limit: number,
  sortField: string,
  direction: 1 | -1,
): T[] {
  return pages
    .flatMap((rows) => rows)
    .sort((a, b) => {
      const av = comparable(a[sortField]);
      const bv = comparable(b[sortField]);
      const primary = av < bv ? -1 : av > bv ? 1 : 0;
      if (primary) return primary * direction;

      const typeOrder = a.resourceType.localeCompare(b.resourceType);
      if (typeOrder) return typeOrder;
      const id = (typeof a._id === "string" ? a._id : a._id.toString()).localeCompare(
        typeof b._id === "string" ? b._id : b._id.toString(),
      );
      return id * direction;
    })
    .slice((page - 1) * limit, page * limit);
}
