import Anthropic from "@anthropic-ai/sdk"
import { extractFromContent } from "../extract.js"
import { processExtraction } from "../dedup.js"
import { saveHackathon } from "../utils.js"
import { updateHackathonStatus } from "../lifecycle.js"

const client = new Anthropic()

const SEARCH_QUERIES = [
  "AI agent hackathon 2026 open registration",
  "agentic AI hackathon prize pool 2026",
  "autonomous agent coding competition 2026",
  "MCP hackathon AI agents",
  "blockchain AI agent hackathon crypto",
  "Solana Ethereum Sui AI agent hackathon",
  "LangChain CrewAI hackathon 2026",
  "multi-agent system hackathon",
]

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
}

/**
 * Use Claude to extract hackathon URLs from search results.
 * This approach uses the LLM to identify which search results
 * are actual hackathon pages vs blog posts, news articles, etc.
 */
async function findHackathonUrls(query: string): Promise<string[]> {
  // Use SerpAPI or similar if SERP_API_KEY is set
  const serpApiKey = process.env.SERP_API_KEY
  if (!serpApiKey) {
    console.info(
      `  Skipping web search (no SERP_API_KEY): "${query}"`
    )
    return []
  }

  try {
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=10`
    const response = await fetch(searchUrl)
    const data = (await response.json()) as {
      organic_results?: Array<{ link: string; title: string; snippet: string }>
    }

    if (!data.organic_results) return []

    // Ask Claude to filter for actual hackathon pages
    const resultsText = data.organic_results
      .map(
        (r: { link: string; title: string; snippet: string }) =>
          `URL: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`
      )
      .join("\n\n")

    const filterResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `From these search results, identify URLs that are ACTUAL hackathon registration/info pages (not blog posts, news articles, or general listings).

Return ONLY a JSON array of URLs, e.g.: ["https://...", "https://..."]
If none are hackathon pages, return [].

Results:
${resultsText}`,
        },
      ],
    })

    const text =
      filterResponse.content[0].type === "text"
        ? filterResponse.content[0].text
        : "[]"

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []

    return JSON.parse(match[0]) as string[]
  } catch (error) {
    console.error(`  Search failed for "${query}":`, error)
    return []
  }
}

export async function discoverHackathons(): Promise<void> {
  console.info("Running web search discovery...")

  const allUrls = new Set<string>()

  for (const query of SEARCH_QUERIES) {
    console.info(`  Searching: "${query}"`)
    const urls = await findHackathonUrls(query)
    for (const url of urls) {
      allUrls.add(url)
    }
    // Rate limit search API calls
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.info(`Found ${allUrls.size} unique URLs from web search`)

  for (const url of allUrls) {
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) continue

      const html = await response.text()
      const extracted = await extractFromContent(html, url)

      // Only process if confidence is reasonable
      if (extracted.confidence < 0.5) {
        console.info(`  Low confidence (${extracted.confidence}), skipping: ${url}`)
        continue
      }

      const { action, hackathon } = await processExtraction(
        extracted,
        "web-search"
      )

      if (action === "skipped") continue

      const withStatus = updateHackathonStatus(hackathon)
      await saveHackathon(withStatus)
      console.info(
        `  ${action}: ${withStatus.name} [confidence: ${withStatus.confidence}]`
      )
    } catch (error) {
      console.error(`  Failed to process ${url}:`, error)
    }

    await new Promise((r) => setTimeout(r, 2000))
  }
}

const isDirectRun = process.argv[1]?.includes("web-search")
if (isDirectRun) {
  discoverHackathons().catch((error) => {
    console.error("Web search discovery failed:", error)
    process.exit(1)
  })
}
