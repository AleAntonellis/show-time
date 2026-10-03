type PageError = {
  message: string;
};

type PageResult<T> = {
  data: T[] | null;
  error: PageError | null;
};

const PAGE_SIZE = 1000;

/** Recupera tutte le righe PostgREST superando il limite massimo per risposta. */
export async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}
