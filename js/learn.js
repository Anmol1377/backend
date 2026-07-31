/* Backend Core — FIGS 02–09 */

/* ============ FIG 02 · HTTP request builder ============ */
(function () {
  const methodEl = document.getElementById("http-method");
  const pathEl = document.getElementById("http-path");
  const raw = document.getElementById("http-raw");
  const btn = document.getElementById("http-send");
  if (!btn) return;

  let count = 0;

  // tiny simulated API
  function simulate(method, path) {
    const R = function (status, text, body, note) { return { status: status, text: text, body: body, note: note }; };
    if (path === "/users") {
      if (method === "GET") return R(200, "OK", '[{"id":42,"name":"Ada"},{"id":7,"name":"Linus"}]', "GET on a collection returns a list.");
      if (method === "POST") return R(201, "Created", '{"id":101,"name":"(new user)"}', "201 = created. Note the Location header pointing at the new resource.");
      if (method === "PUT") return R(405, "Method Not Allowed", '{"error":"cannot PUT a whole collection"}', "You replace one resource, not the whole collection.");
      if (method === "DELETE") return R(405, "Method Not Allowed", '{"error":"refusing to delete ALL users"}', "APIs almost never allow deleting a collection.");
    }
    if (path === "/users/42") {
      if (method === "GET") return R(200, "OK", '{"id":42,"name":"Ada","role":"admin"}', "One resource, addressed by id.");
      if (method === "PUT") return R(200, "OK", '{"id":42,"name":"Ada (updated)"}', "PUT replaces the resource with what you send.");
      if (method === "DELETE") return R(204, "No Content", "", "204 = success, nothing to say back. Empty body is intentional.");
      if (method === "POST") return R(409, "Conflict", '{"error":"user 42 already exists"}', "POSTing to an existing resource is usually a conflict.");
    }
    if (path === "/users/999") {
      return R(404, "Not Found", '{"error":"no user with id 999"}', "404 is a client error: the path names something that doesn't exist.");
    }
    if (path === "/login") {
      if (method === "POST") return R(200, "OK", '{"token":"eyJhbGciOi...sig"}', "Login returns a token — see FIG. 08 for what's inside it.");
      return R(405, "Method Not Allowed", '{"error":"login requires POST"}', "Credentials go in a POST body, never in a GET URL (URLs end up in logs!).");
    }
    if (path === "/admin/metrics") {
      if (Math.random() < 0.5) return R(401, "Unauthorized", '{"error":"missing bearer token"}', "401 = who are you? Authenticate first.");
      return R(403, "Forbidden", '{"error":"requires role: admin"}', "403 = I know who you are, and the answer is no.");
    }
    return R(500, "Internal Server Error", '{"error":"unhandled route"}', "A 500 means the server itself broke. Check the server logs, not the client.");
  }

  function badgeClass(s) { return s < 300 ? "ok" : (s < 500 ? "warn" : "err"); }

  btn.addEventListener("click", function () {
    BB.mark("http");
    const m = methodEl.value, p = pathEl.value;
    const res = simulate(m, p);
    count++;
    document.getElementById("http-count").textContent = count;
    document.getElementById("http-last").innerHTML = 'last status <b class="' + (res.status < 400 ? "good" : "bad") + '">' + res.status + "</b>";

    raw.innerHTML = "";
    const lines = [
      '<span class="warn">─── request ───────────────────────</span>',
      '<span class="hl">' + m + " " + p + " HTTP/1.1</span>",
      "Host: api.example.com",
      "Accept: application/json",
    ];
    if (m === "POST" || m === "PUT") lines.push("Content-Type: application/json", "", p === "/login" ? '{"email":"ada@example.com","password":"••••••"}' : '{"name":"Ada"}');
    lines.push("", '<span class="warn">─── response ──────────────────────</span>',
      '<span class="' + badgeClass(res.status) + '">HTTP/1.1 ' + res.status + " " + res.text + "</span>",
      "Content-Type: application/json");
    if (res.status === 201) lines.push("Location: /users/101");
    lines.push("", res.body || "(empty body)", "", '<span class="t">// ' + res.note + "</span>");

    let i = 0;
    (function type() {
      if (i >= lines.length) return;
      bbLog(raw, lines[i++]);
      setTimeout(type, BB.reduceMotion ? 0 : 60);
    })();
  });
})();

