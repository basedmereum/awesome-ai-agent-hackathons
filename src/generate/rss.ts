import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { loadAllHackathons, formatCurrency } from "../utils.js"
import type { Hackathon } from "../types.js"

const SITE_DIR = join(import.meta.dirname, "..", "..", "site")

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function hackathonToRssItem(h: Hackathon): string {
  const prize = h.prizePool
    ? formatCurrency(h.prizePool.total, h.prizePool.currency)
    : "TBD"
  const chain = h.blockchain ? ` | ${h.blockchain.chain}` : ""
  const deadline = h.submissionDeadline ?? h.registrationDeadline ?? "TBD"

  return `    <item>
      <title>${escapeXml(h.name)}</title>
      <link>${escapeXml(h.url)}</link>
      <guid isPermaLink="true">${escapeXml(h.url)}</guid>
      <description>${escapeXml(`${h.format} hackathon by ${h.organizer}. Prize: ${prize}${chain}. Deadline: ${deadline}`)}</description>
      <pubDate>${new Date(h.lastUpdated).toUTCString()}</pubDate>
      <category>${escapeXml(h.format)}</category>
${h.categories.map((c) => `      <category>${escapeXml(c)}</category>`).join("\n")}
    </item>`
}

export async function generateRss(): Promise<void> {
  await mkdir(SITE_DIR, { recursive: true })

  const hackathons = await loadAllHackathons()
  const active = hackathons
    .filter((h) => h.status !== "completed")
    .sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Agent Hackathons</title>
    <link>https://github.com/your-username/awesome-ai-agent-hackathons</link>
    <description>Automatically updated directory of AI agent and agentic coding hackathons</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://your-username.github.io/awesome-ai-agent-hackathons/feed.xml" rel="self" type="application/rss+xml"/>
${active.map(hackathonToRssItem).join("\n")}
  </channel>
</rss>
`

  await writeFile(join(SITE_DIR, "feed.xml"), rss, "utf-8")
  console.info(`RSS feed generated with ${active.length} entries`)
}

export async function generateIcal(): Promise<void> {
  await mkdir(SITE_DIR, { recursive: true })

  const hackathons = await loadAllHackathons()
  const withDates = hackathons.filter(
    (h) => h.submissionDeadline ?? h.registrationDeadline
  )

  const formatIcalDate = (dateStr: string): string =>
    dateStr.replace(/-/g, "")

  const events = withDates
    .map((h) => {
      const deadline = h.submissionDeadline ?? h.registrationDeadline
      if (!deadline) return ""

      const prize = h.prizePool
        ? formatCurrency(h.prizePool.total, h.prizePool.currency)
        : "TBD"

      return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${formatIcalDate(deadline)}
DTEND;VALUE=DATE:${formatIcalDate(deadline)}
SUMMARY:${h.name} - Deadline
DESCRIPTION:${h.format} hackathon by ${h.organizer}. Prize: ${prize}. ${h.url}
URL:${h.url}
UID:${h.id}@hackathon-tracker
END:VEVENT`
    })
    .filter(Boolean)

  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hackathon Tracker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:AI Agent Hackathons
${events.join("\n")}
END:VCALENDAR
`

  await writeFile(join(SITE_DIR, "hackathons.ics"), ical, "utf-8")
  console.info(`iCal feed generated with ${events.length} events`)
}

const isDirectRun = process.argv[1]?.includes("rss")
if (isDirectRun) {
  Promise.all([generateRss(), generateIcal()]).catch((error) => {
    console.error("Feed generation failed:", error)
    process.exit(1)
  })
}
