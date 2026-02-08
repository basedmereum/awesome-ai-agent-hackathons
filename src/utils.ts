import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { HackathonSchema, type Hackathon } from "./types.js"

const DATA_DIR = join(import.meta.dirname, "..", "data", "hackathons")

export async function loadAllHackathons(): Promise<Hackathon[]> {
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch {
    // exists
  }

  const files = await readdir(DATA_DIR)
  const jsonFiles = files.filter((f) => f.endsWith(".json"))

  const hackathons: Hackathon[] = []

  for (const file of jsonFiles) {
    const raw = await readFile(join(DATA_DIR, file), "utf-8")
    const parsed = HackathonSchema.safeParse(JSON.parse(raw))
    if (parsed.success) {
      hackathons.push(parsed.data)
    } else {
      console.error(`Invalid hackathon data in ${file}:`, parsed.error.message)
    }
  }

  return hackathons
}

export async function saveHackathon(hackathon: Hackathon): Promise<string> {
  await mkdir(DATA_DIR, { recursive: true })
  const filename = `${hackathon.id}.json`
  const filepath = join(DATA_DIR, filename)
  await writeFile(filepath, JSON.stringify(hackathon, null, 2) + "\n", "utf-8")
  return filepath
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "").toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

export function today(): string {
  return new Date().toISOString().split("T")[0]
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency.toUpperCase() === "USD" || currency.toUpperCase() === "USDC") {
    return `$${amount.toLocaleString()}`
  }
  return `${amount.toLocaleString()} ${currency}`
}
