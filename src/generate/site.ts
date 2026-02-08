import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { loadAllHackathons, formatCurrency } from "../utils.js"
import type { Hackathon } from "../types.js"

const SITE_DIR = join(import.meta.dirname, "..", "..", "site")

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function generateSite(): Promise<void> {
  await mkdir(SITE_DIR, { recursive: true })

  const hackathons = await loadAllHackathons()
  const hackathonsJson = JSON.stringify(hackathons)

  // Extract unique values for filter dropdowns
  const formats = [...new Set(hackathons.map((h) => h.format))].sort()
  const chains = [
    ...new Set(
      hackathons.filter((h) => h.blockchain).map((h) => h.blockchain!.chain)
    ),
  ].sort()
  const categories = [
    ...new Set(hackathons.flatMap((h) => h.categories)),
  ].sort()
  const statuses = [...new Set(hackathons.map((h) => h.status))].sort()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Agent Hackathons - Live Directory</title>
  <meta name="description" content="Automatically updated directory of AI agent and agentic coding hackathons. Filter by prize pool, format, blockchain, and deadline.">
  <link rel="alternate" type="application/rss+xml" title="AI Agent Hackathons" href="./feed.xml">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --surface-hover: #1a1a25;
      --border: #2a2a3a;
      --text: #e4e4ef;
      --text-muted: #8888a0;
      --accent: #6c63ff;
      --accent-hover: #817aff;
      --green: #34d399;
      --yellow: #fbbf24;
      --red: #f87171;
      --blue: #60a5fa;
      --orange: #fb923c;
      --radius: 8px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--accent), var(--blue));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header p {
      color: var(--text-muted);
      font-size: 1rem;
    }

    .stats {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      margin: 1.5rem 0;
      flex-wrap: wrap;
    }

    .stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1.25rem;
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filters {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: end;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
      min-width: 150px;
    }

    .filter-group label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .filter-group select,
    .filter-group input {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      width: 100%;
      outline: none;
      transition: border-color 0.15s;
    }

    .filter-group select:focus,
    .filter-group input:focus {
      border-color: var(--accent);
    }

    .filter-group select option {
      background: var(--bg);
      color: var(--text);
    }

    .reset-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .reset-btn:hover {
      border-color: var(--accent);
      color: var(--text);
    }

    .results-count {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }

    .hackathon-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .hackathon-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      transition: border-color 0.15s, transform 0.1s;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      display: block;
    }

    .hackathon-card:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
    }

    .card-organizer {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .card-meta {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .tag-prize {
      background: rgba(52, 211, 153, 0.15);
      color: var(--green);
    }

    .tag-format {
      background: rgba(96, 165, 250, 0.15);
      color: var(--blue);
    }

    .tag-deadline {
      background: rgba(251, 191, 36, 0.15);
      color: var(--yellow);
    }

    .tag-chain {
      background: rgba(251, 146, 60, 0.15);
      color: var(--orange);
    }

    .tag-status {
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-registration_open { background: rgba(52, 211, 153, 0.15); color: var(--green); }
    .status-active { background: rgba(96, 165, 250, 0.15); color: var(--blue); }
    .status-upcoming { background: rgba(251, 191, 36, 0.15); color: var(--yellow); }
    .status-judging { background: rgba(251, 146, 60, 0.15); color: var(--orange); }
    .status-completed { background: rgba(136, 136, 160, 0.15); color: var(--text-muted); }

    .card-categories {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .cat-tag {
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      font-size: 0.65rem;
      background: rgba(108, 99, 255, 0.1);
      color: var(--accent);
    }

    .card-description {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
    }

    .empty-state p {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    .links {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }

    .links a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.15s;
    }

    .links a:hover {
      color: var(--accent-hover);
    }

    footer {
      text-align: center;
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      margin-top: 3rem;
    }

    .sort-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .sort-controls label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .sort-controls select {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      padding: 0.35rem 0.6rem;
      font-size: 0.8rem;
      outline: none;
    }

    @media (max-width: 640px) {
      .container { padding: 1rem; }
      header h1 { font-size: 1.5rem; }
      .stats { gap: 0.75rem; }
      .filters { flex-direction: column; }
      .filter-group { min-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AI Agent Hackathons</h1>
      <p>Automatically updated directory of AI agent and agentic coding hackathons</p>
      <div class="links">
        <a href="./feed.xml">RSS Feed</a>
        <a href="./hackathons.ics">Calendar (iCal)</a>
        <a href="https://github.com/your-username/awesome-ai-agent-hackathons">GitHub</a>
        <a href="https://github.com/your-username/awesome-ai-agent-hackathons/issues/new?template=submit-hackathon.yml">Submit a Hackathon</a>
      </div>
    </header>

    <div class="stats" id="stats"></div>

    <div class="filters">
      <div class="filter-group">
        <label for="filter-search">Search</label>
        <input type="text" id="filter-search" placeholder="Name, organizer...">
      </div>
      <div class="filter-group">
        <label for="filter-format">Format</label>
        <select id="filter-format">
          <option value="">All Formats</option>
          ${formats.map((f) => `<option value="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</option>`).join("\n          ")}
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-status">Status</label>
        <select id="filter-status">
          <option value="">All Statuses</option>
          ${statuses.map((s) => `<option value="${s}">${s.replace(/_/g, " ").replace(/\\b\\w/g, (c: string) => c.toUpperCase())}</option>`).join("\n          ")}
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-chain">Blockchain</label>
        <select id="filter-chain">
          <option value="">All (incl. non-blockchain)</option>
          <option value="__any__">Any Blockchain</option>
          ${chains.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n          ")}
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-prize-min">Min Prize ($)</label>
        <input type="number" id="filter-prize-min" placeholder="0" min="0" step="1000">
      </div>
      <div class="filter-group">
        <label for="filter-deadline">Deadline Before</label>
        <input type="date" id="filter-deadline">
      </div>
      <div class="filter-group">
        <label for="filter-category">Category</label>
        <select id="filter-category">
          <option value="">All Categories</option>
          ${categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n          ")}
        </select>
      </div>
      <button class="reset-btn" onclick="resetFilters()">Reset</button>
    </div>

    <div class="sort-controls">
      <label for="sort-by">Sort by:</label>
      <select id="sort-by">
        <option value="deadline">Deadline (soonest)</option>
        <option value="prize-desc">Prize (highest)</option>
        <option value="prize-asc">Prize (lowest)</option>
        <option value="name">Name (A-Z)</option>
        <option value="updated">Recently Updated</option>
      </select>
    </div>

    <div class="results-count" id="results-count"></div>
    <div class="hackathon-grid" id="hackathon-grid"></div>
  </div>

  <footer>
    <p>Auto-updated every 6 hours via GitHub Actions</p>
    <p>Last build: ${new Date().toISOString().split("T")[0]}</p>
  </footer>

  <script>
    const hackathons = ${hackathonsJson};

    const statusOrder = {
      registration_open: 0,
      active: 1,
      upcoming: 2,
      judging: 3,
      completed: 4,
    };

    const statusLabels = {
      registration_open: "Registration Open",
      active: "Active",
      upcoming: "Upcoming",
      judging: "Judging",
      completed: "Completed",
    };

    function formatCurrency(amount, currency) {
      if (!amount) return "TBD";
      const cur = (currency || "USD").toUpperCase();
      if (cur === "USD" || cur === "USDC") return "$" + amount.toLocaleString();
      return amount.toLocaleString() + " " + currency;
    }

    function renderStats(filtered) {
      const active = filtered.filter(h => ["registration_open", "active", "upcoming"].includes(h.status));
      const totalPrize = active.reduce((s, h) => s + (h.prizePool?.total || 0), 0);
      const blockchainCount = filtered.filter(h => h.blockchain).length;

      document.getElementById("stats").innerHTML =
        '<div class="stat"><div class="stat-value">' + active.length + '</div><div class="stat-label">Active</div></div>' +
        '<div class="stat"><div class="stat-value">' + filtered.length + '</div><div class="stat-label">Total</div></div>' +
        '<div class="stat"><div class="stat-value">' + formatCurrency(totalPrize, "USD") + '</div><div class="stat-label">Active Prizes</div></div>' +
        '<div class="stat"><div class="stat-value">' + blockchainCount + '</div><div class="stat-label">Blockchain</div></div>';
    }

    function renderCard(h) {
      const prize = h.prizePool ? formatCurrency(h.prizePool.total, h.prizePool.currency) : null;
      const deadline = h.submissionDeadline || h.registrationDeadline;
      const chain = h.blockchain?.chain;

      let meta = "";
      if (prize) meta += '<span class="tag tag-prize">' + prize + '</span>';
      meta += '<span class="tag tag-format">' + h.format + '</span>';
      if (deadline) meta += '<span class="tag tag-deadline">' + deadline + '</span>';
      if (chain) meta += '<span class="tag tag-chain">' + chain + '</span>';

      const cats = h.categories.slice(0, 5).map(function(c) {
        return '<span class="cat-tag">' + c + '</span>';
      }).join("");

      const desc = h.description ? '<div class="card-description">' + h.description.replace(/</g, "&lt;") + '</div>' : "";

      return '<a href="' + h.url + '" target="_blank" rel="noopener" class="hackathon-card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">' + h.name.replace(/</g, "&lt;") + '</div>' +
          '<div class="card-organizer">' + h.organizer.replace(/</g, "&lt;") + '</div></div>' +
          '<span class="tag-status status-' + h.status + '">' + (statusLabels[h.status] || h.status) + '</span>' +
        '</div>' +
        desc +
        '<div class="card-meta">' + meta + '</div>' +
        '<div class="card-categories">' + cats + '</div>' +
      '</a>';
    }

    function getFilters() {
      return {
        search: document.getElementById("filter-search").value.toLowerCase().trim(),
        format: document.getElementById("filter-format").value,
        status: document.getElementById("filter-status").value,
        chain: document.getElementById("filter-chain").value,
        prizeMin: parseInt(document.getElementById("filter-prize-min").value) || 0,
        deadline: document.getElementById("filter-deadline").value,
        category: document.getElementById("filter-category").value,
        sortBy: document.getElementById("sort-by").value,
      };
    }

    function applyFilters() {
      var f = getFilters();

      var filtered = hackathons.filter(function(h) {
        if (f.search) {
          var searchable = (h.name + " " + h.organizer + " " + h.categories.join(" ")).toLowerCase();
          if (searchable.indexOf(f.search) === -1) return false;
        }
        if (f.format && h.format !== f.format) return false;
        if (f.status && h.status !== f.status) return false;
        if (f.chain === "__any__" && !h.blockchain) return false;
        if (f.chain && f.chain !== "__any__" && (!h.blockchain || h.blockchain.chain !== f.chain)) return false;
        if (f.prizeMin > 0 && (!h.prizePool || h.prizePool.total < f.prizeMin)) return false;
        if (f.deadline) {
          var d = h.submissionDeadline || h.registrationDeadline;
          if (!d || d > f.deadline) return false;
        }
        if (f.category && !h.categories.includes(f.category)) return false;
        return true;
      });

      filtered.sort(function(a, b) {
        switch (f.sortBy) {
          case "deadline":
            var da = a.submissionDeadline || a.registrationDeadline || "9999";
            var db = b.submissionDeadline || b.registrationDeadline || "9999";
            return da.localeCompare(db);
          case "prize-desc":
            return (b.prizePool?.total || 0) - (a.prizePool?.total || 0);
          case "prize-asc":
            return (a.prizePool?.total || 0) - (b.prizePool?.total || 0);
          case "name":
            return a.name.localeCompare(b.name);
          case "updated":
            return b.lastUpdated.localeCompare(a.lastUpdated);
          default:
            return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        }
      });

      renderStats(filtered);

      document.getElementById("results-count").textContent =
        "Showing " + filtered.length + " of " + hackathons.length + " hackathons";

      var grid = document.getElementById("hackathon-grid");
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No hackathons match your filters</p><p>Try adjusting your search criteria</p></div>';
      } else {
        grid.innerHTML = filtered.map(renderCard).join("");
      }
    }

    function resetFilters() {
      document.getElementById("filter-search").value = "";
      document.getElementById("filter-format").value = "";
      document.getElementById("filter-status").value = "";
      document.getElementById("filter-chain").value = "";
      document.getElementById("filter-prize-min").value = "";
      document.getElementById("filter-deadline").value = "";
      document.getElementById("filter-category").value = "";
      document.getElementById("sort-by").value = "deadline";
      applyFilters();
    }

    // Bind filter events
    ["filter-search", "filter-format", "filter-status", "filter-chain",
     "filter-prize-min", "filter-deadline", "filter-category", "sort-by"
    ].forEach(function(id) {
      var el = document.getElementById(id);
      el.addEventListener("input", applyFilters);
      el.addEventListener("change", applyFilters);
    });

    // Initial render
    applyFilters();
  </script>
</body>
</html>`

  await writeFile(join(SITE_DIR, "index.html"), html, "utf-8")
  console.info(
    `Static site generated with ${hackathons.length} hackathons`
  )
}

const isDirectRun = process.argv[1]?.includes("site")
if (isDirectRun) {
  generateSite().catch((error) => {
    console.error("Site generation failed:", error)
    process.exit(1)
  })
}
