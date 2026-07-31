/* Security & Ops — FIGS 15–24 */

/* ============ FIG 15 · TLS handshake ============ */
(function () {
  const stage = document.getElementById("tls-stage");
  if (!stage) return;
  const note = document.getElementById("tls-note");
  let step = 0;

  const STEPS = [
    ['<span class="warn">STEP 1 — CLIENT HELLO</span>',
     '<span class="hl">browser → server</span>  "let\'s talk securely"',
     "  supported: TLS 1.3, TLS 1.2 · ciphers: AES-GCM, ChaCha20 · random: 9f2e…",
     '<span class="t">// still plaintext — but contains no secrets, just capabilities</span>'],
    ['<span class="warn">STEP 2 — SERVER CERTIFICATE</span>',
     '<span class="hl">server → browser</span>  "here\'s who I am"',
     "  cert: CN=api.example.com · issued by Let's Encrypt · expires in 89 days",
     '  browser checks: signed by a CA I trust? ✓ · name matches? ✓ · not expired? <span class="ok">✓</span>',
     '<span class="t">// this is the "authentication" part — a fake server can\'t produce this signature</span>'],
    ['<span class="warn">STEP 3 — KEY EXCHANGE</span>',
     "  both sides run an ECDHE exchange (math each can do, an observer can't finish)",
     '  → shared session key: <span class="warn">k = a1c4…e9</span> — never sent over the wire!',
     '<span class="t">// asymmetric crypto used once, to agree on a fast symmetric key</span>'],
    ['<span class="warn">STEP 4 — ENCRYPTED CHANNEL</span>',
     '<span class="hl">browser ⇄ server</span>  everything now AES-encrypted with the session key',
     '  GET /profile → <span class="ok">gibberish on the wire</span> → 200 OK ← gibberish on the wire',
     "",
     '<span class="ok">🔒 padlock earned: encryption + integrity + authentication</span>',
     '<span class="t">// total cost: ~1 extra round trip. TLS 1.3 even resumes in zero.</span>'],
  ];

  const SPY = [
    'sees: "someone wants TLS 1.3" — <span class="warn">harmless</span>',
    'sees: the public certificate — <span class="warn">public anyway</span>',
    'sees: key-exchange fragments — <span class="ok">cannot derive the key</span>',
    'sees: <span class="ok">only ciphertext</span> — content, cookies, tokens all unreadable. (The hostname is still visible via SNI — the one leak.)',
  ];

  function show() {
    note.textContent = "step " + step + " / 4";
    stage.innerHTML = "";
    if (!step) { stage.innerHTML = '<div class="t">// press NEXT STEP — you are the browser</div>'; return; }
    for (let i = 0; i < step; i++) {
      STEPS[i].forEach(function (l) { bbLog(stage, l); });
      if (i < step - 1) bbLog(stage, "");
    }
  }
  document.getElementById("tls-next").addEventListener("click", function () {
    if (step < 4) { step++; BB.mark("tls"); show(); }
  });
  document.getElementById("tls-spy").addEventListener("click", function () {
    BB.mark("tls");
    if (!step) { bbLog(stage, '<span class="t">// nothing sent yet — nothing to overhear</span>'); return; }
    bbLog(stage, "");
    bbLog(stage, '👂 <span class="hl">eavesdropper at step ' + step + "</span> " + SPY[step - 1]);
  });
  document.getElementById("tls-reset").addEventListener("click", function () { step = 0; show(); });
  show();
})();

