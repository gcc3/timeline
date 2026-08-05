
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

  // Build the language switcher from langs (langs.js)
  var sw = document.getElementById("lang-switch");
  for (var i = 0; i < langs.length; i++) {
    var a = document.createElement("a");
    a.href = "javascript:setLang('" + langs[i] + "')";
    a.innerText = langs[i].toUpperCase();
    if (langs[i] === lang) a.className = "active";
    sw.appendChild(a);
  }

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