/* ============ FIG 03 · Status codes ============ */
(function () {
  const grid = document.getElementById("status-grid");
  if (!grid) return;
  const CODES = [
    [100, "Continue", "Keep going — send the rest of your request."],
    [200, "OK", "The everyday success. Request understood, here's your data."],
    [201, "Created", "POST worked; a new resource now exists. Response usually includes where it lives."],
    [204, "No Content", "Success with nothing to return — the classic reply to DELETE."],
    [301, "Moved Permanently", "This URL retired. Browsers & search engines remember the new address forever."],
    [302, "Found", "Temporary detour — go here for now, but keep using the old URL."],
    [304, "Not Modified", "Your cached copy is still fresh. Server sends no body: a bandwidth-free win."],
    [400, "Bad Request", "The server can't parse what you sent — malformed JSON, missing field."],
    [401, "Unauthorized", "Who are you? No/invalid credentials. (Really means 'unauthenticated'.)"],
    [403, "Forbidden", "I know exactly who you are — and you may not do this."],
    [404, "Not Found", "The path names nothing. The most famous number on the internet."],
    [409, "Conflict", "Your change collides with current state — e.g. username already taken."],
    [418, "I'm a teapot", "An April Fools' RFC from 1998 that servers still ship. Backend humor."],
    [429, "Too Many Requests", "Rate limited. Slow down — check the Retry-After header."],
    [500, "Internal Server Error", "The code threw. The bug is on the server side — go read the logs."],
    [502, "Bad Gateway", "A proxy/load balancer asked the app server and got garbage or nothing back."],
    [503, "Service Unavailable", "Server up but overloaded or in maintenance. Usually temporary."],
    [504, "Gateway Timeout", "The upstream server took too long. Somewhere a query is running forever…"],
  ];
  const detail = document.getElementById("status-detail");
  CODES.forEach(function (c) {
    const b = document.createElement("button");
    b.className = "cell";
    b.style.cursor = "pointer";
    b.textContent = c[0];
    b.setAttribute("aria-label", c[0] + " " + c[1]);
    b.addEventListener("click", function () {
      BB.mark("status");
      grid.querySelectorAll(".cell").forEach(function (x) { x.classList.remove("hot"); });
      b.classList.add("hot");
      const cls = c[0] < 300 ? "ok" : c[0] < 400 ? "warn" : "err";
      detail.innerHTML = '<div><span class="' + cls + '">' + c[0] + " " + c[1] + '</span></div><div class="hl">' + c[2] + "</div>" +
        '<div class="t">class: ' + String(c[0])[0] + "xx — " + ({1:"informational",2:"success",3:"redirection",4:"client error (fix the request)",5:"server error (fix the server)"})[String(c[0])[0]] + "</div>";
    });
    grid.appendChild(b);
  });
})();

