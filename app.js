
// Language preference is stored in localStorage
function getLang() {
  try { return localStorage.getItem('locale'); } catch (e) { return null; }
}

function setLang(lang) {
  try { localStorage.setItem('locale', lang); } catch (e) {}
  location.reload();
}

// First supported language among the browser's preferred ones, or null
function getBrowserLang() {
  var candidates = navigator.languages || [navigator.language || ''];
  for (var i = 0; i < candidates.length; i++) {
    var code = candidates[i].toLowerCase().split('-')[0];
    if (langs.indexOf(code) !== -1) return code;
  }
  return null;
}

// Resolve current language: stored preference, then browser language, then
// English. Its data file (data/<lang>.js) is loaded in onLoad.
if (typeof langs === 'undefined') var langs = ['en'];  // normally defined in langs.js (run setup.sh)
var lang = getLang();
if (langs.indexOf(lang) === -1) lang = getBrowserLang();
if (langs.indexOf(lang) === -1) lang = 'en';
document.documentElement.lang = lang;

var tl = null;
function onLoad() {
  // The data file can be large, so load it asynchronously: the loading screen
  // (#loading) paints first, then onDataLoaded builds the timeline.
  var script = document.createElement("script");
  script.src = "data/" + lang + ".js";
  script.onload = onDataLoaded;
  script.onerror = function () {
    var loading = document.getElementById("loading");
    if (loading) loading.innerText = "Failed to load data/" + lang + ".js";
  };
  document.head.appendChild(script);
}

function onDataLoaded() {
  document.getElementById("title").innerText = title;

  // SimileAjax.History restores its own copy of document.title asynchronously,
  // so the localized title has to replace that copy as well as the live one.
  document.title = title;
  if (window.SimileAjax && SimileAjax.History) {
    SimileAjax.History._plainDocumentTitle = title;
  }

  // Build the language dropdown from langs (langs.js):
  // a plain-text label that toggles a menu of languages
  var sw = document.getElementById("lang-switch");

  var current = document.createElement("span");
  current.id = "lang-current";
  current.innerText = lang.toUpperCase();
  sw.appendChild(current);

  var menu = document.createElement("div");
  menu.id = "lang-menu";
  for (var i = 0; i < langs.length; i++) {
    (function (code) {
      var item = document.createElement("a");
      item.innerText = code.toUpperCase();
      if (code === lang) item.className = "active";
      item.onclick = function () { setLang(code); };
      menu.appendChild(item);
    })(langs[i]);
  }
  sw.appendChild(menu);

  current.onclick = function (e) {
    e.stopPropagation();
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };
  document.addEventListener("click", function () {
    menu.style.display = "none";
  });

  patchEtherPainter();  // before the first paint inside tl_init
  tl = tl_init();
  updateGridDensity();  // match the year-line spacing to the initial scale
  tl.paint();

  document.getElementById("zoom-in").onclick = function () { zoomTimeline(true); };
  document.getElementById("zoom-out").onclick = function () { zoomTimeline(false); };
  updateScaleBar();
  initTouch();
  initHelp();

  // Data is loaded and the timeline is laid out — remove the loading screen
  var loading = document.getElementById("loading");
  if (loading) loading.parentNode.removeChild(loading);
}

// ---- Zoom control and map-style scale bar ----

var ZOOM_STEP = 1.5;              // zoom factor per click
// Clamp, relative to the scales in config.js; a timeline can override it by
// defining zoom_range in its config.js (loaded before this file).
if (typeof zoom_range === "undefined") var zoom_range = null;
var ZOOM_RANGE = zoom_range || [1 / 8, 8];
var SCALE_BAND = 2;               // the main event band drives the scale bar
var SCALE_MAX_PX = 120;           // the scale line never grows beyond this
var MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

var zoomFactor = 1;

var scaleUnits = {
  en: { year: [" year", " years"], month: [" month", " months"] },
  ja: { year: ["年", "年"], month: ["ヶ月", "ヶ月"] },
  zh: { year: ["年", "年"], month: ["个月", "个月"] }
};

