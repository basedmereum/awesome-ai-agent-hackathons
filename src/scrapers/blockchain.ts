import { extractFromContent } from "../extract.js"
import { processExtraction } from "../dedup.js"
import { saveHackathon } from "../utils.js"
import { updateHackathonStatus } from "../lifecycle.js"

/**
 * Known blockchain ecosystem hackathon sources.
 * Each entry is a page that lists or describes AI agent hackathons.
 */
const BLOCKCHAIN_SOURCES = [
  // Solana
  {
    url: "https://colosseum.com/agent-hackathon/",
    chain: "Solana",
    name: "Colosseum Agent Hackathon",
  },
  {
    url: "https://hackathon.sendai.fun/",
    chain: "Solana",
    name: "Solana AI Hackathon (SendAI)",
  },
  // Sui
  {
    url: "https://sui.io/sui-agent-typhoon",
    chain: "Sui",
    name: "Sui Agent Typhoon",
  },
  {
    url: "https://sui.io/hackathon",
    chain: "Sui",
    name: "Sui Hackathons",
  },
  // Aptos
  {
    url: "https://thunderdome.hackerearth.com/",
    chain: "Aptos",
    name: "Aptos AI Agent Takeover",
  },
  // Fetch.ai
  {
    url: "https://innovationlab.fetch.ai/events",
    chain: "Fetch.ai",
    name: "Fetch.ai Innovation Lab",
  },
  // NEAR
  {
    url: "https://near.org/ecosystem/hackathons",
    chain: "NEAR",
    name: "NEAR Hackathons",
  },
  // Avalanche
  {
    url: "https://build.avax.network/build-games",
    chain: "Avalanche",
    name: "Avalanche Build Games",
  },
  {
    url: "https://build.avax.network/hackathons",
    chain: "Avalanche",
    name: "Avalanche Hackathons",
  },
  // Circle / Base
  {
    url: "https://www.circle.com/blog",
    chain: "Base",
    name: "Circle Hackathons",
  },
  {
    url: "https://www.moltbook.com/m/usdc",
    chain: "Base",
    name: "Moltbook USDC Hackathons",
  },
  // Arbitrum
  {
    url: "https://arbitrum.io/ecosystem",
    chain: "Arbitrum",
    name: "Arbitrum Ecosystem",
  },
]

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
}

async function scrapeSource(source: {
  url: string
  chain: string
  name: string
}): Promise<void> {
  try {
    const response = await fetch(source.url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error(
        `  Failed to fetch ${source.name}: HTTP ${response.status}`
      )
      return
    }

    const html = await response.text()

    // Check for AI agent relevance
    const lower = html.toLowerCase()
    const hasAgent = ["agent", "agentic", "autonomous", "ai"].some((kw) =>
      lower.includes(kw)
    )

    if (!hasAgent) {
      console.info(`  ${source.name}: No agent-related content found`)
      return
    }

    const extracted = await extractFromContent(html, source.url)

    // Ensure blockchain metadata is set
    const withChain = {
      ...extracted,
      blockchain: extracted.blockchain ?? {
        chain: source.chain,
        ecosystem: undefined,
        tokenPrize: undefined,
      },
      categories: [
        ...new Set([
          ...extracted.categories,
          "blockchain",
          source.chain.toLowerCase(),
        ]),
      ],
    }

    const { action, hackathon } = await processExtraction(
      withChain,
      `blockchain-${source.chain.toLowerCase()}`
    )

    if (action === "skipped") {
      return
    }

    const withStatus = updateHackathonStatus(hackathon)
    await saveHackathon(withStatus)
    console.info(`  ${action}: ${withStatus.name} [${withStatus.status}]`)
  } catch (error) {
    console.error(`  Failed to scrape ${source.name}:`, error)
  }
}

export async function scrapeBlockchain(): Promise<void> {
  console.info("Scraping blockchain sources...")

  for (const source of BLOCKCHAIN_SOURCES) {
    console.info(`  Checking ${source.name} (${source.chain})...`)
    await scrapeSource(source)
    await new Promise((r) => setTimeout(r, 2000))
  }
}

const isDirectRun = process.argv[1]?.includes("blockchain")
if (isDirectRun) {
  scrapeBlockchain().catch((error) => {
    console.error("Blockchain scraper failed:", error)
    process.exit(1)
  })
}
