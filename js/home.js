/* Home — FIG. 01: the journey of one request */

(function () {
  const packet = document.getElementById("packet");
  const log = document.getElementById("hero-log");
  const statusEl = document.getElementById("hero-status");
  const latencyNote = document.getElementById("latency-note");
  const btnSend = document.getElementById("hero-send");
  const btnAuto = document.getElementById("hero-auto");
  if (!packet) return;

  const wire = function (id) { return document.getElementById(id); };
  let running = false;
  let auto = false;
  let autoTimer = null;

  // move packet along an SVG path over `ms`, then resolve
  function travel(pathId, ms, reverse) {
    return new Promise(function (resolve) {
      const path = wire(pathId);
      const len = path.getTotalLength();
      if (BB.reduceMotion) {
        const p = path.getPointAtLength(reverse ? 0 : len);
        packet.setAttribute("cx", p.x); packet.setAttribute("cy", p.y);
        return resolve();
      }
      const t0 = performance.now();
      function step(now) {
        let k = Math.min(1, (now - t0) / ms);
        const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const at = reverse ? len * (1 - eased) : len * eased;
        const p = path.getPointAtLength(at);
        packet.setAttribute("cx", p.x);
        packet.setAttribute("cy", p.y);
        if (k < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function glow(nodeId, on) {
    const rect = document.querySelector("#" + nodeId + " rect");
    if (rect) rect.setAttribute("stroke", on ? "#ffb224" : (nodeId === "n-app" ? "#ffb224" : "#a8c3f0"));
  }

  function flashNodes(off) {
    ["n-browser", "n-dns", "n-lb", "n-cache", "n-db"].forEach(function (id) { glow(id, false); });
  }

  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, BB.reduceMotion ? 0 : ms); }); };

  async function sendRequest() {
    if (running) return;
    running = true;
    BB.mark("journey");
    btnSend.disabled = true;
    flashNodes();
    const cacheHit = Math.random() < 0.45;
    const t0 = performance.now();
    packet.setAttribute("opacity", "1");
    statusEl.textContent = "resolving hostname…";

    bbLog(log, bbNow() + '<span class="hl">browser</span> → GET https://app.example.com/profile');
    await travel("w-dns", 550); glow("n-dns", true);
    bbLog(log, bbNow() + '<span class="hl">dns</span> app.example.com = <span class="warn">203.0.113.7</span> (cached for 300s)');
    await wait(240);
    await travel("w-dns", 450, true); glow("n-dns", false);

    statusEl.textContent = "connecting to load balancer…";
    await travel("w-lb", 600); glow("n-lb", true);
    bbLog(log, bbNow() + '<span class="hl">lb</span> healthy targets: 3 · routing to <span class="warn">server-2</span> (round robin)');
    await wait(200);

    statusEl.textContent = "server handling request…";
    await travel("w-app", 500); glow("n-lb", false);
    bbLog(log, bbNow() + '<span class="hl">server-2</span> auth ok (jwt) · needs user #4092');

    if (cacheHit) {
      await travel("w-cache", 420); glow("n-cache", true);
      bbLog(log, bbNow() + '<span class="hl">cache</span> <span class="ok">HIT</span> user:4092 · 0.4 ms');
      await wait(200);
      await travel("w-cache", 380, true); glow("n-cache", false);
    } else {
      await travel("w-cache", 420); glow("n-cache", true);
      bbLog(log, bbNow() + '<span class="hl">cache</span> <span class="err">MISS</span> user:4092');
      await travel("w-cache", 380, true); glow("n-cache", false);
      await travel("w-db", 480); glow("n-db", true);
      bbLog(log, bbNow() + '<span class="hl">db</span> SELECT * FROM users WHERE id=4092 · index scan · <span class="warn">8.2 ms</span>');
      await wait(260);
      await travel("w-db", 440, true); glow("n-db", false);
      bbLog(log, bbNow() + '<span class="hl">cache</span> SET user:4092 (ttl 60s) — next time it’s a hit');
    }

    statusEl.textContent = "sending response…";
    await travel("w-app", 450, true);
    await travel("w-lb", 500, true);
    const ms = cacheHit ? (18 + Math.round(Math.random() * 14)) : (52 + Math.round(Math.random() * 40));
    bbLog(log, bbNow() + '<span class="hl">browser</span> ← <span class="ok">200 OK</span> · ' + ms + " ms · " + (cacheHit ? "served from cache ⚡" : "served from database 🗄️"));
    latencyNote.textContent = "LAST RUN: " + ms + " MS · " + (cacheHit ? "CACHE HIT" : "CACHE MISS");
    statusEl.textContent = "done — 200 OK in " + ms + " ms";
    packet.setAttribute("opacity", "0");
    btnSend.disabled = false;
    running = false;
  }

  btnSend.addEventListener("click", sendRequest);

  btnAuto.addEventListener("click", function () {
    auto = !auto;
    btnAuto.textContent = "LOOP: " + (auto ? "ON" : "OFF");
    btnAuto.classList.toggle("is-on", auto);
    clearInterval(autoTimer);
    if (auto) {
      sendRequest();
      autoTimer = setInterval(function () { if (!running) sendRequest(); }, 6500);
    }
  });

  // mark explored course-map cards
  document.querySelectorAll("[data-module]").forEach(function (card) {
    const id = card.getAttribute("data-module");
    if (BB.has(id)) {
      const d = card.querySelector(".done");
      if (d) d.textContent = "✓ EXPLORED";
    }
  });
})();
