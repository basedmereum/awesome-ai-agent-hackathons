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
  <title>AI Agent Hackathons</title>
  <meta name="description" content="Automatically updated directory of AI agent and agentic coding hackathons. Filter by prize pool, format, blockchain, and deadline.">
  <link rel="alternate" type="application/rss+xml" title="AI Agent Hackathons" href="./feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
      --sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

      --bg: #0c0c0e;
      --bg-raised: #111114;
      --bg-elevated: #18181c;
      --bg-hover: #1e1e24;
      --border: rgba(255, 255, 255, 0.06);
      --border-active: rgba(255, 255, 255, 0.12);

      --text-primary: #e8e8ed;
      --text-secondary: #8a8a9a;
      --text-tertiary: #55555f;
      --text-inverse: #0c0c0e;

      --amber: #f0b429;
      --amber-dim: rgba(240, 180, 41, 0.12);
      --amber-glow: rgba(240, 180, 41, 0.06);
      --green: #10b981;
      --green-dim: rgba(16, 185, 129, 0.12);
      --blue: #3b82f6;
      --blue-dim: rgba(59, 130, 246, 0.12);
      --orange: #f97316;
      --orange-dim: rgba(249, 115, 22, 0.12);
      --red: #ef4444;
      --red-dim: rgba(239, 68, 68, 0.12);
      --purple: #a78bfa;
      --purple-dim: rgba(167, 139, 250, 0.10);

      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* --- NOISE TEXTURE OVERLAY --- */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      opacity: 0.015;
      pointer-events: none;
      z-index: 9999;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 256px;
    }

    ::selection {
      background: var(--amber);
      color: var(--text-inverse);
    }

    .page {
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    /* --- HEADER --- */
    .hero {
      padding: 4rem 0 3rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .hero-title {
      margin-bottom: 1.5rem;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.1s forwards;
    }

    .hero-label {
      font-family: var(--mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 0.5rem;
    }

    .hero-title h1 {
      font-family: var(--mono);
      font-size: clamp(2rem, 6vw, 3.5rem);
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }

    .hero-sub {
      font-family: var(--sans);
      font-size: 1.05rem;
      color: var(--text-secondary);
      max-width: 520px;
      line-height: 1.7;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.25s forwards;
    }

    .hero-nav {
      display: flex;
      gap: 1.25rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.35s forwards;
    }

    .hero-nav a {
      font-family: var(--mono);
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-decoration: none;
      letter-spacing: 0.02em;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .hero-nav a::before {
      content: '>';
      color: var(--text-tertiary);
      transition: color 0.2s;
    }

    .hero-nav a:hover {
      color: var(--amber);
    }

    .hero-nav a:hover::before {
      color: var(--amber);
    }

    /* --- STATS BAR --- */
    .stats-bar {
      display: flex;
      gap: 2.5rem;
      padding: 1.25rem 0;
      margin-bottom: 1.5rem;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.45s forwards;
    }

    .stat-item {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .stat-value {
      font-family: var(--mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .stat-value.highlight {
      color: var(--amber);
    }

    .stat-label {
      font-family: var(--mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* --- COMMAND BAR (Filters) --- */
    .command-bar {
      background: var(--bg-raised);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 1.75rem;
      overflow: hidden;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.55s forwards;
    }

    .command-bar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    .command-bar-title {
      font-family: var(--mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .command-bar-reset {
      font-family: var(--mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      transition: all 0.15s;
      letter-spacing: 0.02em;
    }

    .command-bar-reset:hover {
      color: var(--amber);
      background: var(--amber-dim);
    }

    .command-bar-body {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr);
      gap: 0;
    }

    .filter-cell {
      padding: 0.75rem 1rem;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .filter-cell:last-child {
      border-right: none;
    }

    .filter-label {
      font-family: var(--mono);
      font-size: 0.6rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .filter-cell input,
    .filter-cell select {
      font-family: var(--mono);
      font-size: 0.8rem;
      color: var(--text-primary);
      background: transparent;
      border: none;
      outline: none;
      width: 100%;
      padding: 0.15rem 0;
      letter-spacing: 0.01em;
    }

    .filter-cell select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2355555f' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0 center;
      padding-right: 1rem;
    }

    .filter-cell select option {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .filter-cell input::placeholder {
      color: var(--text-tertiary);
    }

    .command-bar-row2 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border-top: 1px solid var(--border);
    }

    /* --- RESULTS --- */
    .results-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      opacity: 0;
      animation: fadeUp 0.8s var(--ease-out) 0.6s forwards;
    }

    .results-count {
      font-family: var(--mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
      letter-spacing: 0.05em;
    }

    .sort-select {
      font-family: var(--mono);
      font-size: 0.7rem;
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.35rem 1.5rem 0.35rem 0.6rem;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2355555f' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      transition: border-color 0.15s;
    }

    .sort-select:hover {
      border-color: var(--border-active);
    }

    .sort-select option {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    /* --- HACKATHON LIST --- */
    .hackathon-list {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 4rem;
    }

    .h-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1.5rem;
      align-items: start;
      padding: 1.25rem 1.5rem;
      background: var(--bg-raised);
      text-decoration: none;
      color: inherit;
      transition: background 0.2s var(--ease-out);
      position: relative;
      opacity: 0;
      animation: cardIn 0.5s var(--ease-out) forwards;
    }

    .h-card:hover {
      background: var(--bg-hover);
    }

    .h-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: transparent;
      transition: background 0.2s;
    }

    .h-card:hover::before {
      background: var(--amber);
    }

    .h-card-left {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }

    .h-card-top {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .h-name {
      font-family: var(--sans);
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      transition: color 0.2s;
    }

    .h-card:hover .h-name {
      color: var(--amber);
    }

    .h-status {
      font-family: var(--mono);
      font-size: 0.55rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      white-space: nowrap;
    }

    .h-status-registration_open {
      background: var(--green-dim);
      color: var(--green);
    }

    .h-status-active {
      background: var(--blue-dim);
      color: var(--blue);
    }

    .h-status-upcoming {
      background: var(--amber-dim);
      color: var(--amber);
    }

    .h-status-judging {
      background: var(--orange-dim);
      color: var(--orange);
    }

    .h-status-completed {
      background: rgba(255,255,255,0.04);
      color: var(--text-tertiary);
    }

    .h-org {
      font-family: var(--sans);
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .h-desc {
      font-family: var(--sans);
      font-size: 0.8rem;
      color: var(--text-tertiary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .h-tags {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-top: 0.2rem;
    }

    .h-tag {
      font-family: var(--mono);
      font-size: 0.6rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      background: rgba(255,255,255,0.03);
      color: var(--text-tertiary);
      letter-spacing: 0.02em;
    }

    .h-tag-chain {
      background: var(--purple-dim);
      color: var(--purple);
    }

    .h-card-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
      flex-shrink: 0;
      padding-top: 0.1rem;
    }

    .h-prize {
      font-family: var(--mono);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--amber);
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    .h-prize-tbd {
      color: var(--text-tertiary);
      font-weight: 500;
      font-size: 0.85rem;
    }

    .h-deadline {
      font-family: var(--mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .h-deadline-soon {
      color: var(--red);
    }

    .h-format {
      font-family: var(--mono);
      font-size: 0.6rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* --- EMPTY STATE --- */
    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      background: var(--bg-raised);
      border-radius: 10px;
      margin-bottom: 4rem;
    }

    .empty-state-icon {
      font-family: var(--mono);
      font-size: 2rem;
      color: var(--text-tertiary);
      margin-bottom: 0.75rem;
    }

    .empty-state p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .empty-state .hint {
      color: var(--text-tertiary);
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    /* --- FOOTER --- */
    footer {
      border-top: 1px solid var(--border);
      padding: 2rem 0 3rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    footer p {
      font-family: var(--mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      letter-spacing: 0.02em;
    }

    .footer-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--green);
      display: inline-block;
      margin-right: 0.35rem;
      animation: pulse 2s ease infinite;
    }

    /* --- ANIMATIONS --- */
    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes cardIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* --- RESPONSIVE --- */
    @media (max-width: 768px) {
      .hero { padding: 2.5rem 0 2rem; }
      .stats-bar { gap: 1.25rem; flex-wrap: wrap; }
      .stat-value { font-size: 1.1rem; }

      .command-bar-body {
        grid-template-columns: 1fr 1fr;
      }
      .command-bar-row2 {
        grid-template-columns: 1fr 1fr;
      }
      .filter-cell {
        border-bottom: 1px solid var(--border);
      }

      .h-card {
        grid-template-columns: 1fr;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
      }
      .h-card-right {
        flex-direction: row;
        align-items: center;
        gap: 1rem;
      }
    }

    @media (max-width: 480px) {
      .page { padding: 0 1rem; }
      .hero-title h1 { font-size: 2rem; }
      .command-bar-body { grid-template-columns: 1fr; }
      .command-bar-row2 { grid-template-columns: 1fr; }
      .stats-bar { gap: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="page">

    <header class="hero">
      <div class="hero-title">
        <span class="hero-label">// directory</span>
        <h1>AI Agent<br>Hackathons</h1>
      </div>
      <p class="hero-sub">
        Automatically updated directory of AI agent and agentic coding hackathons.
        Scraped every 6 hours. Filtered by deadline, prize pool, format, and chain.
      </p>
      <nav class="hero-nav">
        <a href="./feed.xml">rss feed</a>
        <a href="./hackathons.ics">ical calendar</a>
        <a href="https://github.com/basedmereum/awesome-ai-agent-hackathons">github</a>
        <a href="https://github.com/basedmereum/awesome-ai-agent-hackathons/issues/new?template=submit-hackathon.yml">submit hackathon</a>
      </nav>
    </header>

    <div class="stats-bar" id="stats"></div>

    <div class="command-bar">
      <div class="command-bar-header">
        <span class="command-bar-title">Filters</span>
        <button class="command-bar-reset" onclick="resetFilters()">clear all</button>
      </div>
      <div class="command-bar-body">
        <div class="filter-cell">
          <span class="filter-label">Search</span>
          <input type="text" id="filter-search" placeholder="hackathon name, organizer...">
        </div>
        <div class="filter-cell">
          <span class="filter-label">Format</span>
          <select id="filter-format">
            <option value="">All</option>
            ${formats.map((f) => `<option value="${f}">${f}</option>`).join("\n            ")}
          </select>
        </div>
        <div class="filter-cell">
          <span class="filter-label">Status</span>
          <select id="filter-status">
            <option value="">All</option>
            ${statuses.map((s) => `<option value="${s}">${s.replace(/_/g, " ")}</option>`).join("\n            ")}
          </select>
        </div>
        <div class="filter-cell">
          <span class="filter-label">Chain</span>
          <select id="filter-chain">
            <option value="">All</option>
            <option value="__any__">Any blockchain</option>
            ${chains.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n            ")}
          </select>
        </div>
      </div>
      <div class="command-bar-row2">
        <div class="filter-cell">
          <span class="filter-label">Min Prize</span>
          <input type="number" id="filter-prize-min" placeholder="$0" min="0" step="1000">
        </div>
        <div class="filter-cell">
          <span class="filter-label">Deadline Before</span>
          <input type="date" id="filter-deadline">
        </div>
        <div class="filter-cell">
          <span class="filter-label">Category</span>
          <select id="filter-category">
            <option value="">All</option>
            ${categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n            ")}
          </select>
        </div>
        <div class="filter-cell" style="justify-content: center; align-items: center;">
          <span class="filter-label" style="visibility:hidden;">.</span>
          <button class="command-bar-reset" onclick="resetFilters()" style="font-size:0.7rem; padding:0.3rem 0.75rem;">Reset All</button>
        </div>
      </div>
    </div>

    <div class="results-bar">
      <div class="results-count" id="results-count"></div>
      <select class="sort-select" id="sort-by">
        <option value="deadline">deadline (soonest)</option>
        <option value="prize-desc">prize (highest)</option>
        <option value="prize-asc">prize (lowest)</option>
        <option value="name">name (a-z)</option>
        <option value="updated">recently updated</option>
      </select>
    </div>

    <div id="hackathon-list"></div>

  </div>

  <div class="page">
    <footer>
      <p><span class="footer-dot"></span>Auto-updated every 6 hours via GitHub Actions</p>
      <p>Last build ${new Date().toISOString().split("T")[0]}</p>
    </footer>
  </div>

  <script>
    var hackathons = ${hackathonsJson};

    var statusOrder = {
      registration_open: 0,
      active: 1,
      upcoming: 2,
      judging: 3,
      completed: 4,
    };

    var statusLabels = {
      registration_open: "Open",
      active: "Active",
      upcoming: "Upcoming",
      judging: "Judging",
      completed: "Ended",
    };

    function fmt(amount, currency) {
      if (!amount) return null;
      var cur = (currency || "USD").toUpperCase();
      if (cur === "USD" || cur === "USDC") return "$" + amount.toLocaleString();
      return amount.toLocaleString() + " " + currency;
    }

    function daysUntil(dateStr) {
      if (!dateStr) return null;
      var diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
      return diff;
    }

    function fmtDeadline(dateStr) {
      if (!dateStr) return null;
      var d = daysUntil(dateStr);
      if (d === null) return dateStr;
      if (d < 0) return "ended";
      if (d === 0) return "today";
      if (d === 1) return "1 day left";
      if (d <= 7) return d + "d left";
      return dateStr;
    }

    function renderStats(filtered) {
      var active = filtered.filter(function(h) {
        return ["registration_open", "active", "upcoming"].includes(h.status);
      });
      var totalPrize = active.reduce(function(s, h) { return s + (h.prizePool ? h.prizePool.total : 0); }, 0);
      var chainCount = filtered.filter(function(h) { return h.blockchain; }).length;

      document.getElementById("stats").innerHTML =
        '<div class="stat-item"><span class="stat-value highlight">' + active.length + '</span><span class="stat-label">Active</span></div>' +
        '<div class="stat-item"><span class="stat-value">' + filtered.length + '</span><span class="stat-label">Tracked</span></div>' +
        '<div class="stat-item"><span class="stat-value highlight">' + (totalPrize ? fmt(totalPrize, "USD") : "$0") + '</span><span class="stat-label">In Prizes</span></div>' +
        '<div class="stat-item"><span class="stat-value">' + chainCount + '</span><span class="stat-label">On-chain</span></div>';
    }

    function renderCard(h, i) {
      var prize = h.prizePool ? fmt(h.prizePool.total, h.prizePool.currency) : null;
      var deadline = h.submissionDeadline || h.registrationDeadline;
      var deadlineFmt = fmtDeadline(deadline);
      var chain = h.blockchain ? h.blockchain.chain : null;
      var days = daysUntil(deadline);
      var isSoon = days !== null && days >= 0 && days <= 7;
      var delay = Math.min(i * 0.04, 0.6);

      var tags = "";
      var cats = h.categories.slice(0, 4);
      for (var c = 0; c < cats.length; c++) {
        tags += '<span class="h-tag">' + cats[c] + '</span>';
      }
      if (chain) {
        tags += '<span class="h-tag h-tag-chain">' + chain + '</span>';
      }

      var desc = h.description ? '<div class="h-desc">' + h.description.replace(/</g, "&lt;") + '</div>' : '';

      return '<a href="' + h.url + '" target="_blank" rel="noopener" class="h-card" style="animation-delay:' + delay + 's">' +
        '<div class="h-card-left">' +
          '<div class="h-card-top">' +
            '<span class="h-name">' + h.name.replace(/</g, "&lt;") + '</span>' +
            '<span class="h-status h-status-' + h.status + '">' + (statusLabels[h.status] || h.status) + '</span>' +
          '</div>' +
          '<div class="h-org">' + h.organizer.replace(/</g, "&lt;") + '</div>' +
          desc +
          '<div class="h-tags">' + tags + '</div>' +
        '</div>' +
        '<div class="h-card-right">' +
          '<span class="h-prize' + (prize ? '' : ' h-prize-tbd') + '">' + (prize || 'TBD') + '</span>' +
          (deadlineFmt ? '<span class="h-deadline' + (isSoon ? ' h-deadline-soon' : '') + '">' + deadlineFmt + '</span>' : '') +
          '<span class="h-format">' + h.format + '</span>' +
        '</div>' +
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
          var s = (h.name + " " + h.organizer + " " + h.categories.join(" ")).toLowerCase();
          if (s.indexOf(f.search) === -1) return false;
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
            return (b.prizePool ? b.prizePool.total : 0) - (a.prizePool ? a.prizePool.total : 0);
          case "prize-asc":
            return (a.prizePool ? a.prizePool.total : 0) - (b.prizePool ? b.prizePool.total : 0);
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
        filtered.length + " of " + hackathons.length + " hackathons";

      var container = document.getElementById("hackathon-list");
      if (filtered.length === 0) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-state-icon">:/</div>' +
            '<p>No hackathons match your filters</p>' +
            '<p class="hint">Try adjusting your search or clearing filters</p>' +
          '</div>';
      } else {
        container.innerHTML =
          '<div class="hackathon-list">' +
            filtered.map(function(h, i) { return renderCard(h, i); }).join("") +
          '</div>';
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

    ["filter-search","filter-format","filter-status","filter-chain",
     "filter-prize-min","filter-deadline","filter-category","sort-by"
    ].forEach(function(id) {
      var el = document.getElementById(id);
      el.addEventListener("input", applyFilters);
      el.addEventListener("change", applyFilters);
    });

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
