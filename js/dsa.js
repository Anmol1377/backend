/* DSA for Backend — FIGS 10–14 */

/* ============ FIG 10 · Big-O ============ */
(function () {
  const slider = document.getElementById("bigo-slider");
  if (!slider) return;
  const rowsEl = document.getElementById("bigo-rows");
  const FNS = [
    { name: "O(1)", note: "hash / cache lookup", f: function (n) { return 1; } },
    { name: "O(log n)", note: "index seek (FIG. 04)", f: function (n) { return Math.max(1, Math.log2(n)); } },
    { name: "O(n)", note: "full table scan", f: function (n) { return n; } },
    { name: "O(n log n)", note: "sorting results", f: function (n) { return n * Math.max(1, Math.log2(n)); } },
    { name: "O(n²)", note: "nested-loop join", f: function (n) { return n * n; } },
  ];

  function fmt(x) {
    if (x >= 1e12) return (x / 1e12).toFixed(1) + " T";
    if (x >= 1e9) return (x / 1e9).toFixed(1) + " B";
    if (x >= 1e6) return (x / 1e6).toFixed(1) + " M";
    if (x >= 1e3) return (x / 1e3).toFixed(1) + " k";
    return Math.round(x).toString();
  }

  function render() {
    const n = Math.round(Math.pow(10, parseFloat(slider.value)));
    document.getElementById("bigo-n").textContent = n.toLocaleString();
    const max = FNS[4].f(n);
    rowsEl.innerHTML = "";
    FNS.forEach(function (fn) {
      const ops = fn.f(n);
      // log scale so small values stay visible
      const pct = Math.max(2, (Math.log10(ops + 1) / Math.log10(max + 1)) * 100);
      const row = document.createElement("div");
      row.innerHTML =
        '<div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:4px;">' +
        '<span class="mono" style="font-size:.74rem; color:var(--chalk-strong);">' + fn.name +
        ' <span style="color:var(--chalk); opacity:.8;">· ' + fn.note + "</span></span>" +
        '<span class="mono" style="font-size:.74rem; color:var(--amber);">' + fmt(ops) + " ops</span></div>" +
        '<div class="progress-track"><i style="width:' + pct.toFixed(1) + '%;"></i></div>';
      rowsEl.appendChild(row);
    });
    const secs = FNS[4].f(n) / 1e6;
    const t = secs < 1 ? "<b>" + (secs * 1000).toFixed(1) + " ms</b>"
      : secs < 120 ? "<b>~" + Math.round(secs) + " s</b>"
      : secs < 7200 ? "<b>~" + Math.round(secs / 60) + " min</b>"
      : secs < 172800 ? "<b>~" + Math.round(secs / 3600) + " hours</b>"
      : "<b>~" + Math.round(secs / 86400) + " days</b>";
    document.getElementById("bigo-note").innerHTML = "at 1 op/µs, O(n²) here takes " + t + " · bars are log-scale";
  }
  slider.addEventListener("input", function () { BB.mark("bigo"); render(); });
  render();
})();

