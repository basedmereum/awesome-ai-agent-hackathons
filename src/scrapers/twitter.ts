import Anthropic from "@anthropic-ai/sdk"
import { extractFromContent } from "../extract.js"
import { processExtraction } from "../dedup.js"
import { saveHackathon, loadAllHackathons } from "../utils.js"
import { updateHackathonStatus } from "../lifecycle.js"

const anthropic = new Anthropic()

const X_API_BASE = "https://api.x.com/2"

/**
 * Accounts that frequently announce AI agent hackathons.
 * Monitored for new tweets containing hackathon keywords.
 */
const WATCHED_ACCOUNTS = [
  // Blockchain ecosystems
  "SolanaConf", "SuiNetwork", "AptosLabs", "avaborquest",
  "circle", "NEARProtocol", "arbitrum",
  // AI/ML platforms
  "AnthropicAI", "OpenAI", "nvidia", "GoogleDeepMind",
  "LangChainAI", "craborquestAI", "fetchaborquest",
  // Hackathon platforms
  "devaborquest", "lablabai", "hacaborquestearth", "colaborquestosseum_org",
  // Agent frameworks
  "maborquest_autogen", "crew_ai",
]

/**
 * Search queries for discovering new hackathons on X.
 * Run periodically to catch announcements from unknown accounts.
 */
const SEARCH_QUERIES = [
  '("AI agent" OR "agentic AI") (hackathon OR "prize pool") -is:retweet',
  '("autonomous agent") (hackathon OR competition OR bounty) -is:retweet',
  '(MCP OR LangChain OR CrewAI) hackathon (prize OR "$") -is:retweet',
  '(Solana OR Ethereum OR Sui OR Aptos OR Avalanche) "AI agent" hackathon -is:retweet',
  '"submissions open" agent (hackathon OR competition) -is:retweet',
]

interface XApiHeaders {
  Authorization: string
  "Content-Type": string
}

function getHeaders(): XApiHeaders {
  const token = process.env.X_BEARER_TOKEN
  if (!token) {
    throw new Error("X_BEARER_TOKEN environment variable is required")
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

interface Tweet {
  id: string
  text: string
  author_id: string
  created_at: string
  entities?: {
    urls?: Array<{ expanded_url: string; display_url: string }>
  }
}

interface SearchResponse {
  data?: Tweet[]
  meta?: { next_token?: string; result_count: number }
}

/**
 * Search X for recent tweets matching a query.
 * Uses the v2 search/recent endpoint (7-day window).
 */
async function searchTweets(query: string, maxResults = 25): Promise<Tweet[]> {
  const params = new URLSearchParams({
    query,
    max_results: String(maxResults),
    "tweet.fields": "created_at,entities,author_id",
    expansions: "author_id",
  })

  const response = await fetch(
    `${X_API_BASE}/tweets/search/recent?${params}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error(`X API error (${response.status}): ${error}`)
    return []
  }

  const data = (await response.json()) as SearchResponse
  return data.data ?? []
}

/**
 * Get recent tweets from a specific user.
 */
async function getUserTweets(
  userId: string,
  maxResults = 10
): Promise<Tweet[]> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "created_at,entities,author_id",
    exclude: "retweets,replies",
  })

  const response = await fetch(
    `${X_API_BASE}/users/${userId}/tweets?${params}`,
    { headers: getHeaders() }
  )

  if (!response.ok) return []

  const data = (await response.json()) as SearchResponse
  return data.data ?? []
}

/**
 * Look up a user ID by username.
 */
async function getUserId(username: string): Promise<string | null> {
  const response = await fetch(
    `${X_API_BASE}/users/by/username/${username}`,
    { headers: getHeaders() }
  )

  if (!response.ok) return null

  const data = (await response.json()) as { data?: { id: string } }
  return data.data?.id ?? null
}

/**
 * Use Claude to determine if a tweet is announcing a hackathon
 * and extract any relevant URLs.
 */
async function analyzeTweet(
  tweet: Tweet
): Promise<{ isHackathon: boolean; urls: string[]; updates: string | null }> {
  const urls =
    tweet.entities?.urls?.map((u) => u.expanded_url).filter(Boolean) ?? []

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyze this tweet. Is it announcing, promoting, or updating an AI agent hackathon?

Tweet: "${tweet.text}"
URLs in tweet: ${urls.join(", ") || "none"}

Return JSON only:
{
  "isHackathon": true/false,
  "confidence": 0.0-1.0,
  "type": "announcement" | "update" | "reminder" | "results" | "not_hackathon",
  "hackathonUrls": ["urls that link to hackathon pages"],
  "updateInfo": "if type=update, what changed (deadline extension, prize increase, etc)" or null
}`,
      },
    ],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}"
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { isHackathon: false, urls: [], updates: null }

    const parsed = JSON.parse(match[0])
    return {
      isHackathon: parsed.isHackathon && parsed.confidence > 0.6,
      urls: parsed.hackathonUrls ?? [],
      updates: parsed.updateInfo ?? null,
    }
  } catch {
    return { isHackathon: false, urls: [], updates: null }
  }
}

