if (typeof window !== 'undefined') {
  let hasLocalStorage = false;

  try {
    hasLocalStorage = typeof window.localStorage !== 'undefined';
  } catch {
    hasLocalStorage = false;
  }

  if (!hasLocalStorage) {
    const values = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: key => values.get(key) ?? null,
      key: index => Array.from(values.keys())[index] ?? null,
      removeItem: key => {
        values.delete(key);
      },
      setItem: (key, value) => {
        values.set(key, String(value));
      },
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  }
}
