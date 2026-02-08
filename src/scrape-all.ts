import "dotenv/config"
import { scrapeDevpost } from "./scrapers/devpost.js"
import { scrapeLablab } from "./scrapers/lablab.js"
import { scrapeBlockchain } from "./scrapers/blockchain.js"
import { scrapeTwitter } from "./scrapers/twitter.js"

async function main() {
  console.info("Starting full scrape cycle...")
  console.info("=".repeat(50))

  const hasTwitter = Boolean(process.env.X_BEARER_TOKEN)

  const scrapers = [
    { name: "Devpost", fn: scrapeDevpost },
    { name: "LabLab", fn: scrapeLablab },
    { name: "Blockchain", fn: scrapeBlockchain },
    ...(hasTwitter ? [{ name: "X/Twitter", fn: scrapeTwitter }] : []),
  ]

  for (const scraper of scrapers) {
    try {
      console.info(`\n--- ${scraper.name} ---`)
      await scraper.fn()
    } catch (error) {
      console.error(`${scraper.name} scraper failed:`, error)
    }
  }

  console.info("\n" + "=".repeat(50))
  console.info("Scrape cycle complete.")
}

main().catch((error) => {
  console.error("Scrape-all failed:", error)
  process.exit(1)
})
