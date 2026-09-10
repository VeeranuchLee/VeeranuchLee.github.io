// The Music World: how the catalogue is grouped for a child to browse.
//
// A group is a place, not a database filter. It has its own background, its own
// name, and its own feel. Groups can span several pages when they hold many
// works — `pageSize` is the architecture for that, and it is why a group holds
// an ordered list of piece ids rather than a query.
//
// `status: 'soon'` marks a group whose art and repertoire are not built yet.
// They are shown rather than hidden, because the shape of the world should be
// visible from the first visit — a child seeing five doors and being able to
// open one is a different thing from a child seeing one door.

export const GROUPS = [
  {
    id: 'beethoven-hall',
    focus: '50% 42%',
    knowledge: { title: 'Why four notes matter', body: "Beethoven's Fifth begins with only four notes — short, short, short, long. He then builds the whole first movement out of that one small shape, turning it upside down, passing it between instruments, hiding it in the background. Listen for it coming back." },
    title: 'Beethoven Hall',
    subtitle: 'The composer who kept writing after he could not hear.',
    background: 'assets/backgrounds/beethoven-hall.webp',
    accent: '#22385a',
    status: 'open',
    pageSize: 6,
    pieceIds: ['fur-elise', 'ode-to-joy', 'moonlight-sonata', 'symphony-5-opening'],
    composerId: 'beethoven'
  },
  {
    id: 'mozart-garden',
    focus: '18% 55%',
    knowledge: { title: 'One tune, three names', body: 'Twinkle Twinkle, the alphabet song and Baa Baa Black Sheep are the same melody with different words. Mozart wrote twelve versions of it, each one dressing the same tune in new clothes.' },
    title: 'Mozart Garden',
    subtitle: 'Tunes that sound like they were always there.',
    background: 'assets/backgrounds/music-room.webp',
    accent: '#3f6b4f',
    status: 'open',
    pageSize: 6,
    pieceIds: ['twinkle'],
    composerId: 'mozart'
  },
  {
    id: 'ballet-kingdom',
    focus: '12% 46%',
    knowledge: { title: 'Music you can dance to', body: 'Ballet music has to tell dancers what to do. A step, a leap, a spin — each one needs its own kind of beat, which is why these melodies feel like movement even when nobody is dancing.' },
    title: 'Ballet Kingdom',
    subtitle: 'Music written for dancers.',
    background: 'assets/backgrounds/garden-pastel.webp',
    accent: '#6b3f6b',
    status: 'open',
    pageSize: 6,
    pieceIds: ['swan-lake-theme'],
    composerId: 'tchaikovsky'
  },
  {
    id: 'lullaby-lane',
    focus: '14% 45%',
    title: 'Lullaby Lane',
    subtitle: 'Quiet music for the end of the day.',
    background: 'assets/backgrounds/night-piano.webp',
    accent: '#2b2f6b',
    status: 'soon',
    pageSize: 6,
    pieceIds: []
  },
  {
    id: 'around-the-world',
    focus: '10% 52%',
    title: 'Around the World',
    subtitle: 'Melodies from everywhere people sing.',
    background: 'assets/backgrounds/garden-green.webp',
    accent: '#2f6b63',
    status: 'soon',
    pageSize: 6,
    pieceIds: []
  }
];

export function groupById(id) {
  return GROUPS.find((g) => g.id === id);
}