// The bands define no zoomSteps and band.zoom() steps a single band alone,
// so zoom by rescaling every band's ether around the current center date.
function zoomTimeline(zoomIn) {
  var factor = zoomIn ? ZOOM_STEP : 1 / ZOOM_STEP;
  var next = zoomFactor * factor;
  if (!tl || next < ZOOM_RANGE[0] || next > ZOOM_RANGE[1]) return;
  zoomFactor = next;

  var centerDate = tl.getBand(0).getCenterVisibleDate();
  for (var i = 0; i < tl.getBandCount(); i++) {
    tl.getBand(i).getEther()._pixelsPerInterval *= factor;
  }
  tl.getBand(0).setCenterVisibleDate(centerDate);  // synced bands follow
  updateGridDensity();
  tl.paint();
  updateScaleBar();
}

// Each band's ether painter draws a vertical line every intervalUnit from
// config.js, so zooming just stretches the same lines apart until none is
// on screen. Re-pick every band's marker interval for the current scale:
// the finest "round" time span (1/2/5 steps, like the scale bar) that still
// keeps neighbouring lines at least GRID_MIN_PX apart. MONTH is the finest
// rung on purpose: day/week lines are more precision than these timelines'
// events have.

var GRID_MIN_PX = 64;

// The library's paint() rounds the first marker down in the band's time
// zone but steps to the following markers in UTC, so a month-wide step can
// land on day 30/31 and drift through JS date normalization (duplicated and
// skipped month labels). Same code, with time-zone-aware steps.
function patchEtherPainter() {
  Timeline.GregorianEtherPainter.prototype.paint = function () {
    if (this._markerLayer) this._band.removeLayerDiv(this._markerLayer);
    this._markerLayer = this._band.createLayerDiv(100);
    this._markerLayer.setAttribute("name", "ether-markers");
    this._markerLayer.style.display = "none";
    if (this._lineLayer) this._band.removeLayerDiv(this._lineLayer);
    this._lineLayer = this._band.createLayerDiv(1);
    this._lineLayer.setAttribute("name", "ether-lines");
    this._lineLayer.style.display = "none";

    var date = this._band.getMinDate();
    var maxDate = this._band.getMaxDate();
    var timeZone = this._band.getTimeZone();
    var labeller = this._band.getLabeller();
    SimileAjax.DateTime.roundDownToInterval(
      date, this._unit, timeZone, this._multiple, this._theme.firstDayOfWeek);
    while (date.getTime() < maxDate.getTime()) {
      this._intervalMarkerLayout.createIntervalMarker(
        date, labeller, this._unit, this._markerLayer, this._lineLayer);
      for (var i = 0; i < this._multiple; i++) {
        SimileAjax.DateTime.incrementByInterval(date, this._unit, timeZone);
      }
    }
    this._markerLayer.style.display = "block";
    this._lineLayer.style.display = "block";
  };
}

var gridRungs = null;  // built lazily: SimileAjax loads after this file

function getGridRungs() {
  if (gridRungs) return gridRungs;
  var DT = SimileAjax.DateTime;
  // Years use YEAR with a multiple rather than DECADE/CENTURY: the library
  // aligns YEAR multiples to the calendar (1995, 2000, ...), but ignores
  // the multiple when rounding DECADE and up, so those lines would shift
  // around as the band scrolls.
  gridRungs = [
    { unit: DT.MONTH, multiple: 1 },
    { unit: DT.MONTH, multiple: 3 },
    { unit: DT.MONTH, multiple: 6 }
  ];
  for (var mag = 1; mag <= 1000000; mag *= 10) {
    var steps = [1, 2, 5];
    for (var s = 0; s < steps.length; s++) {
      gridRungs.push({ unit: DT.YEAR, multiple: steps[s] * mag });
    }
  }
  return gridRungs;
}

