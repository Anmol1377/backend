/* Backend Blueprint — shared helpers: nav, progress store, scroll reveals */

window.BB = (function () {
  const KEY = "bb-progress";
  // the 23 course modules shown on the course map (journey/arcade/faq are marked but not counted)
  const COUNTED = ["http", "status", "db", "cache", "lb", "queue", "auth", "scale",
    "bigo", "hash", "stackqueue", "tree", "arraylist",
    "tls", "cors", "ratelimit", "sqli", "access", "ws", "proxy", "docker", "migrate", "sysdesign"];
  const TOTAL_MODULES = COUNTED.length;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }

  function mark(id) {
    const p = read();
    if (p[id]) return;
    p[id] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(p));
    renderNavProgress();
  }

  function count() {
    const p = read();
    return COUNTED.filter(function (id) { return p[id]; }).length;
  }
  function has(id) { return Boolean(read()[id]); }

  function renderNavProgress() {
    const el = document.querySelector("[data-nav-progress]");
    if (el) el.innerHTML = "<b>" + Math.min(count(), TOTAL_MODULES) + "</b>/" + TOTAL_MODULES + " modules explored";
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return { mark, count, has, renderNavProgress, TOTAL: TOTAL_MODULES, reduceMotion };
})();

document.addEventListener("DOMContentLoaded", function () {
  // active nav link
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });

  // mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("open"); });
  }

  BB.renderNavProgress();

  // scroll reveal
  if (!BB.reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  const yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();

  // language tabs inside deep-dive panels
  document.querySelectorAll(".code-tabs").forEach(function (tabs) {
    const group = tabs.parentElement;
    tabs.querySelectorAll(".code-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const lang = tab.getAttribute("data-lang");
        tabs.querySelectorAll(".code-tab").forEach(function (t) { t.classList.toggle("is-on", t === tab); });
        group.querySelectorAll("pre.code").forEach(function (pre) {
          pre.classList.toggle("is-on", pre.getAttribute("data-lang") === lang);
        });
      });
    });
  });
});

/* small helper for log panels */
function bbLog(el, html) {
  if (!el) return;
  const line = document.createElement("div");
  line.innerHTML = html;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 60) el.removeChild(el.firstChild);
}
function bbNow() {
  const d = new Date();
  return '<span class="t">' + d.toTimeString().slice(0, 8) + "</span> ";
}
