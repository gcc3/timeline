
// Language preference is stored in localStorage
function getLang() {
  try { return localStorage.getItem('locale'); } catch (e) { return null; }
}

function setLang(lang) {
  try { localStorage.setItem('locale', lang); } catch (e) {}
  location.reload();
}

// Resolve current language and load its data file (data/<lang>.js)
if (typeof langs === 'undefined') var langs = ['en'];  // normally defined in langs.js (run setup.sh)
var lang = getLang();
if (langs.indexOf(lang) === -1) lang = 'en';
document.documentElement.lang = lang;
document.write('<script src="data/' + lang + '.js" type="text/javascript"><\/script>');

var tl = null;
function onLoad() {
  document.getElementById("title").innerText = title;
  document.title = title;

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
}

var resizeTimerID = null;
function onResize() {
  // Seems not useable
  if (resizeTimerID == null) {
    resizeTimerID = window.setTimeout(function () {
      resizeTimerID = null;
      tl.layout();
    }, 500);
  }
}