function updateGridDensity() {
  var rungs = getGridRungs();
  var unitLengths = SimileAjax.DateTime.gregorianUnitLengths;

  for (var i = 0; i < tl.getBandCount(); i++) {
    var band = tl.getBand(i);
    var painter = band.getEtherPainter();
    if (!painter || !("_unit" in painter)) continue;  // not a Gregorian painter

    var ether = band.getEther();
    var msPerPixel = (ether.pixelOffsetToDate(100).getTime() -
                      ether.pixelOffsetToDate(0).getTime()) / 100;

    // The finest rung whose lines stay at least GRID_MIN_PX apart
    var pick = rungs[rungs.length - 1];
    for (var r = 0; r < rungs.length; r++) {
      if (unitLengths[rungs[r].unit] * rungs[r].multiple / msPerPixel >= GRID_MIN_PX) {
        pick = rungs[r];
        break;
      }
    }

    painter._unit = pick.unit;
    painter._multiple = pick.multiple;
  }
}

function updateScaleBar() {
  var ether = tl.getBand(SCALE_BAND).getEther();
  var msPerPixel = (ether.pixelOffsetToDate(100).getTime() -
                    ether.pixelOffsetToDate(0).getTime()) / 100;

  // Like a map scale: the largest round time span that fits in SCALE_MAX_PX
  var units = scaleUnits[lang] || scaleUnits.en;
  var span = null;
  for (var mag = 1; mag <= 1000000; mag *= 10) {
    var steps = [1, 2, 5];
    for (var s = 0; s < steps.length; s++) {
      var years = steps[s] * mag;
      var px = years * MS_PER_YEAR / msPerPixel;
      if (px <= SCALE_MAX_PX) {
        span = { px: px, label: years + units.year[years > 1 ? 1 : 0] };
      }
    }
  }
  if (span === null) {  // even 1 year is too wide: fall back to months
    var months = [6, 3, 2, 1];
    for (var m = 0; m < months.length; m++) {
      var px = months[m] * (MS_PER_YEAR / 12) / msPerPixel;
      if (px <= SCALE_MAX_PX || months[m] === 1) {
        span = { px: px, label: months[m] + units.month[months[m] > 1 ? 1 : 0] };
        break;
      }
    }
  }

  document.getElementById("scale-line").style.width = Math.round(span.px) + "px";
  document.getElementById("scale-label").innerText = span.label;
}

// ---- Touch support ----

// SIMILE Timeline predates touch screens: the bands only listen for mouse
// events, so on mobile they ignore drag gestures entirely. Replay
// single-finger touches as synthetic mouse events on the touched element
// (they bubble up to the band's handlers). Touch gestures only ever pan:
// the zoom level changes through the +/− buttons alone. styles.css sets
// touch-action: none on #timeline so the browser doesn't claim these
// gestures for page scrolling or zooming first.

var TAP_SLOP_PX = 8;    // finger jitter below this still counts as a tap

function initTouch() {
  var el = document.getElementById("timeline");
  var target = null;    // element the touch started on; null = not dragging
  var moved = false;    // exceeded TAP_SLOP_PX, so not a tap
  var startX = 0, startY = 0;

  // Each band hides an <input type="text"> (in .timeline-band-input) and
  // focuses it on mouseup so arrow keys can scroll the timeline — but on iOS
  // focusing a text input pops up the software keyboard on every tap.
  // readonly + inputmode="none" suppress the keyboard while the input still
  // takes focus and key events, so desktop arrow-key scrolling keeps working.
  var inputs = el.querySelectorAll(".timeline-band-input input");
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].readOnly = true;
    inputs[i].setAttribute("inputmode", "none");
  }

  function fire(type, touch) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window,
      clientX: touch.clientX, clientY: touch.clientY,
      screenX: touch.screenX, screenY: touch.screenY,
      button: 0
    }));
  }

  el.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) {
      target = e.target;
      moved = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      fire("mousedown", e.touches[0]);
    } else if (target) {
      // A second finger ends the drag; multi-touch is deliberately ignored
      fire("mouseup", e.touches[0]);
      target = null;
    }
  }, { passive: true });

  el.addEventListener("touchmove", function (e) {
    e.preventDefault();  // dragging pans the timeline, never scrolls the page
    if (target && e.touches.length === 1) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > TAP_SLOP_PX ||
          Math.abs(t.clientY - startY) > TAP_SLOP_PX) moved = true;
      fire("mousemove", t);
    }
  }, { passive: false });

  function onTouchEnd(e) {
    if (e.touches.length > 0) return;  // wait for the last finger to lift
    if (target) {
      var t = e.changedTouches[0];
      fire("mouseup", t);
      if (!moved && e.type !== "touchcancel") fire("click", t);
      // Also keeps the browser from replaying the tap as its own mouse
      // events ~300ms later, which would double-fire the band's handlers
      if (e.cancelable) e.preventDefault();
    }
    target = null;
  }
  el.addEventListener("touchend", onTouchEnd, { passive: false });
  el.addEventListener("touchcancel", onTouchEnd, { passive: false });
}

