/* Arcade — Status Rush + Backend Quiz */

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* ============ GAME 1 · Status Rush ============ */
(function () {
  const startBtn = document.getElementById("rush-start");
  if (!startBtn) return;

  // [situation, correct, wrong, wrong, wrong, one-line why]
  const ROUNDS = [
    ["User asks for a profile that was deleted last year.", "404 Not Found", "400 Bad Request", "410 is fancier but 404 is fine", "500 Internal Server Error", "The resource doesn't exist → 404. It's not the client's syntax (400) or a server crash (500)."],
    ["POST /users succeeds — a new account exists.", "201 Created", "200 OK", "204 No Content", "202 Accepted", "Creation gets its own code: 201, ideally with a Location header."],
    ["Login has no token attached at all.", "401 Unauthorized", "403 Forbidden", "400 Bad Request", "407 Proxy Auth Required", "401 = 'who are you?'. 403 would mean we know you — and still say no."],
    ["A logged-in intern tries to delete the production database.", "403 Forbidden", "401 Unauthorized", "418 I'm a teapot", "405 Method Not Allowed", "Authenticated but not allowed → 403. (Also: revoke that permission.)"],
    ["The app server threw an unhandled NullPointerException.", "500 Internal Server Error", "502 Bad Gateway", "400 Bad Request", "503 Service Unavailable", "The server's own code broke → 500. The bug is yours, not the client's."],
    ["Load balancer can't reach any healthy app server.", "502 Bad Gateway", "500 Internal Server Error", "404 Not Found", "301 Moved Permanently", "A gateway got no valid response from upstream → 502."],
    ["A client fired 1,000 requests in 10 seconds; you rate limit.", "429 Too Many Requests", "403 Forbidden", "503 Service Unavailable", "418 I'm a teapot", "Rate limiting has a dedicated code: 429, with Retry-After."],
    ["DELETE /sessions/current succeeds; nothing to return.", "204 No Content", "200 OK", "201 Created", "202 Accepted", "Success with an intentionally empty body → 204."],
    ["The site moved from http:// to https:// forever.", "301 Moved Permanently", "302 Found", "307 Temporary Redirect", "308 exists but 301 is the classic", "Permanent move → 301, so browsers and crawlers update their records."],
    ["Browser's cached copy is still fresh; server saves bandwidth.", "304 Not Modified", "204 No Content", "200 OK", "206 Partial Content", "Conditional GET + unchanged resource → 304 with no body."],
    ["Request body is invalid JSON — a trailing comma.", "400 Bad Request", "422 is arguable, but 400 fits", "500 Internal Server Error", "415 Unsupported Media Type", "Malformed syntax from the client → 400."],
    ["Server is in scheduled maintenance for 10 minutes.", "503 Service Unavailable", "500 Internal Server Error", "504 Gateway Timeout", "410 Gone", "Temporarily can't serve → 503, ideally with Retry-After."],
    ["Signup with a username that's already taken.", "409 Conflict", "400 Bad Request", "403 Forbidden", "406 Not Acceptable", "The request conflicts with current state → 409."],
    ["A report endpoint queues the job and replies immediately.", "202 Accepted", "200 OK", "201 Created", "204 No Content", "'Got it, working on it' → 202. The queue from FIG. 07 in action."],
    ["Upstream microservice took 30s; the gateway gave up.", "504 Gateway Timeout", "502 Bad Gateway", "500 Internal Server Error", "408 Request Timeout", "A gateway timing out on upstream → 504."],
    ["You PUT to /users (the whole collection).", "405 Method Not Allowed", "404 Not Found", "400 Bad Request", "501 Not Implemented", "The route exists but that verb isn't allowed → 405, with an Allow header."],
    ["Someone asks your API to brew coffee.", "418 I'm a teapot", "400 Bad Request", "406 Not Acceptable", "503 Service Unavailable", "RFC 2324, 1998. Real code, real April Fools. Backend culture is important."],
    ["Everything worked and there's data to return.", "200 OK", "201 Created", "202 Accepted", "302 Found", "The everyday success: 200."],
  ];

  const KEY = "bb-rush-best";
  let score = 0, streak = 0, timeLeft = 45, timer = null, order = [], idx = 0, playing = false;

  const el = function (id) { return document.getElementById(id); };
  el("rush-best").textContent = localStorage.getItem(KEY) || 0;

  function endGame() {
    playing = false;
    clearInterval(timer);
    const best = Math.max(parseInt(localStorage.getItem(KEY) || "0", 10), score);
    localStorage.setItem(KEY, best);
    el("rush-best").textContent = best;
    el("rush-prompt").textContent = "⏱ Time! Final score: " + score + (score >= best && score > 0 ? " — NEW BEST." : "") + " Play again?";
    el("rush-options").innerHTML = "";
    el("rush-explain").textContent = score >= 1000 ? "You speak fluent status code. The FAQ has your next steps." : "Tip: revisit FIG. 03 — first digit first, details second.";
    startBtn.disabled = false;
    startBtn.textContent = "▶ PLAY AGAIN";
  }

  function nextRound() {
    if (idx >= order.length) order = shuffle(ROUNDS); // loop with reshuffle
    const r = order[idx % order.length];
    idx++;
    el("rush-prompt").textContent = r[0];
    el("rush-explain").textContent = "";
    const opts = shuffle([[r[1], true], [r[2], false], [r[3], false], [r[4], false]]);
    const box = el("rush-options");
    box.innerHTML = "";
    opts.forEach(function (o) {
      const b = document.createElement("button");
      b.className = "game-opt";
      b.textContent = o[0];
      b.addEventListener("click", function () {
        if (!playing) return;
        box.querySelectorAll(".game-opt").forEach(function (x) { x.disabled = true; });
        if (o[1]) {
          streak++;
          const pts = 100 * Math.min(streak, 5);
          score += pts;
          b.classList.add("correct");
          el("rush-explain").textContent = "+" + pts + " · " + r[5];
        } else {
          streak = 0;
          b.classList.add("wrong");
          box.querySelectorAll(".game-opt").forEach(function (x) { if (x.textContent === r[1]) x.classList.add("correct"); });
          el("rush-explain").textContent = r[5];
        }
        el("rush-score").textContent = score;
        el("rush-streak").textContent = "×" + streak;
        setTimeout(function () { if (playing) nextRound(); }, 1100);
      });
      box.appendChild(b);
    });
  }

  startBtn.addEventListener("click", function () {
    BB.mark("arcade");
    score = 0; streak = 0; timeLeft = 45; idx = 0;
    order = shuffle(ROUNDS);
    playing = true;
    startBtn.disabled = true;
    el("rush-score").textContent = "0";
    el("rush-streak").textContent = "×0";
    el("rush-time").textContent = "45";
    el("rush-bar").style.width = "100%";
    clearInterval(timer);
    timer = setInterval(function () {
      timeLeft--;
      el("rush-time").textContent = timeLeft;
      el("rush-bar").style.width = (timeLeft / 45 * 100) + "%";
      if (timeLeft <= 0) endGame();
    }, 1000);
    nextRound();
  });
})();

