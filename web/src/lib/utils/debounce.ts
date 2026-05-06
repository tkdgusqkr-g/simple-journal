export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delayMs: number,
): {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: TArgs | null = null;

  function debounced(...args: TArgs): void {
    pending = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = pending;
      pending = null;
      if (a) void fn(...a);
    }, delayMs);
  }

  debounced.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  debounced.flush = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    const a = pending;
    pending = null;
    if (a) void fn(...a);
  };

  return debounced;
}