/* ============ FIG 16 · CORS ============ */
(function () {
  const btn = document.getElementById("cors-send");
  if (!btn) return;
  const log = document.getElementById("cors-log");
  btn.addEventListener("click", function () {
    BB.mark("cors");
    const origin = document.getElementById("cors-origin").value;
    const allow = document.getElementById("cors-allow").value;
    log.innerHTML = "";
    bbLog(log, bbNow() + '<span class="hl">js @ ' + origin + "</span> fetch(\"https://api.example.com/api/data\")");
    bbLog(log, bbNow() + '<span class="hl">browser</span> → GET /api/data · Origin: <span class="warn">' + origin + "</span>");
    bbLog(log, bbNow() + '<span class="hl">server</span> processes the request <span class="t">(yes — it already ran!)</span>');
    if (allow === "none") {
      bbLog(log, bbNow() + '<span class="hl">server</span> ← 200 OK · <span class="err">no Access-Control-Allow-Origin header</span>');
      bbLog(log, bbNow() + '<span class="err">browser BLOCKS the page from reading the response</span>');
      bbLog(log, '<span class="t">// the console error every dev knows: "blocked by CORS policy". Fix it on the SERVER.</span>');
    } else if (allow === "*" || allow === origin) {
      bbLog(log, bbNow() + '<span class="hl">server</span> ← 200 OK · Access-Control-Allow-Origin: <span class="ok">' + allow + "</span>");
      bbLog(log, bbNow() + '<span class="ok">browser hands the JSON to your JavaScript ✓</span>');
      if (allow === "*") bbLog(log, '<span class="t">// "*" means ANY site may read this — fine for public data, never for authed APIs</span>');
      if (origin === "https://evil.com" && allow === "*") bbLog(log, '<span class="warn">// note: evil.com just read your API too. That\'s what * means.</span>');
    } else {
      bbLog(log, bbNow() + '<span class="hl">server</span> ← 200 OK · Access-Control-Allow-Origin: ' + allow);
      bbLog(log, bbNow() + '<span class="err">browser BLOCKS: "' + origin + '" ≠ "' + allow + '"</span>');
      bbLog(log, '<span class="t">// the localhost classic. Fix: allow http://localhost:3000 in dev config.</span>');
    }
  });
})();

/* ============ FIG 17 · Rate limiting ============ */
(function () {
  const bucketEl = document.getElementById("rl-bucket");
  if (!bucketEl) return;
  const CAP = 10;
  let tokens = CAP, ok = 0, rej = 0;
  const log = document.getElementById("rl-log");
  const rateEl = document.getElementById("rl-rate");

  function render() {
    bucketEl.innerHTML = "";
    for (let i = 0; i < CAP; i++) {
      const c = document.createElement("div");
      c.className = "cell" + (i < tokens ? " hot" : " dim");
      c.style.minWidth = "34px";
      c.textContent = i < tokens ? "●" : "○";
      bucketEl.appendChild(c);
    }
    document.getElementById("rl-ok").textContent = ok;
    document.getElementById("rl-rej").textContent = rej;
  }

  function request(tag) {
    if (tokens >= 1) {
      tokens--;
      ok++;
      bbLog(log, bbNow() + (tag || "") + '<span class="ok">200 OK</span> · 1 token spent · ' + tokens + " left");
    } else {
      rej++;
      bbLog(log, bbNow() + (tag || "") + '<span class="err">429 Too Many Requests</span> · Retry-After: 1');
    }
    render();
  }

  document.getElementById("rl-one").addEventListener("click", function () { BB.mark("ratelimit"); request(); });
  document.getElementById("rl-burst").addEventListener("click", function () {
    BB.mark("ratelimit");
    let i = 0;
    const t = setInterval(function () {
      request('<span class="t">burst ' + (i + 1) + "/15</span> ");
      if (++i >= 15) clearInterval(t);
    }, BB.reduceMotion ? 1 : 120);
  });
  rateEl.addEventListener("input", function () {
    document.getElementById("rl-rate-note").textContent = rateEl.value;
  });
  setInterval(function () {
    const r = parseInt(rateEl.value, 10);
    if (tokens < CAP) { tokens = Math.min(CAP, tokens + r); render(); }
  }, 1000);
  render();
})();