/* ============ GAME 2 · Backend Quiz ============ */
(function () {
  const startBtn = document.getElementById("quiz-start");
  if (!startBtn) return;

  // level: 1 basics · 2 applied · 3 interview-ish
  const BANK = [
    // ---- level 1 ----
    [1, "Which HTTP method should never change data on the server?", "GET", ["POST", "PUT", "DELETE"], "GET is 'safe' — that guarantee is what lets caches, prefetchers and retries exist."],
    [1, "What does the backend usually talk to for permanent storage?", "A database", ["The browser's localStorage", "The CPU cache", "A CSS file"], "Browsers hold temporary state; durable data lives in a database the backend controls."],
    [1, "A '4xx' status code means the mistake belongs to…", "The client", ["The server", "The network cable", "The database admin"], "4xx = fix the request. 5xx = fix the server."],
    [1, "An API endpoint is best described as…", "A URL the server responds to with data or actions", ["A type of database", "A frontend animation", "A programming language"], "Endpoints are the contract between frontend and backend."],
    [1, "JSON is popular for APIs because it is…", "Human-readable and parseable in every language", ["Encrypted by default", "Faster than all binary formats", "Only usable in JavaScript"], "It's the lingua franca — not the fastest, but universally understood."],
    [1, "Which pair correctly matches verb → intent?", "POST → create", ["GET → delete", "DELETE → read", "PUT → subscribe"], "GET reads, POST creates, PUT replaces, DELETE removes."],
    [1, "The S in HTTPS means the connection is…", "Encrypted and the server's identity is verified (TLS)", ["Faster", "Compressed", "Cached by Google"], "FIG. 15: TLS gives encryption + integrity + authentication. SSL is just its old name."],
    [1, "A Docker container is best described as…", "Your app running in an isolated, portable environment", ["A virtual machine with its own OS kernel", "A type of database", "A cloud provider"], "FIG. 22: containers share the host kernel — lighter than VMs, identical everywhere."],
    // ---- level 2 ----
    [2, "Your endpoint is slow. The query filters on a column with no index. Best first fix?", "Add an index on that column", ["Buy a bigger server", "Switch languages", "Add more logging"], "FIG. 04: an index turns O(n) scans into O(log n) seeks — usually a 100×+ win for pennies."],
    [2, "Cache hit rate dropped from 95% to 20% after a deploy. Likely cause?", "Cache keys changed, so every lookup misses", ["Users got faster", "The database grew", "Too many workers"], "New key format = a cold cache. Everything misses until it refills — plan for it."],
    [2, "Emails should be sent after signup, but signup feels slow. Fix?", "Queue the email job; reply 202 immediately", ["Send the email before saving the user", "Make the client wait with a spinner", "Send emails from the frontend"], "FIG. 07: move slow, non-critical work off the request path."],
    [2, "One of your 4 servers starts failing health checks. A good load balancer will…", "Stop routing to it until it recovers", ["Send it more traffic to test it", "Shut down the other three", "Return 404 for all requests"], "FIG. 06: failover means the users never notice one dead server."],
    [2, "Why store password hashes instead of passwords?", "A stolen database then reveals no usable passwords", ["Hashes use less disk", "Hashes are faster to type", "It's required by HTTP"], "Salted, slow hashes (bcrypt/argon2) make leaked credentials nearly worthless."],
    [2, "A JWT's payload can be read by anyone. Why is it still safe to trust?", "The signature breaks if anyone edits it", ["It's encrypted with the user's password", "Only servers can base64-decode", "It self-destructs"], "FIG. 08: encoding ≠ encryption. Trust comes from the signature check."],
    [2, "\"Blocked by CORS policy\" in the console. Who blocked it, and where's the fix?", "The browser blocked it; fix the server's Allow-Origin headers", ["The server rejected it; fix the frontend", "The ISP blocked it; use a VPN", "DNS failed; flush the cache"], "FIG. 16: CORS is browser-side protection. The server must opt in with Access-Control-Allow-Origin."],
    [2, "The one true fix for SQL injection is…", "Parameterized queries — input travels as data, never as SQL", ["Removing quotes from input with regex", "Hiding error messages", "Renaming your tables"], "FIG. 18: sanitizing by hand always misses a case. Prepared statements can't."],
    [2, "A client gets 429 with Retry-After: 30. The well-behaved response is…", "Wait, then retry with backoff", ["Retry immediately in a loop", "Switch to POST", "Create more API keys"], "FIG. 17: 429 = rate limited. Hammering harder just keeps the token bucket empty."],
    [2, "A live dashboard must show events within ~100ms. Best transport?", "WebSocket — the server pushes over a persistent connection", ["Polling every 5 seconds", "The user refreshing the page", "Email notifications"], "FIG. 20: request/response can't push; a WebSocket pipe can."],
    // ---- level 3 ----
    [3, "Traffic will spike 50× for one hour during a product launch. Cheapest sturdy plan?", "Scale out horizontally + cache aggressively + queue slow work", ["Buy the biggest server available", "Raise all timeouts", "Turn off logging for speed"], "The classic trio: more small servers behind an LB, hot data from cache, spikes absorbed by queues."],
    [3, "Two users buy the last item at the same moment; both orders succeed. This bug is called…", "A race condition", ["A memory leak", "A stack overflow", "An off-by-one"], "Concurrent writes to shared state need transactions, locks, or atomic decrement."],
    [3, "Service A calls B, B calls C, C is down and A's requests pile up until A dies too. The fix pattern?", "A circuit breaker — fail fast when downstream is sick", ["Retry forever", "Bigger connection pool", "Move everything to one server"], "Cascading failure is death by politeness. Breakers cut off calls and recover gradually."],
    [3, "You must process each payment exactly once, but your queue redelivers on failure. Solution?", "Idempotency keys — repeat deliveries become no-ops", ["Process faster", "Never retry anything", "Use two queues"], "At-least-once delivery + idempotent handlers ≈ exactly-once effect. Interview gold."],
    [3, "Read-heavy app: 99% reads, 1% writes. A standard scaling move is…", "Read replicas — one primary writes, copies serve reads", ["Shard the primary immediately", "Cache writes", "Drop indexes to speed reads"], "Replication spreads read load; writes stay consistent on the primary."],
    [3, "Your p50 latency is 20ms but p99 is 4s. What does that mean?", "Most requests are fast; 1 in 100 is painfully slow — find the outliers", ["The service is fine", "All requests take 4s", "The metrics are broken"], "Averages lie. Tail latency is where GC pauses, cold caches and lock waits hide."],
    [3, "An editor may edit only documents they own, only during work hours. This policy is…", "ABAC — the decision uses attributes, not just the role", ["RBAC — editor is a role", "OAuth", "Two-factor auth"], "FIG. 19: as soon as 'whose document?' or 'when?' matters, roles alone can't express it."],
    [3, "You must add an index to a 100M-row production table. The safe move is…", "CREATE INDEX CONCURRENTLY via a migration — no write lock", ["CREATE INDEX at peak hours", "Drop the table and re-import", "Add the index on the replica only"], "FIG. 23: a plain CREATE INDEX locks writes for the whole build. CONCURRENTLY trades speed for uptime."],
    [3, "Why does the reverse proxy — not each app server — terminate TLS?", "One place manages certs; internal traffic and topology stay hidden", ["TLS only works on port 80", "App servers can't do math", "It makes responses smaller"], "FIG. 21: certificates, redirects and security headers live at the single front door."],
  ];

  const KEY = "bb-quiz-best";
  const el = function (id) { return document.getElementById(id); };
  el("quiz-best").textContent = localStorage.getItem(KEY) || 0;

  let run = [], idx = 0, score = 0, answered = false;
  const nextBtn = document.getElementById("quiz-next");

  function pick() {
    const byLevel = function (l) { return shuffle(BANK.filter(function (q) { return q[0] === l; })).slice(0, 4); };
    return byLevel(1).concat(byLevel(2), byLevel(3));
  }

  function show() {
    const q = run[idx];
    answered = false;
    nextBtn.disabled = true;
    el("quiz-level").textContent = q[0];
    el("quiz-qno").textContent = (idx + 1) + "/12";
    el("quiz-prompt").textContent = q[1];
    el("quiz-explain").textContent = "";
    const opts = shuffle([[q[2], true]].concat(q[3].map(function (w) { return [w, false]; })));
    const box = el("quiz-options");
    box.innerHTML = "";
    opts.forEach(function (o) {
      const b = document.createElement("button");
      b.className = "game-opt";
      b.textContent = o[0];
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        box.querySelectorAll(".game-opt").forEach(function (x) { x.disabled = true; });
        if (o[1]) { score++; b.classList.add("correct"); }
        else {
          b.classList.add("wrong");
          box.querySelectorAll(".game-opt").forEach(function (x) { if (x.textContent === q[2]) x.classList.add("correct"); });
        }
        el("quiz-score").textContent = score;
        el("quiz-explain").textContent = q[4];
        nextBtn.disabled = false;
        nextBtn.textContent = idx === run.length - 1 ? "FINISH ✓" : "NEXT →";
      });
      box.appendChild(b);
    });
  }

  function finish() {
    const best = Math.max(parseInt(localStorage.getItem(KEY) || "0", 10), score);
    localStorage.setItem(KEY, best);
    el("quiz-best").textContent = best;
    el("quiz-level").textContent = "–";
    el("quiz-qno").textContent = "done";
    el("quiz-options").innerHTML = "";
    const msg = score >= 11 ? "Interview-ready. Genuinely." :
      score >= 8 ? "Solid. Level 3 misses are your reading list." :
      score >= 5 ? "Core is forming — replay FIGS. 04–08 and try again." :
      "Everyone's first run looks like this. The figures are waiting.";
    el("quiz-prompt").textContent = "Final: " + score + "/12 — " + msg;
    el("quiz-explain").textContent = "";
    nextBtn.disabled = true;
    startBtn.textContent = "▶ PLAY AGAIN";
  }

  startBtn.addEventListener("click", function () {
    BB.mark("arcade");
    run = pick();
    idx = 0; score = 0;
    el("quiz-score").textContent = "0";
    show();
  });

  nextBtn.addEventListener("click", function () {
    if (idx === run.length - 1) return finish();
    idx++;
    show();
  });
})();
