import { extractFromUrl } from "./extract.js"
import { processExtraction } from "./dedup.js"
import { saveHackathon } from "./utils.js"
import { updateHackathonStatus } from "./lifecycle.js"

/**
 * CLI tool for submitting a single hackathon URL.
 * Usage: tsx src/submit-url.ts <url>
 *
 * Also used by the GitHub Actions issue-based submission workflow.
 */
async function main() {
  const url = process.argv[2]

  if (!url) {
    console.error("Usage: tsx src/submit-url.ts <url>")
    process.exit(1)
  }

  console.info(`Extracting hackathon data from: ${url}`)

  try {
    const extracted = await extractFromUrl(url)
    console.info(`Extracted: ${extracted.name} (confidence: ${extracted.confidence})`)

    const { action, hackathon } = await processExtraction(extracted, "manual-submission")

    if (action === "skipped") {
      console.info("This hackathon already exists in the database.")
      return
    }

    const withStatus = updateHackathonStatus(hackathon)
    const filepath = await saveHackathon(withStatus)

    console.info(`\n${action === "created" ? "Created" : "Merged"}: ${filepath}`)
    console.info(JSON.stringify(withStatus, null, 2))
  } catch (error) {
    console.error("Submission failed:", error)
    process.exit(1)
  }
}

main()
