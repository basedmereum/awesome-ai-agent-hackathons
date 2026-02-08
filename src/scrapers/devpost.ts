import * as cheerio from "cheerio"
import { extractFromContent } from "../extract.js"
import { processExtraction } from "../dedup.js"
import { saveHackathon } from "../utils.js"
import { updateHackathonStatus } from "../lifecycle.js"

const DEVPOST_SEARCH_URLS = [
  "https://devpost.com/hackathons?search=ai+agent&status[]=open",
  "https://devpost.com/hackathons?search=agentic+ai&status[]=open",
  "https://devpost.com/hackathons?search=autonomous+agent&status[]=open",
  "https://devpost.com/hackathons?search=ai+agent&status[]=upcoming",
  "https://devpost.com/hackathons?search=mcp+agent&status[]=open",
]

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
  Accept: "application/json, text/html",
}

interface DevpostHackathon {
  url: string
  title: string
}

async function fetchDevpostListings(
  searchUrl: string
): Promise<DevpostHackathon[]> {
  const results: DevpostHackathon[] = []

  try {
    const response = await fetch(searchUrl, { headers: HEADERS })
    const html = await response.text()
    const $ = cheerio.load(html)

    $(".hackathon-tile a.tile-link, a.link-to-hackathon").each((_, el) => {
      const href = $(el).attr("href")
      const title =
        $(el).find("h3, .hackathon-title, h2").first().text().trim() ||
        $(el).text().trim()

      if (href && title) {
        const url = href.startsWith("http")
          ? href
          : `https://devpost.com${href}`
        results.push({ url, title })
      }
    })

    // Devpost also exposes JSON for some endpoints
    try {
      const jsonData = JSON.parse(html)
      if (jsonData?.hackathons) {
        for (const h of jsonData.hackathons) {
          results.push({
            url: h.url || `https://${h.subdomain}.devpost.com`,
            title: h.title,
          })
        }
      }
    } catch {
      // HTML response, already parsed above
    }
  } catch (error) {
    console.error(`Failed to fetch ${searchUrl}:`, error)
  }

  return results
}

async function scrapeDevpostHackathon(url: string): Promise<void> {
  try {
    const response = await fetch(url, { headers: HEADERS })
    const html = await response.text()

    const extracted = await extractFromContent(html, url)
    const { action, hackathon } = await processExtraction(extracted, "devpost")

    if (action === "skipped") {
      console.info(`  Skipped (duplicate): ${extracted.name}`)
      return
    }

    const withStatus = updateHackathonStatus(hackathon)
    await saveHackathon(withStatus)
    console.info(`  ${action}: ${withStatus.name} [${withStatus.status}]`)
  } catch (error) {
    console.error(`  Failed to scrape ${url}:`, error)
  }
}

export async function scrapeDevpost(): Promise<void> {
  console.info("Scraping Devpost...")

  const allListings: DevpostHackathon[] = []
  const seen = new Set<string>()

  for (const searchUrl of DEVPOST_SEARCH_URLS) {
    const listings = await fetchDevpostListings(searchUrl)
    for (const listing of listings) {
      if (!seen.has(listing.url)) {
        seen.add(listing.url)
        allListings.push(listing)
      }
    }
  }

  console.info(`Found ${allListings.length} unique hackathons on Devpost`)

  for (const listing of allListings) {
    await scrapeDevpostHackathon(listing.url)
    // Rate limit
    await new Promise((r) => setTimeout(r, 2000))
  }
}

const isDirectRun = process.argv[1]?.includes("devpost")
if (isDirectRun) {
  scrapeDevpost().catch((error) => {
    console.error("Devpost scraper failed:", error)
    process.exit(1)
  })
}
