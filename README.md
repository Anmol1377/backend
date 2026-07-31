# Backend Blueprint 📐

**Learn the backend by watching it run.**

An interactive, zero-dependency static website that teaches backend engineering through living blueprint-style visualizations, games, and honest FAQs. Every concept is a schematic you can run, break and replay.

## What's inside

| Page | Contents |
|---|---|
| `index.html` | Animated "journey of one request" (DNS → LB → server → cache/DB) + course map with progress tracking |
| `learn.html` | **Backend Core** — HTTP request builder, status-code explorer, index-vs-scan race, LRU cache, load balancer with failover, message queue with backpressure, JWT auth stepper (with tampering!), scaling up vs out |
| `dsa.html` | **Only the DSA a backend dev needs** — Big-O explorer, hash table with collisions, stack & queue, binary search tree, array vs linked list |
| `advanced.html` | **Security & Ops** — TLS handshake (with eavesdropper), CORS simulator, token-bucket rate limiting, SQL injection + parameterized queries, RBAC vs ABAC, WebSockets vs polling, nginx reverse proxy, Docker layers & containers, DB migrations, and a system-design capstone that grows a URL shortener stage by stage |
| `game.html` | **Arcade** — *Status Rush* (45-second status-code game with streaks) and a 3-level backend quiz with explanations. High scores persist in localStorage |
| `faq.html` | Searchable FAQ: languages, SQL vs NoSQL, REST vs GraphQL, how much DSA you need, deployment, timelines |

### "Go deeper" panels

Every one of the 23 modules has a collapsible **deep-dive** with detailed, runnable **Node.js and Go** code (tabbed) — real Express/`net/http` handlers, `pg`/`pgx` queries, Redis cache-aside, BullMQ/channel workers, JWT signing & verification, CORS/rate-limit config, parameterized queries, RBAC/ABAC middleware, `ws`/gorilla WebSockets, an `nginx.conf`/Caddyfile, multi-stage Dockerfiles, migration workflows, and a system-design interview framework — each with "how to run it" and "going further" notes.

No frameworks, no build step, no backend (fittingly, all servers are simulated). Plain HTML + CSS + vanilla JS.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd backend-learn
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages

1. Create a new repository on GitHub (e.g. `backend-blueprint`).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Backend Blueprint: interactive backend learning site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/backend-blueprint.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment**
   - Source: *Deploy from a branch*
   - Branch: `main`, folder `/ (root)` → **Save**
4. Wait ~1 minute. Your site is live at
   `https://<your-username>.github.io/backend-blueprint/`

All links are relative, so it works from any repo name or subpath. The `.nojekyll` file tells GitHub Pages to serve files as-is.

## Progress & scores

Explored modules and game high scores are stored in your browser's `localStorage` (`bb-progress`, `bb-rush-best`, `bb-quiz-best`). Nothing is sent anywhere — there is no server.

## License

MIT — learn from it, fork it, remix it.
