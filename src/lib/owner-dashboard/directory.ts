/** Follow actual returned page sizes, including a lower PostgREST row cap. */
export async function readDirectory<T extends { user_id: string }>(page: (offset: number) => Promise<{ rows: T[]; count: number | null }>) {
  const rows: T[] = []
  while (true) {
    const result = await page(rows.length)
    if (result.count === null || result.count < 0) throw new Error('Directory count unavailable')
    rows.push(...result.rows)
    if (rows.length >= result.count) return [...new Map(rows.map(row => [row.user_id, row])).values()]
    if (!result.rows.length) throw new Error('Directory snapshot incomplete; refresh to retry')
  }
}
