/* Compatibility name for the 2026-09-15 rendered-body pilot.
   The shipped page loads app/asteroid-avatars.js, which is generated from the
   same masters by tools/build-rendered-bodies.py. Keep this tiny alias so the
   pilot file is not stranded while there remains one authoritative data set. */
window.RENDERED_BODIES = window.ASTEROID_AVATARS;