/* ============ FIG 04 · DB index race ============ */
(function () {
  const btn = document.getElementById("db-race");
  if (!btn) return;
  const rowsEl = document.getElementById("db-rows");
  const rowsLabel = document.getElementById("db-rows-label");
  const scanBar = document.getElementById("db-scan-bar");
  const hopsEl = document.getElementById("db-hops");
  const scanOps = document.getElementById("db-scan-ops");
  const indexOps = document.getElementById("db-index-ops");
  const verdict = document.getElementById("db-verdict");
  let racing = false;

  rowsEl.addEventListener("input", function () { rowsLabel.textContent = rowsEl.value; });

  btn.addEventListener("click", function () {
    if (racing) return;
    racing = true;
    BB.mark("db");
    const n = parseInt(rowsEl.value, 10);
    const target = 1 + Math.floor(Math.random() * n);
    document.getElementById("db-target").textContent = target;
    const hops = Math.max(1, Math.ceil(Math.log2(n)));
    verdict.textContent = "racing…";
    scanBar.style.transition = "none";
    scanBar.style.width = "0%";
    hopsEl.innerHTML = "";
    scanOps.textContent = "0";
    indexOps.textContent = "0";

    // index hops appear quickly
    let h = 0;
    const hopTimer = setInterval(function () {
      h++;
      const c = document.createElement("div");
      c.className = "cell";
      c.textContent = h < hops ? "→" : "✓";
      if (h === hops) c.classList.add("ok-cell");
      hopsEl.appendChild(c);
      indexOps.textContent = h;
      if (h >= hops) clearInterval(hopTimer);
    }, BB.reduceMotion ? 1 : 160);

    // scan crawls proportional to target position
    const frac = target / n;
    const scanMs = BB.reduceMotion ? 10 : Math.min(6000, 1200 + n * 0.9) * frac;
    requestAnimationFrame(function () {
      scanBar.style.transition = "width " + scanMs + "ms linear";
      scanBar.style.width = (frac * 100).toFixed(1) + "%";
    });
    const t0 = performance.now();
    const opsTimer = setInterval(function () {
      const k = Math.min(1, (performance.now() - t0) / scanMs);
      scanOps.textContent = Math.round(target * k);
      if (k >= 1) {
        clearInterval(opsTimer);
        const ratio = Math.max(1, Math.round(target / hops));
        verdict.innerHTML = 'index was <b>' + ratio + "×</b> cheaper";
        racing = false;
      }
    }, 60);
  });
})();

/* ============ FIG 05 · LRU cache ============ */
(function () {
  const slotsEl = document.getElementById("cache-slots");
  if (!slotsEl) return;
  const log = document.getElementById("cache-log");
  const CAP = 4;
  let cache = []; // front = most recent
  let hits = 0, misses = 0;

  function render(evicted, touched) {
    slotsEl.innerHTML = "";
    for (let i = 0; i < CAP; i++) {
      const c = document.createElement("div");
      c.className = "cell";
      c.style.minWidth = "72px";
      if (cache[i]) {
        c.textContent = "user:" + cache[i].slice(1);
        if (cache[i] === touched) c.classList.add("hot");
      } else {
        c.textContent = "·";
        c.classList.add("dim");
      }
      slotsEl.appendChild(c);
    }
    const tag = document.createElement("div");
    tag.className = "cell dim";
    tag.style.border = "none";
    tag.style.background = "transparent";
    tag.textContent = evicted ? ("→ 🗑 user:" + evicted.slice(1)) : "";
    slotsEl.appendChild(tag);
  }

  document.querySelectorAll(".cache-req").forEach(function (b) {
    b.addEventListener("click", function () {
      BB.mark("cache");
      const k = b.getAttribute("data-k");
      const idx = cache.indexOf(k);
      let evicted = null;
      if (idx !== -1) {
        hits++;
        cache.splice(idx, 1);
        cache.unshift(k);
        bbLog(log, bbNow() + '<span class="ok">HIT</span>  user:' + k.slice(1) + " · 0.3 ms · moved to front");
      } else {
        misses++;
        if (cache.length >= CAP) {
          evicted = cache.pop();
          bbLog(log, bbNow() + '<span class="err">MISS</span> user:' + k.slice(1) + ' · 9 ms (db) · evicted <span class="warn">user:' + evicted.slice(1) + "</span> (least recent)");
        } else {
          bbLog(log, bbNow() + '<span class="err">MISS</span> user:' + k.slice(1) + " · 9 ms (db) · cached");
        }
        cache.unshift(k);
      }
      document.getElementById("cache-hits").textContent = hits;
      document.getElementById("cache-misses").textContent = misses;
      document.getElementById("cache-rate").textContent = Math.round((hits / (hits + misses)) * 100) + "%";
      render(evicted, k);
    });
  });
  render();
})();

