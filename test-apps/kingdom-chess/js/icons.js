(function(root){"use strict";
  function svg(body,label,extra){return '<svg class="ui-icon'+(extra?' '+extra:'')+'" viewBox="0 0 48 48" role="img" aria-label="'+label+'" xmlns="http://www.w3.org/2000/svg">'+body+'</svg>';}
  var stroke='fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
  var icons={
    dawn:svg('<circle cx="24" cy="24" r="8" fill="#f1bf55"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.3 4.3M33.2 33.2l4.3 4.3M37.5 10.5l-4.3 4.3M14.8 33.2l-4.3 4.3" '+stroke+'/>','Dawn'),
    dusk:svg('<path d="M34 34A17 17 0 1 1 28 8a14 14 0 0 0 6 26Z" fill="#8b88e8" stroke="currentColor" stroke-width="3"/>','Dusk'),
    unicorn:svg('<path d="m27 7 4 13-9-5Z" fill="#f1bf55" stroke="currentColor" stroke-width="2.5"/><path d="M13 38c1-13 5-21 15-21 7 0 10 5 9 12-1 7-8 11-17 9Z" fill="#fff0f7" stroke="currentColor" stroke-width="3"/><path d="M19 20c-5-2-7 2-5 6M31 20c5-3 8 0 7 5" '+stroke+'/><circle cx="29" cy="25" r="1.8"/>','Unicorn kingdom'),
    mermaid:svg('<path d="M24 7c7 0 11 5 11 12 0 9-8 10-8 17l6 5-9-1-9 1 6-5c0-7-8-8-8-17 0-7 4-12 11-12Z" fill="#66cfc6" stroke="currentColor" stroke-width="3"/><circle cx="21" cy="18" r="1.5"/><circle cx="28" cy="18" r="1.5"/><path d="M20 24c3 2 6 2 9 0" '+stroke+'/>','Mermaid kingdom'),
    fairy:svg('<path d="M24 17c-7-12-17-8-13 2 2 5 7 6 13 5M24 17c7-12 17-8 13 2-2 5-7 6-13 5M24 24c-5 8-1 16 0 18 1-2 5-10 0-18Z" fill="#cbdc75" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="14" r="5" fill="#fff4bf" stroke="currentColor" stroke-width="3"/>','Fairy kingdom'),
    space:svg('<path d="M27 7c8 7 10 17 3 25l-7 7-7-7 4-14c1-5 3-8 7-11Z" fill="#8b88e8" stroke="currentColor" stroke-width="3"/><circle cx="27" cy="19" r="4" fill="#dff8f5"/><path d="M16 28 9 34l8 1M30 31l7 6-8 1M19 39l-3 5M24 40v5" '+stroke+'/>','Space kingdom'),
    planets:svg('<circle cx="24" cy="23" r="10" fill="#efad56" stroke="currentColor" stroke-width="3"/><path d="M7 29c6 5 27 1 34-7 2-3 0-5-5-4M12 19c-4 0-6 2-4 5" '+stroke+'/>','Planets kingdom'),
    home:svg('<path d="m8 23 16-14 16 14M13 21v18h22V21M20 39V28h8v11" '+stroke+'/>','Choose kingdoms'),
    sound:svg('<path d="M8 20h8l9-8v24l-9-8H8ZM31 18c4 4 4 8 0 12M35 13c8 7 8 15 0 22" '+stroke+'/>','Sound on'),
    muted:svg('<path d="M8 20h8l9-8v24l-9-8H8ZM32 19l10 10M42 19 32 29" '+stroke+'/>','Sound off'),
    hint:svg('<path d="M24 6a13 13 0 0 0-8 23c2 2 3 4 3 7h10c0-3 1-5 3-7A13 13 0 0 0 24 6ZM19 42h10M18 36h12" '+stroke+'/><path d="M20 24h8" stroke="#f1bf55" stroke-width="4" stroke-linecap="round"/>','Hint'),
    book:svg('<path d="M7 10h12c3 0 5 2 5 5v25c0-3-2-5-5-5H7ZM41 10H29c-3 0-5 2-5 5v25c0-3 2-5 5-5h12Z" '+stroke+'/>','Book'),
    learn:svg('<path d="m6 18 18-9 18 9-18 9ZM13 23v10c7 6 15 6 22 0V23M41 19v13" '+stroke+'/>','Learn'),
    undo:svg('<path d="M18 13 8 23l10 10M9 23h19c8 0 12 5 12 13" '+stroke+'/>','Undo'),
    rotate:svg('<path d="M35 15A16 16 0 0 0 10 22M10 12v10h10M13 33a16 16 0 0 0 25-7M38 36V26H28" '+stroke+'/>','Turn board'),
    plus:svg('<path d="M24 8v32M8 24h32" '+stroke+'/>','New game'),
    sparkle:svg('<path d="M24 5c1 10 5 14 15 15-10 1-14 5-15 15-1-10-5-14-15-15 10-1 14-5 15-15ZM39 34c.4 4 2 5.6 6 6-4 .4-5.6 2-6 6-.4-4-2-5.6-6-6 4-.4 5.6-2 6-6Z" fill="#f1bf55" stroke="currentColor" stroke-width="2"/>','Stars')
  };
  root.ChessIcons={get:function(name){return icons[name]||"";},all:icons};
})(typeof globalThis!=="undefined"?globalThis:this);
