/* The release pipeline reads CACHE_NAME; do not rename it. */
const CACHE_NAME = 'periodic-table-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/tap-zoom-guard.js',
  './js/elements.js',
  './js/voice.js',
  './js/app.js',
  './data/clips.json',
  './icon-192.png',
  './icon-512.png',
  './icons/001-H.webp',
  './icons/002-He.webp',
  './icons/003-Li.webp',
  './icons/004-Be.webp',
  './icons/005-B.webp',
  './icons/006-C.webp',
  './icons/007-N.webp',
  './icons/008-O.webp',
  './icons/009-F.webp',
  './icons/010-Ne.webp',
  './icons/011-Na.webp',
  './icons/012-Mg.webp',
  './icons/013-Al.webp',
  './icons/014-Si.webp',
  './icons/015-P.webp',
  './icons/016-S.webp',
  './icons/017-Cl.webp',
  './icons/018-Ar.webp',
  './icons/019-K.webp',
  './icons/020-Ca.webp',
  './icons/021-Sc.webp',
  './icons/022-Ti.webp',
  './icons/023-V.webp',
  './icons/024-Cr.webp',
  './icons/025-Mn.webp',
  './icons/026-Fe.webp',
  './icons/027-Co.webp',
  './icons/028-Ni.webp',
  './icons/029-Cu.webp',
  './icons/030-Zn.webp',
  './icons/031-Ga.webp',
  './icons/032-Ge.webp',
  './icons/033-As.webp',
  './icons/034-Se.webp',
  './icons/035-Br.webp',
  './icons/036-Kr.webp',
  './icons/037-Rb.webp',
  './icons/038-Sr.webp',
  './icons/039-Y.webp',
  './icons/040-Zr.webp',
  './icons/041-Nb.webp',
  './icons/042-Mo.webp',
  './icons/043-Tc.webp',
  './icons/044-Ru.webp',
  './icons/045-Rh.webp',
  './icons/046-Pd.webp',
  './icons/047-Ag.webp',
  './icons/048-Cd.webp',
  './icons/049-In.webp',
  './icons/050-Sn.webp',
  './icons/051-Sb.webp',
  './icons/052-Te.webp',
  './icons/053-I.webp',
  './icons/054-Xe.webp',
  './icons/055-Cs.webp',
  './icons/056-Ba.webp',
  './icons/057-La.webp',
  './icons/058-Ce.webp',
  './icons/059-Pr.webp',
  './icons/060-Nd.webp',
  './icons/061-Pm.webp',
  './icons/062-Sm.webp',
  './icons/063-Eu.webp',
  './icons/064-Gd.webp',
  './icons/065-Tb.webp',
  './icons/066-Dy.webp',
  './icons/067-Ho.webp',
  './icons/068-Er.webp',
  './icons/069-Tm.webp',
  './icons/070-Yb.webp',
  './icons/071-Lu.webp',
  './icons/072-Hf.webp',
  './icons/073-Ta.webp',
  './icons/074-W.webp',
  './icons/075-Re.webp',
  './icons/076-Os.webp',
  './icons/077-Ir.webp',
  './icons/078-Pt.webp',
  './icons/079-Au.webp',
  './icons/080-Hg.webp',
  './icons/081-Tl.webp',
  './icons/082-Pb.webp',
  './icons/083-Bi.webp',
  './icons/084-Po.webp',
  './icons/085-At.webp',
  './icons/086-Rn.webp',
  './icons/087-Fr.webp',
  './icons/088-Ra.webp',
  './icons/089-Ac.webp',
  './icons/090-Th.webp',
  './icons/091-Pa.webp',
  './icons/092-U.webp',
  './icons/093-Np.webp',
  './icons/094-Pu.webp',
  './icons/095-Am.webp',
  './icons/096-Cm.webp',
  './icons/097-Bk.webp',
  './icons/098-Cf.webp',
  './icons/099-Es.webp',
  './icons/100-Fm.webp',
  './icons/101-Md.webp',
  './icons/102-No.webp',
  './icons/103-Lr.webp',
  './icons/104-Rf.webp',
  './icons/105-Db.webp',
  './icons/106-Sg.webp',
  './icons/107-Bh.webp',
  './icons/108-Hs.webp',
  './icons/109-Mt.webp',
  './icons/110-Ds.webp',
  './icons/111-Rg.webp',
  './icons/112-Cn.webp',
  './icons/113-Nh.webp',
  './icons/114-Fl.webp',
  './icons/115-Mc.webp',
  './icons/116-Lv.webp',
  './icons/117-Ts.webp',
  './icons/118-Og.webp',
];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE_NAME)
    .then(cache => cache.addAll(SHELL))
    .then(() => self.skipWaiting())
));

/* Cache Storage is shared by every app on this origin. Delete only this app's versions. */
const CACHE_PREFIX = 'periodic-table-v';

self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(hit => {
      return hit || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          cache.put(event.request, copy);
        }
        return response;
      });
    }))
  );
});
