// The journey: what the child chose, and what stays true until they start over.
//
// The whole point of this object is that the companion is chosen ONCE. Every
// page after the landing page reads from here rather than offering the choice
// again. Restarting the journey is a deliberate trip back to the beginning,
// which is what makes the first choice worth making.

const KEY = 'music-book.journey';

export const journey = {
  companionId: null,
  groupId: null,
  page: 0,

  start(companionId) {
    this.companionId = companionId;
    this.groupId = null;
    this.page = 0;
    this.save();
  },

  restart() {
    this.companionId = null;
    this.groupId = null;
    this.page = 0;
    try { localStorage.removeItem(KEY); } catch (err) { /* private mode */ }
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ companionId: this.companionId }));
    } catch (err) { /* private mode: the journey just does not persist */ }
  },

  restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.companionId = JSON.parse(raw).companionId || null;
    } catch (err) { /* ignore */ }
    return this.companionId;
  }
};