/* ============ FIG 18 · SQL injection ============ */
(function () {
  const runBtn = document.getElementById("sqli-run");
  if (!runBtn) return;
  const input = document.getElementById("sqli-input");
  const log = document.getElementById("sqli-log");
  const concatBtn = document.getElementById("sqli-concat");
  const paramBtn = document.getElementById("sqli-param");
  let mode = "concat";
  const USERS = ["ada", "linus", "grace"];

  function setMode(m) {
    mode = m;
    concatBtn.classList.toggle("is-on", m === "concat");
    paramBtn.classList.toggle("is-on", m === "param");
  }
  concatBtn.addEventListener("click", function () { setMode("concat"); });
  paramBtn.addEventListener("click", function () { setMode("param"); });
  document.getElementById("sqli-payload").addEventListener("click", function () {
    input.value = "' OR '1'='1' --";
    input.focus();
  });

  runBtn.addEventListener("click", function () {
    BB.mark("sqli");
    const v = input.value;
    const injected = /('|--|;)/.test(v);
    log.innerHTML = "";
    if (mode === "concat") {
      const q = "SELECT * FROM users WHERE name = '" + v + "'";
      bbLog(log, '<span class="t">// query built by gluing strings:</span>');
      bbLog(log, '<span class="hl">' + q.replace(v, '<span class="err">' + v + "</span>") + "</span>");
      if (injected && /OR/i.test(v)) {
        bbLog(log, bbNow() + '<span class="err">⚠ WHERE clause is now always true</span>');
        bbLog(log, bbNow() + 'db returns <span class="err">ALL ' + USERS.length + " ROWS</span>: " + USERS.join(", "));
        bbLog(log, '<span class="err">💀 BREACH — attacker logged in without a password and can dump the table</span>');
      } else if (injected) {
        bbLog(log, bbNow() + '<span class="err">syntax error near "\'" — 500. Attackers use these errors as a map.</span>');
      } else {
        bbLog(log, bbNow() + (USERS.indexOf(v) !== -1 ? '<span class="ok">1 row · logged in as ' + v + "</span> <span class=\"t\">(worked — but only by luck)</span>" : '<span class="warn">0 rows · login failed</span>'));
      }
    } else {
      bbLog(log, '<span class="t">// query and data travel separately:</span>');
      bbLog(log, '<span class="hl">SELECT * FROM users WHERE name = <span class="ok">$1</span></span>');
      bbLog(log, '  $1 = <span class="ok">' + JSON.stringify(v) + "</span> <span class=\"t\">← always a value, never SQL</span>");
      if (USERS.indexOf(v) !== -1) {
        bbLog(log, bbNow() + '<span class="ok">1 row · logged in as ' + v + "</span>");
      } else {
        bbLog(log, bbNow() + '<span class="warn">0 rows · login failed</span> — db searched for a user literally named ' + JSON.stringify(v));
        if (injected) bbLog(log, '<span class="ok">🛡 same payload, zero damage. This is the whole fix.</span>');
      }
    }
  });
})();

/* ============ FIG 19 · RBAC / ABAC ============ */
(function () {
  const checkBtn = document.getElementById("access-check");
  if (!checkBtn) return;
  const log = document.getElementById("access-log");
  const rbacBtn = document.getElementById("access-rbac");
  const abacBtn = document.getElementById("access-abac");
  const attrs = document.getElementById("access-attrs");
  let mode = "rbac";

  const MATRIX = {
    "viewer": { "read document": true, "edit document": false, "delete user": false },
    "editor": { "read document": true, "edit document": true, "delete user": false },
    "admin": { "read document": true, "edit document": true, "delete user": true },
  };

  function setMode(m) {
    mode = m;
    rbacBtn.classList.toggle("is-on", m === "rbac");
    abacBtn.classList.toggle("is-on", m === "abac");
    attrs.style.display = m === "abac" ? "flex" : "none";
    document.getElementById("access-note").textContent = "mode: " + m.toUpperCase();
  }
  rbacBtn.addEventListener("click", function () { setMode("rbac"); });
  abacBtn.addEventListener("click", function () { setMode("abac"); });

  checkBtn.addEventListener("click", function () {
    BB.mark("access");
    const role = document.getElementById("access-role").value;
    const action = document.getElementById("access-action").value;
    log.innerHTML = "";
    if (mode === "rbac") {
      const allowed = MATRIX[role][action];
      bbLog(log, '<span class="t">// RBAC: one table lookup</span>');
      bbLog(log, 'can(<span class="warn">' + role + '</span>, <span class="warn">"' + action + '"</span>) → ' +
        (allowed ? '<span class="ok">ALLOW ✓</span>' : '<span class="err">DENY ✗ (403 Forbidden)</span>'));
      if (allowed && action === "edit document" && role === "editor")
        bbLog(log, '<span class="warn">// note: RBAC lets this editor edit ANY document — even yours. Sometimes too coarse.</span>');
      bbLog(log, '<span class="t">// simple, fast, easy to audit — the default choice</span>');
    } else {
      const owner = document.getElementById("attr-owner").checked;
      const hours = document.getElementById("attr-hours").checked;
      bbLog(log, '<span class="t">// ABAC policy for "' + action + '":</span>');
      if (action === "read document") {
        bbLog(log, 'rule: anyone may read → <span class="ok">ALLOW ✓</span>');
      } else if (action === "edit document") {
        bbLog(log, 'rule: (role=admin) OR (role=editor AND owns-it AND business-hours)');
        bbLog(log, "  role=" + role + " · owner=" + owner + " · hours=" + hours);
        const allowed = role === "admin" || (role === "editor" && owner && hours);
        bbLog(log, "→ " + (allowed ? '<span class="ok">ALLOW ✓</span>' : '<span class="err">DENY ✗ (403)</span>'));
        if (!allowed && role === "editor") bbLog(log, '<span class="t">// same editor RBAC would have allowed — attributes made it precise</span>');
      } else {
        bbLog(log, 'rule: role=admin AND business-hours <span class="t">(deleting users at 3am is suspicious)</span>');
        const allowed = role === "admin" && hours;
        bbLog(log, "  role=" + role + " · hours=" + hours + " → " + (allowed ? '<span class="ok">ALLOW ✓</span>' : '<span class="err">DENY ✗</span>'));
      }
      bbLog(log, '<span class="t">// expressive but harder to answer "who can touch X?" — audit gets fuzzy</span>');
    }
  });
})();

/* ============ FIG 20 · WebSockets ============ */
(function () {
  const startBtn = document.getElementById("ws-start");
  if (!startBtn) return;
  const pollLog = document.getElementById("ws-poll-log");
  const sockLog = document.getElementById("ws-sock-log");
  let running = false, pollTimer = null;
  let pollCount = 0, pollUseful = 0, sockCount = 0;
  let pending = 0; // events waiting for next poll

  function stats() {
    document.getElementById("ws-poll-count").textContent = pollCount;
    document.getElementById("ws-poll-useful").textContent = pollUseful;
    document.getElementById("ws-sock-count").textContent = sockCount;
  }

  startBtn.addEventListener("click", function () {
    running = !running;
    startBtn.textContent = running ? "◼ STOP" : "▶ START BOTH";
    startBtn.classList.toggle("is-on", running);
    clearInterval(pollTimer);
    if (running) {
      BB.mark("ws");
      bbLog(sockLog, bbNow() + '<span class="hl">GET /chat</span> · Upgrade: websocket');
      bbLog(sockLog, bbNow() + '<span class="ok">101 Switching Protocols — pipe open ⇄</span>');
      pollTimer = setInterval(function () {
        pollCount++;
        if (pending > 0) {
          pollUseful++;
          bbLog(pollLog, bbNow() + 'GET /messages → <span class="ok">200 · ' + pending + " new</span> <span class=\"t\">(up to 2s late)</span>");
          pending = 0;
        } else {
          bbLog(pollLog, bbNow() + 'GET /messages → <span class="warn">200 · nothing new</span> <span class="t">(wasted)</span>');
        }
        stats();
      }, 2000);
    }
  });

  document.getElementById("ws-event").addEventListener("click", function () {
    BB.mark("ws");
    if (!running) { bbLog(sockLog, '<span class="t">// press START BOTH first</span>'); return; }
    pending++;
    sockCount++;
    bbLog(sockLog, bbNow() + '<span class="ok">◀ push "new message"</span> · ~5 ms, zero requests');
    stats();
  });
})();

/* ============ FIG 21 · Reverse proxy ============ */
(function () {
  const log = document.getElementById("proxy-log");
  if (!log) return;
  const packet = document.getElementById("proxy-packet");
  let busy = false;

  function glowNode(id, on) {
    const rect = document.querySelector("#" + id + " rect");
    if (rect) rect.setAttribute("stroke", on ? "#ffb224" : "#a8c3f0");
  }

  function travel(pathId, ms, reverse) {
    return new Promise(function (resolve) {
      const path = document.getElementById(pathId);
      const len = path.getTotalLength();
      if (BB.reduceMotion) { const p = path.getPointAtLength(reverse ? 0 : len); packet.setAttribute("cx", p.x); packet.setAttribute("cy", p.y); return resolve(); }
      const t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, ((now || performance.now()) - t0) / ms);
        const p = path.getPointAtLength(reverse ? len * (1 - k) : len * k);
        packet.setAttribute("cx", p.x); packet.setAttribute("cy", p.y);
        if (k < 1) requestAnimationFrame(step); else resolve();
      })(t0);
    });
  }

  const ROUTES = {
    "/api/users": { wire: "pw-app", node: "pn-app", lines: [
      'route: <span class="warn">location /api → proxy_pass http://app:3000</span>',
      '<span class="ok">200</span> from app · gzip\'d by nginx on the way out · port 3000 never exposed'] },
    "/img/logo.png": { wire: "pw-static", node: "pn-static", lines: [
      'route: <span class="warn">location /img → serve from /var/www/static</span>',
      '<span class="ok">200</span> straight from disk + Cache-Control: max-age=31536000 · the app never woke up'] },
    "/admin": { wire: "pw-admin", node: "pn-admin", lines: [
      'route: <span class="warn">location /admin → allow 10.0.0.0/8; deny all</span>',
      '<span class="err">403</span> — admin exists only for the office VPN. The internet can\'t even see it.'] },
  };

  document.querySelectorAll(".proxy-req").forEach(function (b) {
    b.addEventListener("click", async function () {
      if (busy) return;
      busy = true;
      BB.mark("proxy");
      const r = ROUTES[b.getAttribute("data-p")];
      log.innerHTML = "";
      packet.setAttribute("opacity", "1");
      bbLog(log, bbNow() + '<span class="hl">GET ' + b.getAttribute("data-p") + "</span> · TLS terminated at nginx (FIG. 15)");
      glowNode("pn-nginx", true);
      await travel("pw-in", 450);
      bbLog(log, bbNow() + r.lines[0]);
      glowNode(r.node, true);
      await travel(r.wire, 450);
      await new Promise(function (res) { setTimeout(res, BB.reduceMotion ? 0 : 250); });
      await travel(r.wire, 400, true);
      await travel("pw-in", 400, true);
      bbLog(log, bbNow() + r.lines[1]);
      packet.setAttribute("opacity", "0");
      glowNode("pn-nginx", false);
      glowNode(r.node, false);
      busy = false;
    });
  });
})();

