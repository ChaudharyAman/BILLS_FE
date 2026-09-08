/**
 * Utility for persisting and retrieving list page filters & sorting in localStorage.
 */
export const getStoredFilter = (storageKey, key, fallback) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[key] !== undefined) return parsed[key];
    }
  } catch (e) {}
  return fallback;
};

export const setStoredFilters = (storageKey, filterObj) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(filterObj));
  } catch (e) {}
};

export const clearStoredFilters = (storageKey) => {
  try {
    localStorage.removeItem(storageKey);
  } catch (e) {}
};