// ---- Keyboard shortcuts and help modal ----

var helpTexts = {
  en: { title: "Keyboard shortcuts", zoomIn: "Zoom in", zoomOut: "Zoom out",
        move: "Move the timeline", page: "Move one screen",
        ends: "Jump to the first / last event", button: "Shortcut help" },
  zh: { title: "键盘快捷键", zoomIn: "放大", zoomOut: "缩小",
        move: "移动时间线", page: "移动一屏",
        ends: "跳到最早 / 最晚事件", button: "快捷键帮助" },
  ja: { title: "キーボードショートカット", zoomIn: "拡大", zoomOut: "縮小",
        move: "タイムラインを移動", page: "1画面分移動",
        ends: "最初 / 最後のイベントへ移動", button: "ショートカットヘルプ" }
};

// PageUp/PageDown move the view by one screen of the main event band.
// _moveEther is what the library's own arrow-key and mouse-drag handlers
// call; positive distances scroll back in time, and synced bands follow.
function scrollScreen(forward) {
  if (!tl) return;
  var band = tl.getBand(SCALE_BAND);
  band._moveEther(forward ? -band._viewLength : band._viewLength);
}

// Home/End center the view on the first/last event in the data
function scrollToEdge(last) {
  if (!tl) return;
  var eventSource = tl.getBand(0).getEventSource();
  var date = last ? eventSource.getLatestDate() : eventSource.getEarliestDate();
  if (date) tl.getBand(0).setCenterVisibleDate(date);  // synced bands follow
}

function initHelp() {
  var texts = helpTexts[lang] || helpTexts.en;
  var modal = document.getElementById("help-modal");
  var button = document.getElementById("help-button");

  button.title = texts.button;
  document.getElementById("help-title").innerText = texts.title;

  // Arrow-key scrolling is the library's own; it works once a click or tap
  // has put focus on a band
  var rows = [
    [["+"], texts.zoomIn],
    [["-"], texts.zoomOut],
    [["←", "→"], texts.move],
    [["PgUp", "PgDn"], texts.page],
    [["Home", "End"], texts.ends]
  ];
  var list = document.getElementById("help-list");
  for (var i = 0; i < rows.length; i++) {
    var tr = document.createElement("tr");
    var keys = document.createElement("td");
    for (var k = 0; k < rows[i][0].length; k++) {
      if (k > 0) keys.appendChild(document.createTextNode(" / "));
      var kbd = document.createElement("kbd");
      kbd.innerText = rows[i][0][k];
      keys.appendChild(kbd);
    }
    var desc = document.createElement("td");
    desc.innerText = rows[i][1];
    tr.appendChild(keys);
    tr.appendChild(desc);
    list.appendChild(tr);
  }

  button.onclick = function () {
    modal.style.display = "flex";
  };
  modal.onclick = function (e) {
    if (e.target === modal) modal.style.display = "none";  // click outside the panel
  };

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;  // leave browser shortcuts alone
    if (e.key === "+" || e.key === "=") zoomTimeline(true);
    else if (e.key === "-" || e.key === "_") zoomTimeline(false);
    else if (e.key === "PageUp" || e.key === "PageDown") {
      scrollScreen(e.key === "PageDown");
      e.preventDefault();  // the browser would scroll the page instead
    } else if (e.key === "Home" || e.key === "End") {
      scrollToEdge(e.key === "End");
      e.preventDefault();
    } else if (e.key === "Escape") {
      modal.style.display = "none";
    }
  });
}

var resizeTimerID = null;
function onResize() {
  // Seems not useable
  if (resizeTimerID == null) {
    resizeTimerID = window.setTimeout(function () {
      resizeTimerID = null;
      if (tl) tl.layout();  // null until the data has loaded
    }, 500);
  }
}
