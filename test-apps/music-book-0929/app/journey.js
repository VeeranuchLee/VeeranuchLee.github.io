// The journey: what the child chose, and what stays true until they start over.
//
// The whole point of this object is that the companion is chosen ONCE. Every
// page after the landing page reads from here rather than offering the choice
// again. Restarting the journey is a deliberate trip back to the beginning,
// which is what makes the first choice worth making.
//
// Where the child stands: a wing of the world, then a room inside it, then a
// page of that room's bubbles. The pager page is reset whenever the room
// changes and clamped on every render — a stale page outliving a room change
// is how a child lands on an empty page nobody can leave.
//
// `completedChapters` is what makes Explore a *return* mode: the architecture's
// position is that the guided chapter is the default and free exploration opens
// after it has been finished once. It persists, because a child who finished the
// chapter yesterday should not have to sit through it again to reach the room.

const KEY = 'music-book.journey';

export const journey = {
  companionId: null,
  wingId: null,
  roomId: null,
  page: 0,
  completedChapters: [],

  start(companionId) {
    this.companionId = companionId;
    this.wingId = null;
    this.roomId = null;
    this.page = 0;
    this.save();
  },

  /** The guided chapter reached its end once; Explore is open from now on. */
  finishChapter(roomId) {
    if (!this.completedChapters.includes(roomId)) this.completedChapters.push(roomId);
    this.save();
  },

  hasFinishedChapter(roomId) {
    return this.completedChapters.includes(roomId);
  },

  restart() {
    this.companionId = null;
    this.wingId = null;
    this.roomId = null;
    this.page = 0;
    this.completedChapters = [];
    try { localStorage.removeItem(KEY); } catch (err) { /* private mode */ }
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        companionId: this.companionId,
        completedChapters: this.completedChapters
      }));
    } catch (err) { /* private mode: the journey just does not persist */ }
  },

  restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.companionId = saved.companionId || null;
        this.completedChapters = Array.isArray(saved.completedChapters) ? saved.completedChapters : [];
      }
    } catch (err) { /* ignore */ }
    return this.companionId;
  }
};