/* ============ FIG 11 · Hash table ============ */
(function () {
  const insertBtn = document.getElementById("hash-insert");
  if (!insertBtn) return;
  const keyEl = document.getElementById("hash-key");
  const mathEl = document.getElementById("hash-math");
  const bucketsEl = document.getElementById("hash-buckets");
  const N = 8;
  let buckets = Array.from({ length: N }, function () { return []; });

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function render(hotBucket, hotKey) {
    bucketsEl.innerHTML = "";
    buckets.forEach(function (chain, i) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; align-items:center; gap:8px;";
      const idx = document.createElement("div");
      idx.className = "cell" + (i === hotBucket ? " hot" : "");
      idx.style.minWidth = "38px";
      idx.textContent = i;
      row.appendChild(idx);
      if (!chain.length) {
        const empty = document.createElement("span");
        empty.className = "mono";
        empty.style.cssText = "font-size:.7rem; color:rgba(168,195,240,.4);";
        empty.textContent = "— empty";
        row.appendChild(empty);
      }
      chain.forEach(function (k, j) {
        if (j > 0) {
          const arrow = document.createElement("span");
          arrow.className = "mono";
          arrow.style.cssText = "color:var(--chalk); font-size:.8rem;";
          arrow.textContent = "→";
          row.appendChild(arrow);
        }
        const c = document.createElement("div");
        c.className = "cell" + (k === hotKey ? " ok-cell" : "");
        c.textContent = k;
        row.appendChild(c);
      });
      bucketsEl.appendChild(row);
    });
  }

  function showMath(k, b, extra) {
    mathEl.innerHTML = "";
    bbLog(mathEl, 'hash("<span class="hl">' + k + '</span>") = <span class="warn">' + hash(k) + "</span>");
    bbLog(mathEl, '<span class="warn">' + hash(k) + "</span> % 8 = <span class=\"ok\">bucket " + b + "</span>" + (extra ? " · " + extra : ""));
  }

  insertBtn.addEventListener("click", function () {
    const k = keyEl.value.trim();
    if (!k) { keyEl.focus(); return; }
    BB.mark("hash");
    const b = hash(k) % N;
    const chain = buckets[b];
    if (chain.indexOf(k) === -1) {
      chain.push(k);
      showMath(k, b, chain.length > 1 ? '<span class="err">collision!</span> chained after ' + (chain.length - 1) + " key(s)" : "stored");
    } else {
      showMath(k, b, "already stored — overwritten");
    }
    render(b, k);
    keyEl.value = "";
    keyEl.focus();
  });

  document.getElementById("hash-lookup").addEventListener("click", function () {
    const k = keyEl.value.trim();
    if (!k) { keyEl.focus(); return; }
    BB.mark("hash");
    const b = hash(k) % N;
    const chain = buckets[b];
    const pos = chain.indexOf(k);
    showMath(k, b, pos === -1
      ? '<span class="err">not found</span> after checking ' + chain.length + " key(s)"
      : '<span class="ok">found</span> in ' + (pos + 1) + " step(s) — no other bucket even looked at");
    render(b, pos === -1 ? null : k);
  });

  document.getElementById("hash-clear").addEventListener("click", function () {
    buckets = Array.from({ length: N }, function () { return []; });
    mathEl.innerHTML = "";
    render();
  });

  keyEl.addEventListener("keydown", function (e) { if (e.key === "Enter") insertBtn.click(); });

  // seed with a few keys
  ["user:42", "cart:7", "session:9f2"].forEach(function (k) { buckets[hash(k) % N].push(k); });
  render();
})();

/* ============ FIG 12 · Stack & Queue ============ */
(function () {
  const pushBtn = document.getElementById("stack-push");
  if (!pushBtn) return;

  const CALLS = ["main()", "handleRequest()", "getUser()", "queryDb()", "parseRow()", "toJson()"];
  let stack = [];
  const stackViz = document.getElementById("stack-viz");
  const stackNote = document.getElementById("stack-note");

  function renderStack(hot) {
    stackViz.innerHTML = "";
    stack.forEach(function (name, i) {
      const c = document.createElement("div");
      c.className = "cell" + (i === stack.length - 1 && hot ? " hot" : "");
      c.style.width = "100%";
      c.textContent = name;
      stackViz.appendChild(c);
    });
  }
  pushBtn.addEventListener("click", function () {
    BB.mark("stackqueue");
    if (stack.length >= CALLS.length) {
      stackNote.innerHTML = '<span class="bad">stack overflow!</span> — too deep. (Yes, the website is named after this.)';
      return;
    }
    stack.push(CALLS[stack.length]);
    renderStack(true);
    stackNote.textContent = stack[stack.length - 1] + " is now on top — it must finish (pop) first";
  });
  document.getElementById("stack-pop").addEventListener("click", function () {
    BB.mark("stackqueue");
    if (!stack.length) { stackNote.textContent = "stack empty — program finished"; return; }
    const popped = stack.pop();
    renderStack(true);
    stackNote.textContent = popped + " returned → control goes back to " + (stack[stack.length - 1] || "the OS");
  });

  let queue = [];
  let jobNo = 0;
  const fifoViz = document.getElementById("fifo-viz");
  const fifoNote = document.getElementById("fifo-note");
  function renderQueue(hotFirst) {
    fifoViz.innerHTML = "";
    queue.forEach(function (j, i) {
      const c = document.createElement("div");
      c.className = "cell" + (i === 0 && hotFirst ? " hot" : "");
      c.textContent = j;
      fifoViz.appendChild(c);
    });
  }
  document.getElementById("fifo-enq").addEventListener("click", function () {
    BB.mark("stackqueue");
    if (queue.length >= 12) { fifoNote.innerHTML = '<span class="bad">queue full — this is backpressure (FIG. 07)</span>'; return; }
    jobNo++;
    queue.push("job-" + jobNo);
    renderQueue(false);
    fifoNote.textContent = "job-" + jobNo + " joins the back of the line";
  });
  document.getElementById("fifo-deq").addEventListener("click", function () {
    BB.mark("stackqueue");
    if (!queue.length) { fifoNote.textContent = "queue empty — workers are napping"; return; }
    const j = queue.shift();
    renderQueue(true);
    fifoNote.textContent = j + " → worker (it waited longest, it goes first)";
  });
})();

