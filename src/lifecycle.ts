import { type Hackathon, type HackathonStatus } from "./types.js"
import { loadAllHackathons, saveHackathon, today } from "./utils.js"

export function computeStatus(
  hackathon: Hackathon,
  currentDate: string
): HackathonStatus {
  const now = new Date(currentDate)

  const regOpen = hackathon.registrationOpen
    ? new Date(hackathon.registrationOpen)
    : null
  const regClose = hackathon.registrationDeadline
    ? new Date(hackathon.registrationDeadline)
    : null
  const submitClose = hackathon.submissionDeadline
    ? new Date(hackathon.submissionDeadline)
    : null
  const results = hackathon.resultsDate
    ? new Date(hackathon.resultsDate)
    : null

  // If we have a results date and it's past, it's completed
  if (results && now > results) {
    return "completed"
  }

  // If submission deadline has passed
  if (submitClose && now > submitClose) {
    // If we have a results date, we're judging
    if (results && now <= results) {
      return "judging"
    }
    // No results date: assume 14-day judging window
    const judgingEnd = new Date(submitClose)
    judgingEnd.setDate(judgingEnd.getDate() + 14)
    if (now <= judgingEnd) {
      return "judging"
    }
    return "completed"
  }

  // Registration deadline has passed but submission is still open
  if (regClose && now > regClose) {
    return "active"
  }

  // Registration is open
  if (regOpen && now >= regOpen) {
    return "registration_open"
  }

  // Registration hasn't opened yet
  if (regOpen && now < regOpen) {
    return "upcoming"
  }

  // No dates at all — if we have a registration deadline in the future, it's open
  if (regClose && now <= regClose) {
    return "registration_open"
  }

  // Fallback: if submission deadline exists and is in the future
  if (submitClose && now <= submitClose) {
    return "active"
  }

  // No dates available — preserve the existing status rather than
  // assuming completed. The scraper or human set the status for a reason.
  const hasAnyDate = regOpen || regClose || submitClose || results
  if (!hasAnyDate) {
    return hackathon.status
  }

  return "completed"
}

export function updateHackathonStatus(hackathon: Hackathon): Hackathon {
  const newStatus = computeStatus(hackathon, today())
  if (newStatus === hackathon.status) {
    return hackathon
  }
  return {
    ...hackathon,
    status: newStatus,
    lastUpdated: today(),
  }
}

// CLI entrypoint
async function main() {
  const hackathons = await loadAllHackathons()
  let updated = 0

  for (const hackathon of hackathons) {
    const newStatus = computeStatus(hackathon, today())
    if (newStatus !== hackathon.status) {
      const updatedHackathon = {
        ...hackathon,
        status: newStatus,
        lastUpdated: today(),
      }
      await saveHackathon(updatedHackathon)
      updated++
      console.info(
        `${hackathon.name}: ${hackathon.status} -> ${newStatus}`
      )
    }
  }

  console.info(
    `Lifecycle update complete. ${updated}/${hackathons.length} hackathons updated.`
  )
}

const isDirectRun = process.argv[1]?.includes("lifecycle")
if (isDirectRun) {
  main().catch((error) => {
    console.error("Lifecycle update failed:", error)
    process.exit(1)
  })
}
