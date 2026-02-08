import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { loadAllHackathons, formatCurrency } from "../utils.js"
import type { Hackathon, HackathonStatus } from "../types.js"

const ROOT = join(import.meta.dirname, "..", "..")

function statusEmoji(status: HackathonStatus): string {
  const map: Record<HackathonStatus, string> = {
    upcoming: "📅",
    registration_open: "✅",
    active: "🔨",
    judging: "⏳",
    completed: "🏁",
  }
  return map[status] ?? ""
}

function statusLabel(status: HackathonStatus): string {
  const map: Record<HackathonStatus, string> = {
    upcoming: "Upcoming",
    registration_open: "Registration Open",
    active: "Active (Building)",
    judging: "Judging",
    completed: "Completed",
  }
  return map[status] ?? status
}

function formatPrize(h: Hackathon): string {
  if (!h.prizePool) return "TBD"
  return formatCurrency(h.prizePool.total, h.prizePool.currency)
}

function formatDeadline(h: Hackathon): string {
  return h.submissionDeadline ?? h.registrationDeadline ?? "TBD"
}

function hackathonRow(h: Hackathon): string {
  const chain = h.blockchain ? ` (${h.blockchain.chain})` : ""
  return `| [${h.name}](${h.url}) | ${h.organizer}${chain} | ${formatPrize(h)} | ${h.format} | ${formatDeadline(h)} | ${statusEmoji(h.status)} ${statusLabel(h.status)} |`
}

export async function generateReadme(): Promise<void> {
  const hackathons = await loadAllHackathons()

  const active = hackathons.filter(
    (h) =>
      h.status === "registration_open" ||
      h.status === "active" ||
      h.status === "upcoming"
  )
  const judging = hackathons.filter((h) => h.status === "judging")
  const completed = hackathons.filter((h) => h.status === "completed")

  const sortByDeadline = (a: Hackathon, b: Hackathon) => {
    const dateA = a.submissionDeadline ?? a.registrationDeadline ?? "9999"
    const dateB = b.submissionDeadline ?? b.registrationDeadline ?? "9999"
    return dateA.localeCompare(dateB)
  }

  active.sort(sortByDeadline)
  judging.sort(sortByDeadline)
  completed.sort(sortByDeadline)

  const totalPrize = hackathons
    .filter((h) => h.prizePool && h.status !== "completed")
    .reduce((sum, h) => sum + (h.prizePool?.total ?? 0), 0)

  const readme = `# Awesome AI Agent Hackathons

> An automatically updated, community-maintained directory of hackathons for AI agents and agentic coding.

**${active.length} active** | **${hackathons.length} total tracked** | **${formatCurrency(totalPrize, "USD")}+ in active prizes**

[Browse with filters](https://basedmereum.github.io/awesome-ai-agent-hackathons/) | [RSS Feed](./site/feed.xml) | [Submit a hackathon](https://github.com/basedmereum/awesome-ai-agent-hackathons/issues/new?template=submit-hackathon.yml)

---

## Active & Upcoming Hackathons

| Hackathon | Organizer | Prize Pool | Format | Deadline | Status |
|-----------|-----------|------------|--------|----------|--------|
${active.map(hackathonRow).join("\n")}

${
  judging.length > 0
    ? `## Currently Judging

| Hackathon | Organizer | Prize Pool | Format | Deadline | Status |
|-----------|-----------|------------|--------|----------|--------|
${judging.map(hackathonRow).join("\n")}
`
    : ""
}
## Blockchain / Web3 AI Agent Hackathons

| Hackathon | Chain | Prize Pool | Format | Deadline | Status |
|-----------|-------|------------|--------|----------|--------|
${hackathons
  .filter((h) => h.blockchain && h.status !== "completed")
  .sort(sortByDeadline)
  .map((h) => {
    const chain = h.blockchain?.chain ?? "Unknown"
    return `| [${h.name}](${h.url}) | ${chain} | ${formatPrize(h)} | ${h.format} | ${formatDeadline(h)} | ${statusEmoji(h.status)} ${statusLabel(h.status)} |`
  })
  .join("\n")}

## Categories

${Array.from(new Set(hackathons.flatMap((h) => h.categories)))
  .sort()
  .map((cat) => {
    const count = hackathons.filter((h) => h.categories.includes(cat)).length
    return "- **" + cat + "** (" + count + ")"
  })
  .join("\n")}

${
  completed.length > 0
    ? `## Past Hackathons

<details>
<summary>Show ${completed.length} completed hackathons</summary>

| Hackathon | Organizer | Prize Pool | Format | Ended |
|-----------|-----------|------------|--------|-------|
${completed.map((h) => `| [${h.name}](${h.url}) | ${h.organizer} | ${formatPrize(h)} | ${h.format} | ${formatDeadline(h)} |`).join("\n")}

</details>
`
    : ""
}
---

## How It Works

This directory is **automatically updated** every 6 hours by scraping:
- [Devpost](https://devpost.com) - General hackathon platform
- [LabLab.ai](https://lablab.ai) - AI-focused hackathons
- Blockchain ecosystems (Solana, Sui, Aptos, Fetch.ai, NEAR)
- Web search discovery for standalone hackathon sites

New hackathons are extracted using LLM-powered parsing, deduplicated, and status is updated based on dates.

### Submit a Hackathon

Found one we're missing? [Open an issue](https://github.com/basedmereum/awesome-ai-agent-hackathons/issues/new?template=submit-hackathon.yml) with the URL — our bot will extract the details automatically.

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on adding sources, improving scrapers, or contributing directly.

---

*Last updated: ${new Date().toISOString().split("T")[0]} | Data auto-refreshes every 6 hours via GitHub Actions*
`

  await writeFile(join(ROOT, "README.md"), readme, "utf-8")
  console.info(`README.md generated with ${hackathons.length} hackathons`)
}

const isDirectRun = process.argv[1]?.includes("readme")
if (isDirectRun) {
  generateReadme().catch((error) => {
    console.error("README generation failed:", error)
    process.exit(1)
  })
}
