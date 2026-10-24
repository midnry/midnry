// Runs in <head> right after the stylesheet links. If the site's own stylesheet
// fails to load (a page restored from before a release asks for a file the new
// release no longer has, or a weak connection drops the request), the page
// shows as raw unstyled text. Reload once to fetch the current page; if it
// still fails, ask for the stylesheet again instead of looping.
export const STYLE_GUARD_SCRIPT = `(function(){
  var KEY = "midnry-style-retry";
  function links(){ return [].slice.call(document.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]')); }
  function recent(){ try { return Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 60000; } catch (e) { return true; } }
  var fixing = false;
  function fix(link){
    if (fixing) return;
    fixing = true;
    if (!recent()) {
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      location.reload();
      return;
    }
    var again = document.createElement("link");
    again.rel = "stylesheet";
    again.href = link.getAttribute("href").split("?")[0] + "?r=" + Date.now();
    document.head.appendChild(again);
  }
  // A failed file still leaves an empty sheet behind, so look for rules.
  function broken(l){ try { return !l.sheet || l.sheet.cssRules.length === 0; } catch (e) { return false; } }
  function check(){ links().forEach(function(l){ if (broken(l)) fix(l); }); }
  // Scripts wait for the stylesheets above them, so they have settled by now.
  check();
  links().forEach(function(l){ l.addEventListener("error", function(){ fix(l); }); });
  window.addEventListener("load", check);
})();`;
