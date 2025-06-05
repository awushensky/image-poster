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

// Clean up old mutexes every 5 minutes
setInterval(() => {
  for (const [key, mutex] of mutexes.entries()) {
    if (mutex.isLocked()) {
      continue;
    }

    mutexes.delete(key);
  }
}, 5 * 60 * 1000);
