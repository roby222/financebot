/** Browser persistence with an in-memory fallback for restricted storage. */
export function createStorage(resolve = () => globalThis.localStorage) {
  const memory = new Map();
  const store = {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try {
        return resolve()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      value = String(value);
      memory.set(key, value);
      try {
        resolve()?.setItem(key, value);
      } catch {
        /* Session fallback remains available. */
      }
    },
    removeItem(key) {
      memory.set(key, null);
      try {
        resolve()?.removeItem(key);
      } catch {
        /* Mask stale persistent values for this session. */
      }
    },
    readJSON(key, fallback, validate = () => true) {
      try {
        const value = JSON.parse(store.getItem(key));
        return value !== null && validate(value)
          ? value
          : structuredClone(fallback);
      } catch {
        return structuredClone(fallback);
      }
    },
  };
  return store;
}

export const storage = createStorage();
