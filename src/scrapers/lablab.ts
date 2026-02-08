import * as cheerio from "cheerio"
import { extractFromContent } from "../extract.js"
import { processExtraction } from "../dedup.js"
import { saveHackathon } from "../utils.js"
import { updateHackathonStatus } from "../lifecycle.js"

const LABLAB_URLS = [
  "https://lablab.ai/ai-hackathons",
  "https://lablab.ai/event",
]

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
}

interface LablabEvent {
  url: string
  title: string
}

async function fetchLablabListings(): Promise<LablabEvent[]> {
  const results: LablabEvent[] = []
  const seen = new Set<string>()

  for (const baseUrl of LABLAB_URLS) {
    try {
      const response = await fetch(baseUrl, { headers: HEADERS })
      const html = await response.text()
      const $ = cheerio.load(html)

      // LabLab uses card-style event listings
      $("a[href*='/event/'], a[href*='/ai-hackathons/']").each((_, el) => {
        const href = $(el).attr("href")
        if (!href) return

        const title = $(el).find("h2, h3, .title").first().text().trim() ||
          $(el).text().trim().slice(0, 100)

        const url = href.startsWith("http")
          ? href
          : `https://lablab.ai${href}`

        // Filter to actual event pages, not the index
        if (
          url.includes("/event/") ||
          (url.includes("/ai-hackathons/") && url !== baseUrl)
        ) {
          if (!seen.has(url)) {
            seen.add(url)
            results.push({ url, title })
          }
        }
      })
    } catch (error) {
      console.error(`Failed to fetch ${baseUrl}:`, error)
    }
  }

  return results
}

async function scrapeLablabEvent(event: LablabEvent): Promise<void> {
  try {
    const response = await fetch(event.url, { headers: HEADERS })
    const html = await response.text()

    // Check if page content is related to AI agents
    const lowerHtml = html.toLowerCase()
    const agentKeywords = [
      "agent",
      "agentic",
      "autonomous",
      "mcp",
      "langchain",
      "crewai",
      "autogen",
      "multi-agent",
    ]
    const isAgentRelated = agentKeywords.some((kw) => lowerHtml.includes(kw))

    if (!isAgentRelated) {
      return
    }

    const extracted = await extractFromContent(html, event.url)
    const { action, hackathon } = await processExtraction(extracted, "lablab")

    if (action === "skipped") {
      return
    }

    const withStatus = updateHackathonStatus(hackathon)
    await saveHackathon(withStatus)
    console.info(`  ${action}: ${withStatus.name} [${withStatus.status}]`)
  } catch (error) {
    console.error(`  Failed to scrape ${event.url}:`, error)
  }
}

export async function scrapeLablab(): Promise<void> {
  console.info("Scraping LabLab.ai...")

  const events = await fetchLablabListings()
  console.info(`Found ${events.length} events on LabLab`)

  for (const event of events) {
    await scrapeLablabEvent(event)
    await new Promise((r) => setTimeout(r, 2000))
  }
}

const isDirectRun = process.argv[1]?.includes("lablab")
if (isDirectRun) {
  scrapeLablab().catch((error) => {
    console.error("LabLab scraper failed:", error)
    process.exit(1)
  })
}
