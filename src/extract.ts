import Anthropic from "@anthropic-ai/sdk"
import { ExtractionResultSchema, type ExtractionResult } from "./types.js"
import { today } from "./utils.js"

const client = new Anthropic()

const EXTRACTION_PROMPT = `You are a structured data extraction agent. Extract hackathon details from the provided web page content.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "name": "string - hackathon name",
  "organizer": "string - organizing company/group",
  "url": "string - main hackathon URL",
  "format": "virtual | in-person | hybrid",
  "description": "string - 1-2 sentence summary",
  "registrationOpen": "YYYY-MM-DD or null",
  "registrationDeadline": "YYYY-MM-DD or null",
  "submissionDeadline": "YYYY-MM-DD or null",
  "resultsDate": "YYYY-MM-DD or null",
  "prizePool": {
    "total": number,
    "currency": "USD | USDC | ETH | etc",
    "breakdown": { "1st": number, "2nd": number, ... }
  } or null,
  "categories": ["ai-agents", "blockchain", "solana", "mcp", "langchain", ...],
  "requirements": {
    "techStack": ["required framework or platform"],
    "teamSize": { "min": 1, "max": 5 } or null,
    "constraints": "string or null"
  },
  "blockchain": {
    "chain": "Solana | Ethereum | Sui | etc",
    "ecosystem": "DeFi | NFT | etc",
    "tokenPrize": true/false
  } or null,
  "location": "City, Country or null for virtual",
  "links": {
    "apply": "registration URL",
    "discord": "discord invite URL",
    "twitter": "twitter/X URL",
    "pastWinners": "URL to past winners"
  },
  "confidence": 0.0-1.0
}

Rules:
- Set confidence based on how complete and unambiguous the extracted data is
- Use ISO date format YYYY-MM-DD for all dates
- Categories should include relevant tags: ai-agents, autonomous-agents, blockchain, defi, mcp, langchain, crewai, autogen, etc.
- If the hackathon involves a blockchain, populate the blockchain field
- If information is genuinely unavailable, use null
- Today's date is ${today()}`

export async function extractFromContent(
  content: string,
  sourceUrl: string
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nSource URL: ${sourceUrl}\n\nPage content:\n${content.slice(0, 15000)}`,
      },
    ],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in extraction response")
  }

  const raw = JSON.parse(jsonMatch[0])
  return ExtractionResultSchema.parse(raw)
}

export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; HackathonTracker/1.0; +https://github.com/awesome-ai-agent-hackathons)",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  const html = await response.text()
  return extractFromContent(html, url)
}

// CLI entrypoint: tsx src/extract.ts <url>
const cliUrl = process.argv[2]
if (cliUrl) {
  try {
    const result = await extractFromUrl(cliUrl)
    console.info(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("Extraction failed:", error)
    process.exit(1)
  }
}
