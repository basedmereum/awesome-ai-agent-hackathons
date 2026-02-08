import { type Hackathon, type ExtractionResult } from "./types.js"
import { normalizeUrl, slugify, today, loadAllHackathons } from "./utils.js"

/**
 * Jaro-Winkler similarity between two strings (0-1).
 * Used for fuzzy name matching during deduplication.
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1

  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 || len2 === 0) return 0

  const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0)
  const s1Matches = new Array<boolean>(len1).fill(false)
  const s2Matches = new Array<boolean>(len2).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, len2)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

  // Winkler modification: boost for common prefix
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

export interface DedupResult {
  isDuplicate: boolean
  matchId: string | null
  similarity: number
}

export function checkDuplicate(
  candidate: ExtractionResult,
  existing: Hackathon[]
): DedupResult {
  for (const entry of existing) {
    // Exact URL match
    if (normalizeUrl(candidate.url) === normalizeUrl(entry.url)) {
      return { isDuplicate: true, matchId: entry.id, similarity: 1.0 }
    }

    // Fuzzy name + organizer + date overlap
    const nameSimilarity = jaroWinkler(
      candidate.name.toLowerCase(),
      entry.name.toLowerCase()
    )

    const sameOrganizer =
      candidate.organizer.toLowerCase() === entry.organizer.toLowerCase()

    const overlappingDeadline =
      candidate.submissionDeadline &&
      entry.submissionDeadline &&
      candidate.submissionDeadline === entry.submissionDeadline

    if (nameSimilarity > 0.85 && (sameOrganizer || overlappingDeadline)) {
      return { isDuplicate: true, matchId: entry.id, similarity: nameSimilarity }
    }

    // High name similarity alone
    if (nameSimilarity > 0.95) {
      return { isDuplicate: true, matchId: entry.id, similarity: nameSimilarity }
    }
  }

  return { isDuplicate: false, matchId: null, similarity: 0 }
}

/**
 * Merge new extraction data into an existing hackathon,
 * preferring non-null new values over existing nulls.
 */
export function mergeHackathon(
  existing: Hackathon,
  extracted: ExtractionResult
): Hackathon {
  return {
    ...existing,
    description: extracted.description ?? existing.description,
    registrationOpen: extracted.registrationOpen ?? existing.registrationOpen,
    registrationDeadline:
      extracted.registrationDeadline ?? existing.registrationDeadline,
    submissionDeadline:
      extracted.submissionDeadline ?? existing.submissionDeadline,
    resultsDate: extracted.resultsDate ?? existing.resultsDate,
    prizePool: extracted.prizePool ?? existing.prizePool,
    categories: [
      ...new Set([...existing.categories, ...extracted.categories]),
    ],
    requirements: extracted.requirements ?? existing.requirements,
    blockchain: extracted.blockchain ?? existing.blockchain,
    location: extracted.location ?? existing.location,
    links: {
      ...existing.links,
      ...extracted.links,
    },
    lastUpdated: today(),
    confidence: Math.max(existing.confidence, extracted.confidence),
  }
}

/**
 * Convert an extraction result to a full Hackathon entry.
 */
export function extractionToHackathon(
  extracted: ExtractionResult,
  source: string
): Hackathon {
  const id = slugify(extracted.name)
  return {
    id,
    name: extracted.name,
    organizer: extracted.organizer,
    url: extracted.url,
    status: "registration_open",
    format: extracted.format,
    description: extracted.description,
    registrationOpen: extracted.registrationOpen,
    registrationDeadline: extracted.registrationDeadline,
    submissionDeadline: extracted.submissionDeadline,
    resultsDate: extracted.resultsDate,
    prizePool: extracted.prizePool,
    categories: extracted.categories,
    requirements: extracted.requirements,
    blockchain: extracted.blockchain,
    location: extracted.location,
    links: extracted.links,
    source,
    lastUpdated: today(),
    confidence: extracted.confidence,
  }
}

/**
 * Process an extraction: deduplicate, merge or create, return the result.
 */
export async function processExtraction(
  extracted: ExtractionResult,
  source: string
): Promise<{ action: "created" | "merged" | "skipped"; hackathon: Hackathon }> {
  const existing = await loadAllHackathons()
  const dedup = checkDuplicate(extracted, existing)

  if (dedup.isDuplicate && dedup.matchId) {
    const match = existing.find((h) => h.id === dedup.matchId)
    if (match) {
      const merged = mergeHackathon(match, extracted)
      return { action: "merged", hackathon: merged }
    }
  }

  const hackathon = extractionToHackathon(extracted, source)
  return { action: "created", hackathon }
}