/* ============ FIG 13 · BST ============ */
(function () {
  const svg = document.getElementById("tree-svg");
  if (!svg) return;
  const keyEl = document.getElementById("tree-key");
  let root = null, size = 0;

  function insert(node, key, depth) {
    if (depth > 5) return node; // keep drawing sane
    if (!node) { size++; return { key: key, l: null, r: null }; }
    if (key === node.key) return node;
    if (key < node.key) node.l = insert(node.l, key, depth + 1);
    else node.r = insert(node.r, key, depth + 1);
    return node;
  }

  function draw(highlightPath) {
    svg.innerHTML = "";
    const hp = highlightPath || [];
    function rec(node, x, y, spread) {
      if (!node) return;
      const onPath = hp.indexOf(node.key) !== -1;
      if (node.l) {
        line(x, y, x - spread, y + 62, hp.indexOf(node.l.key) !== -1 && onPath);
        rec(node.l, x - spread, y + 62, spread / 2);
      }
      if (node.r) {
        line(x, y, x + spread, y + 62, hp.indexOf(node.r.key) !== -1 && onPath);
        rec(node.r, x + spread, y + 62, spread / 2);
      }
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 19);
      c.setAttribute("fill", onPath ? "#ffb224" : "rgba(10,33,73,.7)");
      c.setAttribute("stroke", onPath ? "#ffb224" : "#a8c3f0");
      c.setAttribute("stroke-width", "1.5");
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x); t.setAttribute("y", y + 5);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "JetBrains Mono, monospace");
      t.setAttribute("font-size", "13");
      t.setAttribute("font-weight", "700");
      t.setAttribute("fill", onPath ? "#0a2149" : "#e2ecfd");
      t.textContent = node.key;
      g.appendChild(c); g.appendChild(t);
      svg.appendChild(g);
    }
    function line(x1, y1, x2, y2, hot) {
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("stroke", hot ? "#ffb224" : "rgba(168,195,240,.45)");
      l.setAttribute("stroke-width", hot ? "2.5" : "1.5");
      svg.appendChild(l);
    }
    rec(root, 380, 34, 180);
    document.getElementById("tree-count").textContent = size;
    document.getElementById("tree-scan").textContent = size ? "up to " + size + " reads" : "–";
  }

  function doInsert(k) {
    root = insert(root, k, 0);
    draw();
  }

  document.getElementById("tree-insert").addEventListener("click", function () {
    const k = parseInt(keyEl.value, 10);
    if (isNaN(k) || k < 0 || k > 99) { keyEl.focus(); return; }
    BB.mark("tree");
    doInsert(k);
    keyEl.value = "";
  });

  document.getElementById("tree-random").addEventListener("click", function () {
    BB.mark("tree");
    for (let i = 0; i < 10; i++) doInsert(Math.floor(Math.random() * 100));
  });

  document.getElementById("tree-search").addEventListener("click", function () {
    const k = parseInt(keyEl.value, 10);
    if (isNaN(k)) { keyEl.focus(); return; }
    BB.mark("tree");
    const path = [];
    let cur = root;
    while (cur) {
      path.push(cur.key);
      if (k === cur.key) break;
      cur = k < cur.key ? cur.l : cur.r;
    }
    const found = cur !== null && cur !== undefined;
    document.getElementById("tree-hops").textContent = path.length;
    document.getElementById("tree-note").textContent = found
      ? "found " + k + " in " + path.length + " hops ✓"
      : k + " not in tree — " + path.length + " hops to prove it";
    draw(path);
  });

  document.getElementById("tree-clear").addEventListener("click", function () {
    root = null; size = 0; draw();
    document.getElementById("tree-hops").textContent = "–";
    document.getElementById("tree-note").textContent = "smaller ← node → bigger";
  });

  // seed a balanced-ish tree
  [50, 25, 75, 12, 37, 62, 88].forEach(doInsert);
})();

