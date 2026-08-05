
// Language preference is stored in localStorage
function getLang() {
  try { return localStorage.getItem('locale'); } catch (e) { return null; }
}

function setLang(lang) {
  try { localStorage.setItem('locale', lang); } catch (e) {}
  location.reload();
}

// Resolve current language; its data file (data/<lang>.js) is loaded in onLoad
if (typeof langs === 'undefined') var langs = ['en'];  // normally defined in langs.js (run setup.sh)
var lang = getLang();
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

  tl = tl_init();

  document.getElementById("zoom-in").onclick = function () { zoomTimeline(true); };
  document.getElementById("zoom-out").onclick = function () { zoomTimeline(false); };
  updateScaleBar();

  // Data is loaded and the timeline is laid out — remove the loading screen
  var loading = document.getElementById("loading");
  if (loading) loading.parentNode.removeChild(loading);
}

// ---- Zoom control and map-style scale bar ----

var ZOOM_STEP = 1.5;              // zoom factor per click
var ZOOM_RANGE = [1 / 8, 8];      // clamp, relative to the scales in config.js
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
  tl.paint();
  updateScaleBar();
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
