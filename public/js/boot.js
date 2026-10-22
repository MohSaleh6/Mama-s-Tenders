// Runs before first paint: restores the language (?lang=en|ar, then the saved choice).
(function () {
  var d = document.documentElement;
  var lang = null;
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ar') { lang = q; localStorage.setItem('mt_lang', JSON.stringify(q)); }
    else lang = JSON.parse(localStorage.getItem('mt_lang') || 'null');
  } catch (e) {}
  if (lang === 'en') { d.lang = 'en'; d.dir = 'ltr'; }
})();