/* ============ FIG 14 · Array vs linked list ============ */
(function () {
  const accessBtn = document.getElementById("al-access");
  if (!accessBtn) return;
  const N = 9;
  const arrayEl = document.getElementById("al-array");
  const listEl = document.getElementById("al-list");
  let busy = false;

  function build(el, linked, values) {
    el.innerHTML = "";
    const cells = [];
    values.forEach(function (v, i) {
      if (linked && i > 0) {
        const arrow = document.createElement("span");
        arrow.className = "mono";
        arrow.style.cssText = "color:var(--chalk); align-self:center; font-size:.8rem;";
        arrow.textContent = "→";
        el.appendChild(arrow);
      }
      const c = document.createElement("div");
      c.className = "cell";
      c.style.minWidth = "52px";
      c.innerHTML = v + '<br><span style="font-size:.58rem; opacity:.6;">' + (linked ? "0x" + (Math.abs(v * 2654435761) % 4096).toString(16) : "#" + i) + "</span>";
      el.appendChild(c);
      cells.push(c);
    });
    return cells;
  }

  let arrVals = [3, 9, 4, 1, 7, 8, 2, 6, 5].slice(0, N);
  let arrCells = build(arrayEl, false, arrVals);
  let listCells = build(listEl, true, arrVals);

  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, BB.reduceMotion ? 0 : ms); }); };
  function clearHot() {
    arrCells.concat(listCells).forEach(function (c) { c.classList.remove("hot", "ok-cell"); });
  }

  accessBtn.addEventListener("click", async function () {
    if (busy) return;
    busy = true;
    BB.mark("arraylist");
    clearHot();
    // array: direct jump
    arrCells[7].classList.add("ok-cell");
    document.getElementById("al-array-steps").textContent = "1 (computed address)";
    // list: walk
    for (let i = 0; i <= 7; i++) {
      listCells[i].classList.add("hot");
      document.getElementById("al-list-steps").textContent = String(i + 1);
      await wait(260);
      if (i < 7) listCells[i].classList.remove("hot");
    }
    listCells[7].classList.remove("hot");
    listCells[7].classList.add("ok-cell");
    busy = false;
  });

  document.getElementById("al-insert").addEventListener("click", async function () {
    if (busy) return;
    busy = true;
    BB.mark("arraylist");
    clearHot();
    document.getElementById("al-note").textContent = "inserting 0 at the front…";
    // array: shift everything right
    for (let i = arrCells.length - 1; i >= 0; i--) {
      arrCells[i].classList.add("hot");
      await wait(120);
      arrCells[i].classList.remove("hot");
    }
    arrVals = [0].concat(arrVals).slice(0, N);
    arrCells = build(arrayEl, false, arrVals);
    arrCells[0].classList.add("ok-cell");
    document.getElementById("al-array-steps").textContent = N + " (shifted every element)";
    // list: just rewire head
    const listVals = [0].concat(arrVals.slice(1)).slice(0, N);
    listCells = build(listEl, true, listVals);
    listCells[0].classList.add("ok-cell");
    document.getElementById("al-list-steps").textContent = "1 (rewired one pointer)";
    document.getElementById("al-note").textContent = "the tables have turned";
    busy = false;
  });
})();