/* ============ FIG 06 · Load balancer ============ */
(function () {
  const startBtn = document.getElementById("lb-start");
  if (!startBtn) return;
  const serversEl = document.getElementById("lb-servers");
  const strategyEl = document.getElementById("lb-strategy");
  let servers = [];
  let nextId = 0, rrPointer = 0, handled = 0, dropped = 0;
  let running = false, trafficTimer = null, decayTimer = null;

  function addServer() {
    nextId++;
    servers.push({ id: nextId, load: 0, alive: true });
    render();
  }

  function render() {
    serversEl.innerHTML = "";
    servers.forEach(function (s) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; align-items:center; gap:12px;";
      const pct = Math.min(100, s.load * 10);
      row.innerHTML =
        '<span class="mono" style="font-size:.72rem; width:76px; color:' + (s.alive ? "var(--chalk-strong)" : "#ff8b8f") + ';">server-' + s.id + (s.alive ? "" : " ✗") + "</span>" +
        '<div class="progress-track" style="flex:1;"><i style="width:' + pct + "%; background:" + (pct > 80 ? "#ff8b8f" : s.alive ? "var(--amber)" : "transparent") + ';"></i></div>' +
        '<span class="mono" style="font-size:.7rem; width:56px; color:var(--chalk);">' + (s.alive ? s.load + " conn" : "dead") + "</span>";
      const kill = document.createElement("button");
      kill.className = "btn btn-chalk btn-sm";
      kill.textContent = s.alive ? "KILL" : "REVIVE";
      kill.addEventListener("click", function () { s.alive = !s.alive; if (!s.alive) s.load = 0; render(); });
      row.appendChild(kill);
      serversEl.appendChild(row);
    });
  }

  function routeOne() {
    const alive = servers.filter(function (s) { return s.alive; });
    if (!alive.length) {
      dropped++;
      document.getElementById("lb-dropped").textContent = dropped;
      return;
    }
    let target;
    if (strategyEl.value === "rr") {
      target = alive[rrPointer % alive.length];
      rrPointer++;
    } else {
      target = alive.reduce(function (a, b) { return a.load <= b.load ? a : b; });
    }
    target.load++;
    handled++;
    document.getElementById("lb-handled").textContent = handled;
    render();
  }

  startBtn.addEventListener("click", function () {
    running = !running;
    startBtn.textContent = running ? "◼ STOP TRAFFIC" : "▶ START TRAFFIC";
    startBtn.classList.toggle("is-on", running);
    clearInterval(trafficTimer); clearInterval(decayTimer);
    if (running) {
      BB.mark("lb");
      document.getElementById("lb-rate-note").textContent = "~5";
      trafficTimer = setInterval(routeOne, 220);
      decayTimer = setInterval(function () {
        servers.forEach(function (s) { if (s.load > 0) s.load--; });
        render();
      }, 400);
    } else {
      document.getElementById("lb-rate-note").textContent = "0";
    }
  });

  document.getElementById("lb-add").addEventListener("click", function () { if (servers.length < 6) addServer(); });
  addServer(); addServer(); addServer();
})();