/**
 * Process a discovered hackathon URL from a tweet.
 */
async function processDiscoveredUrl(url: string): Promise<void> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) return

    const html = await response.text()
    const extracted = await extractFromContent(html, url)

    if (extracted.confidence < 0.5) return

    const { action, hackathon } = await processExtraction(extracted, "twitter")

    if (action === "skipped") return

    const withStatus = updateHackathonStatus(hackathon)
    await saveHackathon(withStatus)
    console.info(
      `  ${action}: ${withStatus.name} [confidence: ${withStatus.confidence}]`
    )
  } catch (error) {
    console.error(`  Failed to process ${url}:`, error)
  }
}

/**
 * Main scraper: search X for hackathon announcements and updates.
 */
export async function scrapeTwitter(): Promise<void> {
  console.info("Scraping X/Twitter for hackathon announcements...")

  const discoveredUrls = new Set<string>()
  const existingHackathons = await loadAllHackathons()

  // Phase 1: Search queries for new hackathons
  console.info("  Phase 1: Search queries...")
  for (const query of SEARCH_QUERIES) {
    try {
      const tweets = await searchTweets(query)
      console.info(`  "${query.slice(0, 50)}..." -> ${tweets.length} tweets`)

      for (const tweet of tweets) {
        const analysis = await analyzeTweet(tweet)

        if (analysis.isHackathon) {
          for (const url of analysis.urls) {
            discoveredUrls.add(url)
          }

          if (analysis.updates) {
            console.info(`  Update detected: ${analysis.updates}`)
          }
        }

        // Rate limit API calls
        await new Promise((r) => setTimeout(r, 500))
      }
    } catch (error) {
      console.error(`  Search failed: ${error}`)
    }

    await new Promise((r) => setTimeout(r, 1000))
  }

  // Phase 2: Check watched accounts for announcements
  console.info("  Phase 2: Watched accounts...")
  for (const username of WATCHED_ACCOUNTS.slice(0, 15)) {
    try {
      const userId = await getUserId(username)
      if (!userId) continue

      const tweets = await getUserTweets(userId, 5)
      for (const tweet of tweets) {
        const lower = tweet.text.toLowerCase()
        const hasKeyword = ["hackathon", "prize", "bounty", "competition"].some(
          (kw) => lower.includes(kw)
        )

        if (!hasKeyword) continue

        const analysis = await analyzeTweet(tweet)
        if (analysis.isHackathon) {
          for (const url of analysis.urls) {
            discoveredUrls.add(url)
          }
        }
      }

      await new Promise((r) => setTimeout(r, 1000))
    } catch (error) {
      console.error(`  @${username} failed: ${error}`)
    }
  }

  // Phase 3: Process discovered URLs
  console.info(`  Phase 3: Processing ${discoveredUrls.size} discovered URLs...`)
  for (const url of discoveredUrls) {
    await processDiscoveredUrl(url)
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.info("X/Twitter scrape complete.")
}

const isDirectRun = process.argv[1]?.includes("twitter")
if (isDirectRun) {
  scrapeTwitter().catch((error) => {
    console.error("Twitter scraper failed:", error)
    process.exit(1)
  })
}
