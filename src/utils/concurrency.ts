export type SettledMapResult<T> =
  | {
      index: number;
      status: 'fulfilled';
      value: T;
    }
  | {
      index: number;
      status: 'rejected';
      reason: unknown;
    };

export const mapWithConcurrencySettled = async <Input, Output>(
  items: Input[],
  concurrency: number,
  mapper: (item: Input, index: number) => Promise<Output>,
): Promise<Array<SettledMapResult<Output>>> => {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<SettledMapResult<Output>>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = {
          index,
          status: 'fulfilled',
          value: await mapper(items[index], index),
        };
      } catch (reason) {
        results[index] = {
          index,
          status: 'rejected',
          reason,
        };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));

  return results;
};
