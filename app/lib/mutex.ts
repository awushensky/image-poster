import { Mutex } from "async-mutex";


const mutexes = new Map<string, Mutex>();

/**
 * Despite appearances, this method is safe to call concurrently because
 * javascript is single threaded. Multithreading becomes an issue with
 * async methods, which this is not.
 */
export function getMutex(purpose: string, uniqueKey: string): Mutex {
  const key = `${purpose}:${uniqueKey}`;
  if (!mutexes.has(key)) {
    mutexes.set(key, new Mutex());
  }

  return mutexes.get(key)!;
}
