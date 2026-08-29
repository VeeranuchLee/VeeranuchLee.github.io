/* Toy Box — the shelf list.
 *
 * The settled structure (owner, 2026-08-28): each substantial toy is its own
 * standalone app, and this room is a navigation layer that LINKS to them.
 * One entry per toy: `href` is where the app lives (a sibling folder while
 * everything is served from one origin). `soon` entries render as honest
 * non-tappable placeholders until their app exists — and on those, `soon`
 * alone draws the "Coming soon" badge, so `subtitle` still describes the TOY.
 * The pegs card carried both and printed "Coming soon" twice on one card.
 *
 * `href` uses each toy's PUBLIC folder name, which drops the private folder's
 * `-app` suffix — `pattern-blocks-app/` publishes as `/pattern-blocks/`, the
 * convention site/README.md sets and `/pattern-pegs/` already follows live. So
 * these links resolve on the published site and NOT against a server pointed
 * at the private repository root; QA the shelf from a publish candidate laid
 * out with the public names, the way the other apps here are checked.
 *
 * `art` is a self-contained inline SVG shown on the card. It is shelf
 * decoration, deliberately NOT the toy's live geometry: the card should read
 * at 60 px, and each app draws the real thing on its own screen.
 */
(function (root) {
  'use strict';

  var TOYS = [
    {
      id: 'pattern-blocks',
      title: 'Pattern Blocks',
      subtitle: 'Build pictures with shapes',
      href: '../pattern-blocks/',
      art: '<svg viewBox="-28 -30 56 60" aria-hidden="true">'
         + '<path d="M-6 13 L6 13 L12 2.7 L6 -7.6 L-6 -7.6 L-12 2.7 Z" fill="#FFC53D" stroke="#D89B1C" stroke-width="1.6" stroke-linejoin="round"/>'
         + '<path d="M-13 -13.4 L-1 -13.4 L-7 -23.7 Z" fill="#6BCB77" stroke="#47945B" stroke-width="1.6" stroke-linejoin="round"/>'
         + '<path d="M1 -13.4 L13 -13.4 L7 -23.7 Z" fill="#4D96FF" stroke="#2F6FCC" stroke-width="1.6" stroke-linejoin="round"/>'
         + '<path d="M-20 -2 L-12 -9.2 L-4 -2 L-12 5.2 Z" fill="#FF6B6B" stroke="#D04848" stroke-width="1.6" stroke-linejoin="round"/>'
         + '<path d="M14 14 L22 14 L22 22 L14 22 Z" fill="#FF9F45" stroke="#D5761B" stroke-width="1.6" stroke-linejoin="round"/>'
         + '</svg>',
    },
    {
      /* Was a "coming soon" placeholder, and had gone stale: the app shipped
         and went live at /pattern-pegs/ (already carded on the test hub) while
         this card still said the toy was on its way. A shelf that hides a
         built toy one tap from the child is worse than no shelf. */
      id: 'pattern-pegs-and-beads',
      title: 'Pattern Pegs & Beads',
      subtitle: 'Five games with beads and pegs',
      href: '../pattern-pegs/',
      /* Beads threaded onto pegs standing in a base — the peg tops are drawn
         clear of the beads so the toy reads as pegs at 60px, not as dots. */
      art: '<svg viewBox="-28 -30 56 60" aria-hidden="true">'
         + '<rect x="-24" y="12" width="48" height="7" rx="3.5" fill="#D9CDB8"/>'
         + '<rect x="-17.2" y="-14" width="4.5" height="28" rx="2.2" fill="#C0B098"/>'
         + '<rect x="-2.2" y="-26" width="4.5" height="40" rx="2.2" fill="#C0B098"/>'
         + '<rect x="12.7" y="-14" width="4.5" height="28" rx="2.2" fill="#C0B098"/>'
         + '<circle cx="-15" cy="6" r="7.5" fill="#FF9BB3" stroke="#DE7391" stroke-width="1.4"/>'
         + '<circle cx="0" cy="6" r="7.5" fill="#6BD6C0" stroke="#43AE98" stroke-width="1.4"/>'
         + '<circle cx="15" cy="6" r="7.5" fill="#FFC53D" stroke="#D89B1C" stroke-width="1.4"/>'
         + '<circle cx="0" cy="-9" r="7.5" fill="#8FB8FF" stroke="#6690D8" stroke-width="1.4"/>'
         + '</svg>',
    },
  ];

  root.ToyBoxShelf = { TOYS: TOYS };
})(typeof window !== 'undefined' ? window : globalThis);
