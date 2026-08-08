/*
 * Reveals the "failed to load" message in index.html if the app has not booted within 4 seconds after the page load event.
 *
 * This lived as an inline <script> in index.html until the production CSP blocked it. The header
 * set by hc-admin-ci's prod-server/hc-admin.conf is `script-src 'self'` with no 'unsafe-inline'
 * and no nonce, so an inline block does not execute at all — meaning the one piece of code whose
 * entire job is to report a failed boot was itself silently not running in production.
 *
 * Keep it external. Adding a hash to the CSP would work but has to be recomputed on every edit,
 * and the failure mode when someone forgets is exactly this one: silent.
 */
(function () {
  'use strict';

  function showError() {
    var errorElm = document.getElementById('jhipster-error');
    if (errorElm && errorElm.style) {
      errorElm.style.display = 'block';
    }
  }

  // `defer` guarantees this runs after the document is parsed but does not guarantee load has
  // fired, so both cases are handled — otherwise the timer never starts on a cached page.
  if (document.readyState === 'complete') {
    setTimeout(showError, 4000);
  } else {
    window.addEventListener('load', function () {
      setTimeout(showError, 4000);
    });
  }
})();
