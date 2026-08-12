/* ============================================================
   Fireside Corner — home redirect helper
   One place that defines "home" for the whole site. Load this
   BEFORE app.js on every page. Login and Log Out both call
   goHome() so they always land back on the main board.
   ============================================================ */

const HOME_URL = 'lost-and-found.html';

function goHome() {
  window.location.href = HOME_URL;
}
