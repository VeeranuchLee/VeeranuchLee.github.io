/* Time Book — World Clock Explorer (§2.8, time zones).
 *
 * Data, time arithmetic, spoken lines and the map. This file draws no dial and
 * builds no chapter UI: `clock.js` owns the dial, `app.js` owns the screens.
 *
 * Built against time-book/WORLD-CLOCK-EXPLORER.md, which is the owner's brief and
 * carries the reasoning for the two rules that matter most here:
 *
 *   1. NO OFFSET IS EVER STORED. Every local time, weekday and UTC offset is
 *      computed from an IANA zone id at the instant being shown. London is UTC+0
 *      in January and UTC+1 in July, and 73% of ordered city pairs change their
 *      gap at some point in a year -- a stored table would put a false fact in
 *      front of a child for half of it.
 *   2. EVERY SPOKEN STRING IN HERE IS PART OF A PAID CLIP BANK. The wording is
 *      the owner's, matched line for line against tools/estimate-voice-lines.py,
 *      which is the source of the eventual text->id map. `tools/check-voice-parity.js`
 *      fails the moment the two disagree. Do not "improve" a sentence here alone.
 */

(function (global) {
  'use strict';

  var CLOCK = global.TimeBookClock;

  /* ------------------------------------------------------------------ *
   * The places
   *
   * The owner's seventeen, plus five that fill bare continents. Still open in
   * the brief, which is exactly why nothing downstream depends on the contents:
   * the gap grid is bounded by arithmetic rather than by this list, so adding a
   * city costs one row here and no re-rendering at all.
   *
   * Honolulu and Auckland are load-bearing: they make the date line tappable
   * from both sides. Keep that property in whatever this list becomes.
   * ------------------------------------------------------------------ */

  var CITIES = [
    { name: 'Bangkok',        country: 'Thailand',          zone: 'Asia/Bangkok',        lat: 13.75,  lon: 100.50, flag: '🇹🇭' },
    { name: 'Tokyo',          country: 'Japan',             zone: 'Asia/Tokyo',          lat: 35.68,  lon: 139.69, flag: '🇯🇵' },
    { name: 'Beijing',        country: 'China',             zone: 'Asia/Shanghai',       lat: 39.90,  lon: 116.40, flag: '🇨🇳' },
    { name: 'Singapore',      country: 'Singapore',         zone: 'Asia/Singapore',      lat: 1.35,   lon: 103.82, flag: '🇸🇬' },
    { name: 'Delhi',          country: 'India',             zone: 'Asia/Kolkata',        lat: 28.61,  lon: 77.21,  flag: '🇮🇳' },
    { name: 'Dubai',          country: 'the Emirates',      zone: 'Asia/Dubai',          lat: 25.20,  lon: 55.27,  flag: '🇦🇪' },
    { name: 'Moscow',         country: 'Russia',            zone: 'Europe/Moscow',       lat: 55.76,  lon: 37.62,  flag: '🇷🇺' },
    { name: 'Cairo',          country: 'Egypt',             zone: 'Africa/Cairo',        lat: 30.04,  lon: 31.24,  flag: '🇪🇬' },
    { name: 'Nairobi',        country: 'Kenya',             zone: 'Africa/Nairobi',      lat: -1.29,  lon: 36.82,  flag: '🇰🇪' },
    { name: 'Cape Town',      country: 'South Africa',      zone: 'Africa/Johannesburg', lat: -33.92, lon: 18.42,  flag: '🇿🇦' },
    { name: 'Rome',           country: 'Italy',             zone: 'Europe/Rome',         lat: 41.90,  lon: 12.50,  flag: '🇮🇹' },
    { name: 'Paris',          country: 'France',            zone: 'Europe/Paris',        lat: 48.86,  lon: 2.35,   flag: '🇫🇷' },
    { name: 'London',         country: 'England',           zone: 'Europe/London',       lat: 51.51,  lon: -0.13,  flag: '🇬🇧' },
    { name: 'New York',       country: 'the United States', zone: 'America/New_York',    lat: 40.71,  lon: -74.01, flag: '🇺🇸' },
    { name: 'Chicago',        country: 'the United States', zone: 'America/Chicago',     lat: 41.88,  lon: -87.63, flag: '🇺🇸' },
    { name: 'Los Angeles',    country: 'the United States', zone: 'America/Los_Angeles', lat: 34.05,  lon: -118.24, flag: '🇺🇸' },
    { name: 'Mexico City',    country: 'Mexico',            zone: 'America/Mexico_City', lat: 19.43,  lon: -99.13, flag: '🇲🇽' },
    { name: 'Rio de Janeiro', country: 'Brazil',            zone: 'America/Sao_Paulo',   lat: -22.91, lon: -43.17, flag: '🇧🇷' },
    { name: 'Buenos Aires',   country: 'Argentina',         zone: 'America/Argentina/Buenos_Aires', lat: -34.60, lon: -58.38, flag: '🇦🇷' },
    { name: 'Honolulu',       country: 'Hawaii',            zone: 'Pacific/Honolulu',    lat: 21.31,  lon: -157.86, flag: '🌺' },
    { name: 'Auckland',       country: 'New Zealand',       zone: 'Pacific/Auckland',    lat: -36.85, lon: 174.76, flag: '🇳🇿' },
    { name: 'Sydney',         country: 'Australia',         zone: 'Australia/Sydney',    lat: -33.87, lon: 151.21, flag: '🇦🇺' }
  ];

  /* ------------------------------------------------------------------ *
   * Time — computed, never stored
   * ------------------------------------------------------------------ */

  /* The offset of a zone AT AN INSTANT. Done by formatting the instant in the
     zone and reading the wall clock back, rather than by asking for a
     `timeZoneName`: the parts always exist, in every engine, and there is no
     string format to parse. `% 24` because some engines render midnight as 24. */
  function offsetMinutes(zone, date) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(date).forEach(function (part) { parts[part.type] = part.value; });

    var wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
                        +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((wall - date.getTime()) / 60000);
  }

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                  'Thursday', 'Friday', 'Saturday'];

  /* Everything the panel and the voice need about one place at one instant. */
  function readZone(zone, date) {
    var offset = offsetMinutes(zone, date);
    /* Shift the instant by the offset and read it as if it were UTC. One source
       of truth for hour, minute, weekday and calendar day, so they can never
       disagree across a midnight -- which is the whole subject of this chapter. */
    var shifted = new Date(date.getTime() + offset * 60000);
    var hour = shifted.getUTCHours();

    return {
      zone: zone,
      offset: offset,
      hour24: hour,
      minute: shifted.getUTCMinutes(),
      weekday: WEEKDAYS[shifted.getUTCDay()],
      /* A plain day number, so "is their date different from ours" is one
         subtraction and never a string comparison across month ends. */
      dayNumber: Math.floor((shifted.getTime()) / 86400000),
      minutesSince12: (hour % 12) * 60 + shifted.getUTCMinutes()
    };
  }

  /* Morning starts when a child would be got up, night when they would be in bed.
     Four parts, because four is the whole bank -- see the brief. */
  function dayPart(hour24) {
    if (hour24 >= 5 && hour24 < 12) return 'morning';
    if (hour24 >= 12 && hour24 < 17) return 'afternoon';
    if (hour24 >= 17 && hour24 < 21) return 'evening';
    return 'night';
  }

  function offsetLabel(minutes) {
    var sign = minutes < 0 ? '−' : '+';
    var abs = Math.abs(minutes);
    var hours = Math.floor(abs / 60);
    var rest = abs % 60;
    return 'UTC' + sign + hours + (rest ? ':' + (rest < 10 ? '0' : '') + rest : '');
  }

  function digital(part) {
    var hour = part.hour24 % 12;
    return (hour === 0 ? 12 : hour) + ':' +
      (part.minute < 10 ? '0' : '') + part.minute +
      ' ' + (part.hour24 < 12 ? 'AM' : 'PM');
  }

  /* ------------------------------------------------------------------ *
   * The spoken lines
   *
   * Every string below is a clip in the bank. Change one and
   * tools/check-voice-parity.js goes red, which is the point of it existing.
   * ------------------------------------------------------------------ */

  /* Registers come off clock.js's own naming, so the hour and minute words can
     never drift between this chapter and the rest of the book. names() puts the
     digital reading first and, when there is one, the quarter/half form second;
     for every other minute the second entry is the "past"/"to" form. So index 0
     is register A and index 1 is register B, and at the hour they are the same
     sentence -- which is where the twelve-line overlap in the bank comes from.
     The one thing added here is the article: this book says "a quarter to
     eleven", where clock.js's older internal name has no "a". */
  function register(minutesSince12, level) {
    var forms = CLOCK.names(minutesSince12);
    var form = (level === 'past-to' && forms[1]) ? forms[1] : forms[0];
    return 'It is ' + form.replace(/^quarter /, 'a quarter ') + '.';
  }

  function placeLine(city) {
    return 'In ' + city.name + ', ' + city.country + '.';
  }

  function dayPartLine(part) {
    return 'It is ' + part + ' there.';
  }

  /* "half an hour", "two and a half hours", "three hours" -- the gap between two
     real zones is only ever a whole or a half hour. */
  function gapPhrase(minutes) {
    var abs = Math.abs(minutes);
    var whole = Math.floor(abs / 60);
    var half = abs % 60 === 30;
    if (whole === 0 && half) return 'half an hour';
    if (half) return numberWord(whole) + ' and a half hours';
    return numberWord(whole) + ' hour' + (whole === 1 ? '' : 's');
  }

  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
              'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
              'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty' };

  function numberWord(n) {
    if (n < 20) return ONES[n];
    var ten = Math.floor(n / 10) * 10;
    var rest = n % 10;
    return rest === 0 ? TENS[ten] : TENS[ten] + '-' + ONES[rest];
  }

  /* No city name, deliberately. Naming the home city would make this gap x home
     -- a product that grows as the square of the city list. "Your time" also
     matches the house pin's own label, so the child hears the words they can see.
     Owner decision, 2026-08-27. */
  function comparisonLine(gap) {
    if (gap === 0) return 'That is the same time as yours.';
    return 'That is ' + gapPhrase(gap) + ' ' +
      (gap > 0 ? 'ahead of' : 'behind') + ' your time.';
  }

  /* Three sevens, and all twenty-one are reachable: the date there can match
     home, be ahead, or be behind. */
  function dateLine(weekday, relation) {
    if (relation > 0) return 'It is already ' + weekday + ' there.';
    if (relation < 0) return 'It is still ' + weekday + ' there.';
    return 'It is ' + weekday + ' there.';
  }

  /* Fixed copy that is also spoken. It lives here rather than inline in the UI so
     that the app and the clip bank read the same strings from one place -- two
     hand-maintained lists of the same sentences quietly disagreeing is the defect
     that shipped a paid, silent clip once already. */
  var POPUP = [
    'What time should we explore?',
    'Use my local time.',
    'Pick a time.',
    'Surprise me!'
  ];

  var PROMPTS = [
    'Tap the clock to hear it again.',
    'Tap a place to visit it.'
  ];

  var NAV = [
    'Explore another place.',
    'This is your time.'
  ];

  /* The arrival line is THREE utterances -- owner decision, 2026-08-27. The gap
     and the date are not in here on purpose; they are spoken when the child taps
     the panel. Five sentences before a child touches anything was too many. */
  function arrivalLines(city, part, level) {
    return [
      register(part.minutesSince12, level),
      placeLine(city),
      dayPartLine(dayPart(part.hour24))
    ];
  }

  function panelLines(gap, weekday, relation) {
    return [comparisonLine(gap), dateLine(weekday, relation)];
  }

  /* ------------------------------------------------------------------ *
   * The map
   *
   * REAL COASTLINE DATA, generated. LAND below is built by
   * `tools/build-map.py` from Natural Earth 1:110m (public domain) -- do not
   * hand-edit it; re-run the tool.
   *
   * The map is not decoration, which is why it is data. Pins are placed by
   * projecting a city's real latitude and longitude into this same window, so
   * the coastline and the pins have to agree. An invented outline -- which is
   * what an image model produces when asked for a "world map" -- would leave a
   * child tapping Tokyo and watching the pin sit in open sea. The storybook
   * look comes from the styling instead: see `.wc-land` in styles.css, where a
   * fat round-joined stroke drawn under the fill rounds every corner off.
   *
   * The tool enforces the invariant that matters: no pin ever looks like it is
   * in the sea. Not "every city is strictly inside a polygon" -- that costs
   * Eurasia hundreds of coordinates to move a pin two pixels -- but every city
   * on land or within 4 px of a coast, on a map 1000 px wide. Today 20 of 22
   * are strictly on land and the worst miss is 0.4 px, under a 22 px pin.
   *
   * Equirectangular, cropped north of Antarctica: the poles carry no cities and
   * stretch horribly in this projection.
   * ------------------------------------------------------------------ */

  /* North stops at 77: no city is above 56N, and the Arctic coast in an
     equirectangular projection is a green wall across the top of the frame if
     you let it run to the pole. At 77 the top row of the map is 16% land, so
     there is sky above the world rather than a green band. South stops at -52
     for the same reason at the other end -- Antarctica has no cities and would
     eat a third of the map.

     These four numbers are duplicated in tools/build-map.py, which refuses to
     run if they disagree with these. */
  var MAP = { west: -170, east: 190, north: 77, south: -52 };

  function project(lat, lon, width, height) {
    var x = lon;
    /* The map runs to 190°E so that New Zealand stays whole instead of being cut
       down the middle by the antimeridian. */
    if (x < MAP.west) x += 360;
    return {
      x: ((x - MAP.west) / (MAP.east - MAP.west)) * width,
      y: ((MAP.north - lat) / (MAP.north - MAP.south)) * height
    };
  }

  /* GENERATED by tools/build-map.py -- do not hand-edit. */
  var LAND = [
    [[107,77],[114.1,75.8],[109.4,74.2],[127,73.6],[131.3,70.8],[132.3,71.8],[139.9,71.5],[139.1,72.4],[140.5,72.8],[159,70.9],[160.9,69.4],[178.6,69.4],[180,69],[180,65],[177.4,64.6],[179.5,62.6],[170.3,59.9],[163.5,59.9],[162,58.2],[163.2,57.6],[162.1,54.9],[156.8,51],[155.9,56.8],[164.5,62.6],[160.1,60.5],[159.3,61.8],[156.7,61.4],[154.2,59.8],[155,59.1],[142.2,59],[135.1,54.7],[139.9,54.2],[141.4,52.2],[138.2,46.3],[127.5,39.8],[129.1,35.1],[126.5,34.4],[126.9,36.9],[124.7,38.1],[125.3,39.6],[121.1,38.9],[121.6,40.9],[118,39.2],[118.9,37.4],[122.4,37.5],[119.2,34.9],[121.9,31.7],[121.7,28.2],[115.9,22.8],[110.4,20.3],[108.5,21.7],[105.9,19.8],[109.3,13.4],[109.2,11.7],[105.2,8.6],[100.1,13.4],[99.2,9.2],[103,5.5],[104.2,1.3],[101.4,2.8],[98.3,7.8],[97.2,16.9],[94.2,16],[94.3,18.2],[91.4,22.8],[87,21.5],[80.3,15.9],[79.9,10.4],[77.5,8],[73.5,16],[72.6,21.4],[70.5,20.9],[66.4,25.4],[57.4,25.7],[56.5,27.1],[54.7,26.5],[51.5,27.9],[50.1,30.1],[48,30],[51.8,24],[54,24.1],[56.4,26.4],[56.8,24.2],[59.8,22.3],[55.3,17.2],[43.5,12.6],[42.6,16.8],[34.6,28.1],[34.9,29.5],[33.9,27.6],[32.4,29.9],[37.5,18.6],[42.7,11.7],[44.6,10.4],[51.1,12],[51,10.6],[47.7,4.2],[39.2,-4.7],[40.8,-14.7],[34.8,-19.8],[35.6,-23.7],[32.6,-25.7],[32.2,-28.8],[25.8,-33.9],[18.4,-34.1],[11.8,-18.1],[13.7,-10.7],[11.9,-5],[8.8,-1.1],[9.4,3.7],[5.9,4.3],[4.3,6.3],[-9,4.8],[-16.6,12.2],[-17.6,14.7],[-16.1,18.1],[-17,21.9],[-5.9,35.8],[-2.2,35.2],[9.5,37.4],[11.1,36.9],[10.3,33.8],[19.1,30.3],[21.5,32.8],[33.8,31],[36.2,36.7],[27.6,36.7],[26.2,39.5],[33.5,42],[38.3,40.9],[41.7,42],[36.7,45.2],[39.1,47.3],[35,46.3],[36.3,45.1],[33.9,44.4],[32.5,45.3],[33.3,46.1],[30.7,46.6],[27.7,42.6],[28.8,41.1],[22.6,40.3],[24,37.7],[22.5,36.4],[19.5,41.7],[13.1,45.7],[12.6,44.1],[18.5,40.2],[16.9,40.4],[16.1,38],[15.4,40],[8.9,44.4],[3.1,43.1],[-2.1,36.7],[-8.9,36.9],[-9.4,43],[-1.4,44],[-1.2,46],[-4.6,48.7],[-1.6,48.6],[-1.9,49.8],[8.1,53.5],[8.5,57.1],[10.6,57.7],[9.7,55.5],[10.9,54],[19.7,54.4],[21.3,55.2],[21.6,57.4],[24.1,57],[23.3,59.2],[29.1,60],[21.3,60.7],[21.5,63.2],[25.4,65.1],[22.2,65.7],[17.8,62.7],[17.1,61.3],[18.8,60.1],[15.9,56.1],[12.9,55.4],[10.4,59.5],[5.7,58.6],[5,62],[14.8,67.8],[24.5,71],[40.3,67.9],[41.1,66.8],[40,66.3],[33.2,66.6],[37,63.8],[37.2,65.1],[39.6,64.5],[42.1,66.5],[43.9,66.1],[43.5,68.6],[46.3,68.3],[46.3,66.7],[53.7,68.9],[59.9,68.3],[60.6,69.9],[68.5,68.1],[66.7,71],[69.2,72.8],[72.6,72.8],[71.8,71.4],[73.7,68.4],[71.3,66.3],[72.4,66.2],[75.1,67.8],[73.1,71.4],[74.7,72.8],[76.4,71.2],[77.6,72.3],[81.5,71.8],[80.5,73.6],[86.8,73.9],[86,74.5],[87.2,75.1]],
    [[-90.5,69.5],[-87.4,67.2],[-85.5,69.9],[-82.6,69.7],[-81.3,67.6],[-85.8,66.6],[-93.2,62],[-94.7,58.9],[-92.3,57.1],[-82.3,55.1],[-79.9,51.2],[-78.6,52.6],[-79.8,54.7],[-76.5,56.5],[-78.5,58.8],[-77.3,59.9],[-78.1,62.3],[-73.8,62.4],[-69.6,61.1],[-69.3,59],[-67.6,58.2],[-64.6,60.3],[-61.8,56.3],[-57.3,54.6],[-55.7,52.1],[-60,50.2],[-66.4,50.2],[-71.1,46.8],[-65.1,49.2],[-64.5,46.2],[-61.5,45.9],[-60.5,47],[-59.8,45.9],[-65.4,43.5],[-66.2,44.5],[-64.4,45.3],[-67.1,45.1],[-70.7,43],[-70,41.6],[-75.5,39.5],[-75.9,37.2],[-76.3,39.2],[-75.7,35.6],[-81.3,31.4],[-80.4,25.2],[-84.1,30.1],[-93.8,29.7],[-96.6,28.3],[-97.9,22.4],[-96.3,19.3],[-92,18.7],[-90.3,21],[-87.1,21.5],[-88.9,15.9],[-83.4,15.3],[-83.8,11.1],[-81.4,8.8],[-76.8,8.6],[-71.8,12.4],[-71.7,9.1],[-69.9,12.2],[-68.2,10.6],[-61.9,10.7],[-62.4,9.9],[-57.1,6],[-51.3,4.2],[-50.4,-0.1],[-44.9,-1.6],[-44.6,-2.7],[-40,-2.9],[-35.6,-5.1],[-34.7,-7.3],[-38.7,-13.1],[-40.9,-21.9],[-47.6,-24.9],[-48.9,-28.7],[-53.8,-34.4],[-58.4,-33.9],[-56.7,-36.4],[-57.7,-38.2],[-62.3,-38.8],[-62.1,-40.7],[-65.1,-41.1],[-63.5,-42.6],[-67.3,-45.6],[-65.6,-47.2],[-69.1,-50.7],[-68.6,-52],[-75.1,-52],[-75.5,-50.4],[-74.1,-46.9],[-75.6,-46.6],[-72.7,-42.4],[-74.3,-43.2],[-71.4,-32.4],[-70.2,-19.8],[-71.5,-17.4],[-76,-14.6],[-81.2,-6.1],[-79.8,-2.7],[-80.9,-1.1],[-77.1,3.8],[-78.2,8.3],[-79.6,8.9],[-80.9,7.2],[-85.7,9.9],[-87.5,13.3],[-103.5,18.3],[-113.9,31.6],[-114.8,31.8],[-114.7,30.2],[-109.4,23.4],[-112.2,24.7],[-117.3,33],[-120.6,34.6],[-124.4,40.3],[-124.7,48.2],[-122.6,47.1],[-122.8,49],[-127.4,50.8],[-134.1,58.1],[-147.1,60.9],[-151.7,59.2],[-150.6,61.3],[-158.4,56],[-164.8,54.4],[-157,58.9],[-162,58.7],[-166.1,61.5],[-160.8,64.8],[-168.1,65.7],[-161.7,66.1],[-166.8,68.4],[-156.6,71.4],[-136.5,68.9],[-128.1,70.5],[-108.9,67.4],[-106.2,68.8],[-101.5,67.6],[-97.7,68.6],[-96.1,67.3],[-94.2,69.1],[-96.5,70.1],[-95.2,71.9]],
    [[143.6,-13.8],[145.4,-15],[146.4,-19],[153.1,-26.1],[152.9,-31.6],[150,-37.4],[146.3,-39],[140.6,-38],[138.2,-34.4],[136.8,-35.3],[137.8,-32.9],[136,-34.9],[131.3,-31.5],[118,-35.1],[115,-34.2],[115.7,-31.6],[113.3,-26.1],[114.2,-26.3],[114.1,-21.8],[120.9,-19.7],[125.7,-14.2],[129.6,-15],[132.4,-11.1],[136.5,-11.9],[135.5,-15],[140.2,-17.7],[142.1,-11]],
    [[-18.5,77],[-21.7,76.6],[-19.8,76.1],[-20.7,75.2],[-19.4,74.3],[-23.6,73.3],[-22.3,72.2],[-24.8,72.3],[-21.8,70.7],[-25.5,71.4],[-26.4,70.2],[-22.3,70.1],[-39.8,65.5],[-42.8,62.7],[-43.4,60.1],[-44.8,60],[-51.6,63.6],[-54,67.2],[-50.9,69.9],[-54.7,69.6],[-54.4,70.8],[-51.4,70.6],[-55.8,71.7],[-54.7,72.6],[-58.6,75.5],[-71.4,77]],
    [[-86.6,73.2],[-82.3,73.8],[-80.7,72.1],[-72.2,71.6],[-67.9,70.1],[-67,69.2],[-68.8,68.7],[-61.9,66.9],[-63.9,65],[-68,66.3],[-64.7,63.4],[-68.8,63.7],[-66.2,61.9],[-74.8,64.7],[-77.7,64.2],[-77.9,65.3],[-74,65.5],[-72.9,67.7],[-79,70.2],[-88.7,70.4],[-90.2,72.2]],
    [[134.1,-1.2],[135.5,-3.4],[138.3,-1.7],[144.6,-3.9],[150.7,-10.6],[144.7,-7.6],[142.6,-9.3],[137.6,-8.4],[138.7,-7.3],[137.9,-5.4],[133,-4.1],[132,-2.8],[133.7,-2.2],[130.5,-0.9]],
    [[117.9,1.8],[119,0.9],[117.8,0.8],[116.1,-4],[110.2,-2.9],[109.1,-0.5],[109.7,2],[113,3.1],[116.7,6.9],[119.2,5.4],[117.3,3.2]],
    [[50.1,-13.6],[47.1,-24.9],[44,-25],[43.3,-22.1],[44.4,-16.2],[47.7,-14.6],[49.2,-12]],
    [[-114.2,73.1],[-108.2,71.7],[-108.4,73.1],[-106.5,73.1],[-101.1,69.6],[-116.1,69.2],[-117.3,70],[-112.4,70.4],[-119.4,71.6]],
    [[105.8,-5.9],[102.6,-4.2],[95.3,5.5],[97.5,5.2],[103.8,0.1],[106.1,-3.1]],
    [[-3,58.6],[-4.1,57.6],[-2,57.7],[-3.1,56],[1.7,52.7],[1.4,51.3],[-5.2,50],[-3.4,51.4],[-5.3,52],[-4.6,53.5],[-2.9,54],[-6.1,56.8],[-5,58.6]],
    [[141,37.1],[140.3,35.1],[135.8,33.5],[135.1,34.6],[131,33.9],[132,33.1],[130.2,31.4],[129.4,33.3],[139.4,38.2],[140.3,41.2],[141.9,40]],
    [[57.5,70.7],[51.6,71.5],[55.6,75.1],[68.9,76.5],[58.5,74.3],[55.4,72.4]],
    [[-120.5,71.4],[-125.9,71.9],[-123.9,73.7],[-124.9,74.3],[-117.6,74.2],[-115.5,73.5]],
    [[-14.5,66.5],[-13.6,65.1],[-18.7,63.5],[-22.8,64],[-21.8,64.4],[-24,64.9],[-22.2,65.4],[-24.3,65.6]],
    [[185,66.6],[190,66],[187,64.3],[181.3,66.1],[180,65],[180,69]],
    [[-94.3,77],[-79.8,74.9],[-92.4,74.8],[-97.1,76.8]],
    [[173,-40.9],[174.2,-41.3],[173.1,-43.9],[169.3,-46.6],[166.7,-46.2]],
    [[174.6,-36.2],[178.5,-37.7],[175.2,-41.7],[173.8,-39.5],[174.7,-37.4],[172.6,-34.5]],
    [[-108.2,76.2],[-105.9,76],[-106.3,75],[-117.7,75.2],[-115.4,76.5]],
    [[143.6,50.7],[144.7,49],[143.2,49.3],[143.5,46.1],[142.1,46],[141.7,53.3],[142.7,54.4]],
    [[-156.3,20.5],[-158.4,20.5],[-159.5,22.2],[-157.9,22.7]],
  ];

  /* The UTC instant at which a given wall clock reads `hh:mm` in `zone`, on the
     zone's own calendar day y/m/d. Solved rather than computed, because the
     offset depends on the very instant being looked for. Two passes settle it
     everywhere except the one ambiguous hour a year when clocks go back, where
     either answer is defensible and the child sees a real time either way. */
  function instantFor(zone, year, month, day, hour, minute) {
    var wall = Date.UTC(year, month, day, hour, minute);
    var guess = wall;
    for (var i = 0; i < 2; i += 1) {
      guess = wall - offsetMinutes(zone, new Date(guess)) * 60000;
    }
    return new Date(guess);
  }

  /* The zone this device is in. Not necessarily one of the cities above -- the
     gap arithmetic works from the zone regardless, and only the house pin needs
     a place on the map. */
  function deviceZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';
    } catch (err) {
      return 'Asia/Bangkok';
    }
  }

  function cityForZone(zone) {
    for (var i = 0; i < CITIES.length; i += 1) {
      if (CITIES[i].zone === zone) return CITIES[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Drawing the map
   * ------------------------------------------------------------------ */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svg(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  var MAP_W = 1000;
  var MAP_H = Math.round(MAP_W * (MAP.north - MAP.south) / (MAP.east - MAP.west));

  /* Builds the map once. `onPick` fires with a city when one is tapped.
     Every pin gets a transparent hit circle far larger than the mark it carries:
     the drawing is for the eye, the target is for a six-year-old's finger, and
     the brief is explicit that shrinking the mark must never shrink the target. */
  function buildMap(onPick) {
    var root = svg('svg', {
      class: 'wc-map-svg',
      viewBox: '0 0 ' + MAP_W + ' ' + MAP_H,
      role: 'group',
      'aria-label': 'World map. Tap a place to visit it.'
    });

    root.appendChild(svg('rect', {
      class: 'wc-ocean', x: 0, y: 0, width: MAP_W, height: MAP_H, rx: 18
    }));

    LAND.forEach(function (shape) {
      var points = shape.map(function (pair) {
        var at = project(pair[1], pair[0], MAP_W, MAP_H);
        return at.x.toFixed(1) + ',' + at.y.toFixed(1);
      }).join(' ');
      root.appendChild(svg('polygon', { class: 'wc-land', points: points }));
    });

    var pins = svg('g', { class: 'wc-pins' });
    root.appendChild(pins);

    var chips = svg('g', { class: 'wc-chips' });
    root.appendChild(chips);

    var marks = CITIES.map(function (city) {
      var at = project(city.lat, city.lon, MAP_W, MAP_H);
      var group = svg('g', {
        class: 'wc-pin',
        transform: 'translate(' + at.x.toFixed(1) + ',' + at.y.toFixed(1) + ')',
        role: 'button',
        tabindex: '0',
        'aria-label': city.name + ', ' + city.country
      });
      /* Teardrop: a circle sitting on a point, drawn from the tip upwards. */
      group.appendChild(svg('path', {
        class: 'wc-pin-body',
        d: 'M0 0 L-9 -14 A11 11 0 1 1 9 -14 Z'
      }));
      group.appendChild(svg('circle', { class: 'wc-pin-eye', cx: 0, cy: -18, r: 4 }));
      group.appendChild(svg('circle', {
        class: 'wc-pin-hit', cx: 0, cy: -12, r: 34
      }));
      group.addEventListener('click', function () { onPick(city); });
      group.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick(city);
        }
      });
      pins.appendChild(group);
      return { city: city, at: at, group: group };
    });

    return { root: root, marks: marks, chips: chips, width: MAP_W, height: MAP_H };
  }

  /* Time chips, placed greedily and only where they fit.
     Twenty-two labels on a 768-px-wide iPad collide badly around Europe, so the
     current place and home are placed first and always, and the rest take any
     space left. A pin with no chip is still a pin, and still tappable -- the
     alternative is a map a child cannot read at all. */
  function layoutChips(map, labelFor, priorityNames) {
    while (map.chips.firstChild) map.chips.removeChild(map.chips.firstChild);

    var taken = [];
    var order = map.marks.slice().sort(function (a, b) {
      var pa = priorityNames.indexOf(a.city.name);
      var pb = priorityNames.indexOf(b.city.name);
      if (pa !== pb) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return a.at.x - b.at.x;
    });

    order.forEach(function (mark) {
      var text = labelFor(mark.city);
      if (!text) return;

      var width = 12 + text.length * 9.5;
      var height = 26;
      var box = {
        x: mark.at.x - width / 2,
        y: mark.at.y + 6,
        w: width,
        h: height
      };
      /* Nudge back inside the frame rather than dropping an edge city. */
      if (box.x < 2) box.x = 2;
      if (box.x + box.w > map.width - 2) box.x = map.width - 2 - box.w;

      var clash = taken.some(function (other) {
        return !(box.x + box.w < other.x || other.x + other.w < box.x ||
                 box.y + box.h < other.y || other.y + other.h < box.y);
      });
      if (clash) return;
      taken.push(box);

      var group = svg('g', {
        class: 'wc-chip' + (priorityNames.indexOf(mark.city.name) === 0 ? ' is-here' : '')
      });
      group.appendChild(svg('rect', {
        x: box.x.toFixed(1), y: box.y.toFixed(1),
        width: box.w.toFixed(1), height: box.h, rx: 9
      }));
      var label = svg('text', {
        x: (box.x + box.w / 2).toFixed(1), y: (box.y + 18).toFixed(1),
        'text-anchor': 'middle'
      });
      label.textContent = text;
      group.appendChild(label);
      map.chips.appendChild(group);
    });
  }

  global.TimeBookWorld = {
    CITIES: CITIES,
    LAND: LAND,
    MAP: MAP,
    project: project,
    readZone: readZone,
    offsetMinutes: offsetMinutes,
    offsetLabel: offsetLabel,
    dayPart: dayPart,
    digital: digital,
    register: register,
    placeLine: placeLine,
    dayPartLine: dayPartLine,
    comparisonLine: comparisonLine,
    dateLine: dateLine,
    gapPhrase: gapPhrase,
    arrivalLines: arrivalLines,
    panelLines: panelLines,
    WEEKDAYS: WEEKDAYS,
    POPUP: POPUP,
    PROMPTS: PROMPTS,
    NAV: NAV,
    instantFor: instantFor,
    deviceZone: deviceZone,
    cityForZone: cityForZone,
    buildMap: buildMap,
    layoutChips: layoutChips
  };
}(typeof window !== 'undefined' ? window : globalThis));
