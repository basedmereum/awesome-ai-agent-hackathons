import { generateReadme } from "./readme.js"
import { generateSite } from "./site.js"
import { generateRss, generateIcal } from "./rss.js"

async function main() {
  console.info("Generating all outputs...")

  await Promise.all([
    generateReadme(),
    generateSite(),
    generateRss(),
    generateIcal(),
  ])

  console.info("All outputs generated.")
}

main().catch((error) => {
  console.error("Generation failed:", error)
  process.exit(1)
})
