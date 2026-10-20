(function(){"use strict";
  /* One inline-SVG icon set for the whole app (owner 2026-10-20: no emoji in the UI).
     Rounded 2px strokes, currentColor, 24x24 grid. Use ChessIcons.svg(name[,cls]). */
  var P={
    undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    hint:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    turn:'<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
    plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    book:'<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z"/><path d="M12 6v14"/>',
    learn:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
    home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    soundOn:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    soundOff:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    crown:'<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/><path d="M6 21h12"/>',
    unicorn:'<path d="M12 2l2 7h-4z"/><path d="M8 11c-2 1-3 4-2 7 1 2 3 3 6 3s5-1 6-3c1-3 0-6-2-7"/><path d="M10 15h.01M14 15h.01"/>',
    mermaid:'<path d="M12 3c3 3 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6 5-9z"/><path d="M7 20c2-2 3-4 5-4s3 2 5 4"/>',
    fairy:'<path d="M12 12c-4-6-9-6-9-2s5 5 9 2zM12 12c4-6 9-6 9-2s-5 5-9 2z"/><path d="M12 12c-3 3-4 6-3 9M12 12c3 3 4 6 3 9"/>',
    space:'<path d="M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11z"/><circle cx="12" cy="9" r="1.5"/><path d="M8 14l-3 4 4-1M16 14l3 4-4-1"/>',
    planets:'<circle cx="12" cy="12" r="5"/><path d="M3 15c-1-2 4-6 11-8M21 9c1 2-4 6-11 8"/>',
    "arrow-n":'<path d="M12 20V5M6 11l6-6 6 6"/>',"arrow-s":'<path d="M12 4v15M6 13l6 6 6-6"/>',
    "arrow-e":'<path d="M4 12h15M13 6l6 6-6 6"/>',"arrow-w":'<path d="M20 12H5M11 6l-6 6 6 6"/>',
    "arrow-ne":'<path d="M6 18L18 6M9 6h9v9"/>',"arrow-nw":'<path d="M18 18L6 6M15 6H6v9"/>',
    "arrow-se":'<path d="M6 6l12 12M9 18h9V9"/>',"arrow-sw":'<path d="M18 6L6 18M15 18H6V9"/>',
    dot:'<circle cx="12" cy="12" r="3.5"/>',
    lshape:'<path d="M8 4v11h9M13 11l4 4-4 4"/>',
    pk:'<path d="M12 3v5M9.5 5.5h5"/><path d="M7 21l1.5-9h7L17 21z"/><path d="M8.5 12c0-2 1.5-4 3.5-4s3.5 2 3.5 4"/>',
    pq:'<circle cx="12" cy="5" r="1.6"/><path d="M5 9l4 4 3-6 3 6 4-4-2 12H7z"/>',
    pr:'<path d="M6 4h2v3h2V4h4v3h2V4h2v6l-2 2v6l2 3H6l2-3v-6l-2-2z"/>',
    pb:'<circle cx="12" cy="4.5" r="1.6"/><path d="M12 7c-3 2-4 5-3 7 .5 1 1.500 1.700 3 1.700s2.500-.7 3-1.700c1-2 0-5-3-7z"/><path d="M8 21h8M10 16l-1 5M14 16l1 5"/>',
    pn:'<path d="M7 21c0-5 1-8 4-10l-3-1 2-5c4 0 8 3 8 8v8z"/><path d="M12 9h.01"/>',
    pp:'<circle cx="12" cy="7" r="3"/><path d="M9 21c0-4 1-6 3-7 2 1 3 3 3 7z"/>'
  };
  function svg(name,cls){var body=P[name];if(!body)return"";return '<svg class="ci'+(cls?" "+cls:"")+'" viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+body+'</svg>';}
  function uri(name,color){var body=P[name];return "data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>');}
  window.ChessIcons={svg:svg,uri:uri,names:Object.keys(P)};
})();