/* ============ FIG 07 · Message queue ============ */
(function () {
  const startBtn = document.getElementById("q-start");
  if (!startBtn) return;
  const MAXQ = 60;
  let depth = 0, done = 0, workers = 2, running = false, tick = null;
  const rateEl = document.getElementById("q-rate");

  function renderWorkers(busyCount) {
    const el = document.getElementById("q-workers");
    el.innerHTML = "";
    for (let i = 0; i < workers; i++) {
      const c = document.createElement("div");
      c.className = "cell";
      c.style.minWidth = "84px";
      const busy = i < busyCount;
      c.textContent = "worker-" + (i + 1) + (busy ? " ⚙" : " ·");
      if (busy) c.classList.add("hot");
      el.appendChild(c);
    }
  }

  function render(busy) {
    const pct = (depth / MAXQ) * 100;
    const bar = document.getElementById("q-depth-bar");
    bar.style.width = pct + "%";
    bar.style.background = pct > 75 ? "#ff8b8f" : pct > 45 ? "var(--amber)" : "#5fe0a1";
    document.getElementById("q-depth-label").textContent = depth;
    document.getElementById("queue-note").textContent = "depth " + depth;
    document.getElementById("q-done").textContent = done;
    const state = document.getElementById("q-state");
    if (!running) state.textContent = "idle";
    else if (depth >= MAXQ) { state.innerHTML = '<span class="bad">QUEUE FULL — rejecting jobs (backpressure!)</span>'; }
    else if (pct > 60) { state.innerHTML = '<span class="bad">backlog growing — add workers</span>'; }
    else state.innerHTML = '<span class="good">healthy</span>';
    renderWorkers(busy);
  }

  startBtn.addEventListener("click", function () {
    running = !running;
    startBtn.textContent = running ? "◼ STOP" : "▶ START";
    startBtn.classList.toggle("is-on", running);
    clearInterval(tick);
    if (running) {
      BB.mark("queue");
      tick = setInterval(function () {
        const produce = parseInt(rateEl.value, 10);
        depth = Math.min(MAXQ, depth + produce);
        // each worker consumes ~2 jobs/s
        const consumed = Math.min(depth, workers * 2);
        depth -= consumed;
        done += consumed;
        render(Math.min(workers, consumed));
      }, 1000);
    }
    render(0);
  });

  rateEl.addEventListener("input", function () {
    document.getElementById("q-rate-label").textContent = rateEl.value;
  });
  document.getElementById("q-worker-plus").addEventListener("click", function () { if (workers < 6) { workers++; render(0); } });
  document.getElementById("q-worker-minus").addEventListener("click", function () { if (workers > 1) { workers--; render(0); } });
  document.getElementById("q-burst").addEventListener("click", function () { depth = Math.min(MAXQ, depth + 25); render(0); });
  render(0);
})();

/* ============ FIG 08 · JWT auth stepper ============ */
(function () {
  const stage = document.getElementById("auth-stage");
  if (!stage) return;
  const note = document.getElementById("auth-note");
  const nextBtn = document.getElementById("auth-next");
  const tamperBtn = document.getElementById("auth-tamper");
  let step = 0, tampered = false;

  const TOKEN = {
    header: '{"alg":"HS256","typ":"JWT"}',
    payload: '{"sub":"ada","role":"admin","exp":1799999999}',
    payloadTampered: '{"sub":"ada","role":"SUPERADMIN","exp":1799999999}',
    sig: "tKq9…x2Zc",
  };

  function tokenHtml(t) {
    return '<span style="color:#8ecdf7;">eyJhbGci…</span>.<span style="color:#c0b3ff;">' +
      (t ? "eyJzdWIi…FORGED" : "eyJzdWIi…") + '</span>.<span class="warn">' + TOKEN.sig + "</span>";
  }

  const STEPS = [
    function () {
      return ['<span class="warn">STEP 1 — LOGIN</span>',
        '<span class="hl">client → server</span>  POST /login',
        '  {"email":"ada@example.com","password":"••••••"}',
        '<span class="t">// password checked against a salted hash in the db — the only time the db is involved</span>'];
    },
    function () {
      return ['<span class="warn">STEP 2 — SERVER SIGNS A TOKEN</span>',
        '  header  = <span style="color:#8ecdf7;">' + TOKEN.header + "</span>",
        '  payload = <span style="color:#c0b3ff;">' + TOKEN.payload + "</span>",
        '  sig     = <span class="warn">HMAC-SHA256(header + "." + payload, SECRET)</span>',
        "",
        "  token = " + tokenHtml(false),
        '<span class="t">// header & payload are just base64 — readable by anyone. The signature is the seal.</span>'];
    },
    function () {
      return ['<span class="warn">STEP 3 — CLIENT USES IT EVERYWHERE</span>',
        '<span class="hl">client → server</span>  GET /profile',
        "  Authorization: Bearer " + tokenHtml(tampered),
        '<span class="t">// no cookies, no session store — the proof of identity travels with the request</span>'];
    },
    function () {
      if (tampered) {
        return ['<span class="warn">STEP 4 — SERVER VERIFIES</span>',
          '  recompute HMAC(header.payload, SECRET) → <span class="err">does NOT match signature</span>',
          '  payload says <span style="color:#c0b3ff;">"role":"SUPERADMIN"</span> — but the seal is broken',
          "",
          '<span class="err">← 401 Unauthorized · token rejected</span>',
          '<span class="t">// this is the whole point: reading the token is easy, forging it is not</span>'];
      }
      return ['<span class="warn">STEP 4 — SERVER VERIFIES</span>',
        '  recompute HMAC(header.payload, SECRET) → <span class="ok">matches signature ✓</span>',
        "  exp: 1799999999 → not expired ✓",
        "",
        '<span class="ok">← 200 OK · hello, ada (admin)</span>',
        '<span class="t">// zero database reads — verification is pure math. This is what "stateless" buys you.</span>'];
    },
  ];

  function show() {
    note.textContent = "step " + step + " / 4";
    stage.innerHTML = "";
    for (let i = 0; i < step; i++) {
      STEPS[i]().forEach(function (l) { bbLog(stage, l); });
      if (i < step - 1) bbLog(stage, "");
    }
    tamperBtn.disabled = step < 3 || tampered;
    nextBtn.disabled = step >= 4;
  }

  nextBtn.addEventListener("click", function () {
    if (step < 4) { step++; BB.mark("auth"); show(); }
  });
  tamperBtn.addEventListener("click", function () {
    tampered = true;
    if (step > 3) step = 3;
    show();
    bbLog(stage, "");
    bbLog(stage, '<span class="err">✂ payload edited: "role":"admin" → "SUPERADMIN" (signature unchanged)</span>');
    bbLog(stage, '<span class="t">// press NEXT STEP to see the server react</span>');
    nextBtn.disabled = false;
  });
  document.getElementById("auth-reset").addEventListener("click", function () {
    step = 0; tampered = false; show();
    stage.innerHTML = '<div class="t">// press NEXT STEP to begin the login flow</div>';
  });
  stage.innerHTML = '<div class="t">// press NEXT STEP to begin the login flow</div>';
})();

