
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

  // Data is loaded and the timeline is laid out — remove the loading screen
  var loading = document.getElementById("loading");
  if (loading) loading.parentNode.removeChild(loading);
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
