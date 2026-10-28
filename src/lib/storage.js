// Browser-profile-local storage. Financial data is encrypted before writing.

const PREFIX = "garph:";

export const storage = {
  async get(key) {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? null : { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true };
  },
};