/* ============ FIG 09 · Scaling ============ */
(function () {
  const upBtn = document.getElementById("scale-up");
  if (!upBtn) return;
  const box = document.getElementById("scale-v-box");
  const vLabel = document.getElementById("scale-v-label");
  const vNote = document.getElementById("scale-v-note");
  const TIERS = [
    ["4 CPU · 8 GB", "~1k req/s", 80],
    ["8 CPU · 32 GB", "~4k req/s", 110],
    ["32 CPU · 128 GB", "~15k req/s", 150],
    ["96 CPU · 768 GB", "~50k req/s", 200],
  ];
  let tier = 0;
  upBtn.addEventListener("click", function () {
    BB.mark("scale");
    if (tier < TIERS.length - 1) {
      tier++;
      box.style.width = TIERS[tier][2] + "px";
      box.style.height = Math.round(TIERS[tier][2] * 0.72) + "px";
      vLabel.innerHTML = TIERS[tier][0] + "<br>handles " + TIERS[tier][1];
      if (tier === TIERS.length - 1) vNote.innerHTML = '<span class="bad">that\'s the biggest machine money buys — and it\'s still a single point of failure</span>';
    }
  });

  const row = document.getElementById("scale-h-row");
  function renderH(n) {
    row.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "cell";
      c.style.cssText = "width:56px;height:48px;font-size:1.1rem;";
      c.textContent = "🖥️";
      row.appendChild(c);
    }
  }
  let hCount = 1;
  renderH(hCount);
  document.getElementById("scale-out").addEventListener("click", function () {
    BB.mark("scale");
    if (hCount < 8) { hCount++; renderH(hCount); }
    const note = document.getElementById("scale-h-note");
    if (hCount >= 4) note.innerHTML = '<span class="good">' + hCount + " small servers ≈ one giant one — and any single failure costs you 1/" + hCount + " capacity, not everything</span>";
  });
})();