/* ============ FIG 22 · Docker ============ */
(function () {
  const buildBtn = document.getElementById("docker-build");
  if (!buildBtn) return;
  const layersEl = document.getElementById("docker-layers");
  const containersEl = document.getElementById("docker-containers");
  const log = document.getElementById("docker-log");
  const runBtn = document.getElementById("docker-run");
  const LAYERS = [
    ["FROM node:20-alpine", "base os + runtime · 58 MB"],
    ["COPY package.json / RUN npm ci", "dependencies · 112 MB · cached until deps change"],
    ["COPY . .", "your code · 2 MB"],
    ["CMD [\"node\", \"server.js\"]", "how to start · 0 B"],
  ];
  let built = 0, containers = 0, building = false;

  buildBtn.addEventListener("click", function () {
    if (building || built === LAYERS.length) return;
    building = true;
    BB.mark("docker");
    layersEl.innerHTML = "";
    log.innerHTML = "";
    built = 0;
    bbLog(log, bbNow() + '<span class="hl">docker build -t myapp .</span>');
    const t = setInterval(function () {
      const l = LAYERS[built];
      const c = document.createElement("div");
      c.className = "cell";
      c.style.cssText = "width:100%; height:38px; justify-items:start; padding:0 12px; grid-template-columns:1fr auto; display:grid;";
      c.innerHTML = "<span>" + l[0] + '</span><span style="opacity:.55; font-size:.62rem;">' + l[1] + "</span>";
      layersEl.appendChild(c);
      built++;
      if (built === LAYERS.length) {
        clearInterval(t);
        building = false;
        bbLog(log, bbNow() + '<span class="ok">✓ image myapp:latest · 4 layers · 172 MB</span> — a frozen, portable machine');
        document.getElementById("docker-note").textContent = "image: myapp:latest ✓";
        runBtn.disabled = false;
      }
    }, BB.reduceMotion ? 1 : 450);
  });

  runBtn.addEventListener("click", function () {
    BB.mark("docker");
    if (containers >= 3) { bbLog(log, '<span class="t">// three is enough for the demo — point FIG. 06\'s load balancer at them</span>'); return; }
    containers++;
    const c = document.createElement("div");
    c.className = "cell ok-cell";
    c.style.cssText = "min-width:110px; height:52px;";
    c.innerHTML = "📦 myapp-" + containers + '<br><span style="font-size:.6rem; opacity:.7;">:300' + containers + " · identical</span>";
    containersEl.appendChild(c);
    bbLog(log, bbNow() + '<span class="ok">docker run</span> → container ' + containers + " up in 0.4s · same image, laptop or cloud");
  });
})();

