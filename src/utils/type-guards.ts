function notNull<T extends unknown>(item: T | null): item is T {
  return item !== null;
}

export function isNotNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}
