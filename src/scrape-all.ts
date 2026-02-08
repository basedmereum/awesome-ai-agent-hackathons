import { scrapeDevpost } from "./scrapers/devpost.js"
import { scrapeLablab } from "./scrapers/lablab.js"
import { scrapeBlockchain } from "./scrapers/blockchain.js"

async function main() {
  console.info("Starting full scrape cycle...")
  console.info("=".repeat(50))

  const scrapers = [
    { name: "Devpost", fn: scrapeDevpost },
    { name: "LabLab", fn: scrapeLablab },
    { name: "Blockchain", fn: scrapeBlockchain },
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