/* ============ FIG 23 · Migrations ============ */
(function () {
  const upBtn = document.getElementById("mig-up");
  if (!upBtn) return;
  const listEl = document.getElementById("mig-list");
  const schemaEl = document.getElementById("mig-schema");
  const log = document.getElementById("mig-log");
  const MIGS = [
    ["V1__create_users.sql", "CREATE TABLE users (id, name, password_hash)"],
    ["V2__add_email_verified.sql", "ALTER TABLE users ADD email_verified boolean DEFAULT false"],
    ["V3__index_users_email.sql", "CREATE INDEX CONCURRENTLY idx_users_email ON users(email)"],
    ["V4__drop_legacy_column.sql", "ALTER TABLE users DROP COLUMN old_flags  -- ⚠ destructive"],
  ];
  let version = 0;

  function schema() {
    schemaEl.innerHTML = "";
    if (!version) { bbLog(schemaEl, '<span class="t">(no tables yet)</span>'); return; }
    bbLog(schemaEl, '<span class="warn">users</span>');
    bbLog(schemaEl, "  id            bigint pk");
    bbLog(schemaEl, "  name          text");
    bbLog(schemaEl, "  password_hash text");
    if (version < 4) bbLog(schemaEl, '  old_flags     int <span class="t">// legacy</span>');
    if (version >= 2) bbLog(schemaEl, '  email_verified bool <span class="ok">← V2</span>');
    if (version >= 3) bbLog(schemaEl, '  <span class="ok">idx_users_email (index) ← V3</span>');
    bbLog(schemaEl, "");
    bbLog(schemaEl, '<span class="warn">schema_migrations</span>: [' + MIGS.slice(0, version).map(function (m, i) { return "V" + (i + 1); }).join(", ") + "]");
  }

  function list() {
    listEl.innerHTML = "";
    MIGS.forEach(function (m, i) {
      const c = document.createElement("div");
      c.className = "cell" + (i < version ? " ok-cell" : " dim");
      c.style.cssText = "width:100%; height:auto; padding:8px 12px; justify-items:start; text-align:left; display:grid;";
      c.innerHTML = (i < version ? "✓ " : "· ") + m[0] + '<br><span style="font-size:.62rem; opacity:.65;">' + m[1] + "</span>";
      listEl.appendChild(c);
    });
    document.getElementById("migrate-note").textContent = "version " + version + (version ? "" : " — empty database");
  }

  upBtn.addEventListener("click", function () {
    BB.mark("migrate");
    if (version >= MIGS.length) { bbLog(log, '<span class="t">// up to date — nothing to apply</span>'); return; }
    version++;
    const m = MIGS[version - 1];
    log.innerHTML = "";
    if (version === 4) {
      bbLog(log, bbNow() + '<span class="warn">⚠ destructive migration — pg_dump backup taken first, deploy window announced</span>');
    }
    if (version === 3) {
      bbLog(log, bbNow() + '<span class="t">// CONCURRENTLY: index built without locking writes — slower, but production stays alive</span>');
    }
    bbLog(log, bbNow() + '<span class="ok">applied ' + m[0] + "</span> · recorded in schema_migrations");
    list(); schema();
  });

  document.getElementById("mig-down").addEventListener("click", function () {
    BB.mark("migrate");
    if (!version) { bbLog(log, '<span class="t">// nothing to roll back</span>'); return; }
    const m = MIGS[version - 1];
    version--;
    log.innerHTML = "";
    bbLog(log, bbNow() + '<span class="warn">rolled back ' + m[0] + "</span>" + (m[0].indexOf("drop") !== -1 ? ' · <span class="err">data in dropped columns is GONE unless you restore the backup</span>' : ""));
    bbLog(log, '<span class="t">// in prod, prefer a new forward migration over rollbacks — history only moves ahead</span>');
    list(); schema();
  });

  list(); schema();
})();

/* ============ FIG 24 · System design capstone ============ */
(function () {
  const nextBtn = document.getElementById("sys-next");
  if (!nextBtn) return;
  const log = document.getElementById("sys-log");
  let stage = 0;

  // elements revealed per stage (ids carry class sys-h = hidden)
  const STAGES = [
    { show: [], rps: "100 req/s", lines: [
      '<span class="warn">STAGE 0 — THE MONOLITH</span> · one app container (FIG. 22), one Postgres',
      'Handles 100 req/s fine. Deploys cause 10s of downtime. The db and app share one failure domain.',
      '<span class="t">// every great system starts here — and should</span>'] },
    { show: ["sn-lb", "sn-app2", "sw-lb", "sw-lb-a1"], hide: ["sw-direct"], rps: "1k req/s", lines: [
      '<span class="warn">STAGE 1 — TRAFFIC ×10</span> · add nginx as reverse proxy + LB (FIGS. 21, 06), run 2 app containers',
      'TLS terminates at the edge (FIG. 15) · zero-downtime deploys: drain one app, update, repeat.',
      '<span class="t">// the apps had to be stateless for this — JWTs (FIG. 08) pay off now</span>'] },
    { show: ["sn-cache", "sw-app-cache"], rps: "5k req/s", lines: [
      '<span class="warn">STAGE 2 — DB AT 90% CPU</span> · add Redis (FIGS. 05, 11)',
      'Short-link lookups are 99% reads of hot keys → 95% cache hit rate → db load falls off a cliff.',
      '<span class="t">// rate limiter (FIG. 17) also lives in Redis — one bucket per API key</span>'] },
    { show: ["sn-replica", "sw-db-replica"], rps: "20k req/s", lines: [
      '<span class="warn">STAGE 3 — ANALYTICS QUERIES HURT</span> · add a read replica',
      'Writes go to the primary; dashboards and heavy reads hit the replica (indexes everywhere — FIG. 04).',
      '<span class="t">// replication lag exists: your own write may take ~100ms to appear on the replica</span>'] },
    { show: ["sn-queue", "sn-worker", "sw-app-q", "sw-q-worker", "sn-app3", "sw-lb-a2"], rps: "50k req/s", lines: [
      '<span class="warn">STAGE 4 — SLOW WORK BLOCKS REQUESTS</span> · add a queue + workers (FIG. 07), 3rd app container',
      'Click-tracking and webhooks become async jobs · API answers 202 in 15ms regardless.',
      '<span class="t">// spikes now fill the queue instead of killing the site</span>'] },
    { show: [], rps: "spike-proof", lines: [
      '<span class="warn">STAGE 5 — THE REVIEW</span> · this diagram is the standard interview answer',
      'Every box is a module you\'ve run: proxy · lb · stateless apps in containers · redis · postgres + replica · queue + workers.',
      '<span class="ok">System design isn\'t memorization — it\'s knowing which pain each box removes. You now know all of them.</span>'] },
  ];

  function apply() {
    const s = STAGES[stage];
    (s.show || []).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
    (s.hide || []).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    document.getElementById("sys-note").textContent = "stage " + stage + " / 5 · " + s.rps;
    log.innerHTML = "";
    s.lines.forEach(function (l) { bbLog(log, l); });
    nextBtn.disabled = stage >= STAGES.length - 1;
  }

  function reset() {
    stage = 0;
    document.querySelectorAll(".sys-h").forEach(function (el) { el.style.display = "none"; });
    const direct = document.getElementById("sw-direct");
    if (direct) direct.style.display = "";
    apply();
  }

  nextBtn.addEventListener("click", function () {
    if (stage < STAGES.length - 1) { stage++; BB.mark("sysdesign"); apply(); }
  });
  document.getElementById("sys-reset").addEventListener("click", reset);
  reset();
})();
