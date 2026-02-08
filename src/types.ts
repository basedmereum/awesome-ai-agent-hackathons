import { z } from "zod"

export const HackathonStatus = z.enum([
  "upcoming",
  "registration_open",
  "active",
  "judging",
  "completed",
])

export const HackathonFormat = z.enum(["virtual", "in-person", "hybrid"])

export const PrizePoolSchema = z.object({
  total: z.number(),
  currency: z.string(),
  breakdown: z.record(z.string(), z.number()).optional(),
})

export const BlockchainInfoSchema = z.object({
  chain: z.string(),
  ecosystem: z.string().optional(),
  tokenPrize: z.boolean().optional(),
})

export const RequirementsSchema = z.object({
  techStack: z.array(z.string()),
  teamSize: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .nullable()
    .optional(),
  constraints: z.string().nullable().optional(),
})

export const HackathonSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizer: z.string(),
  url: z.string().url(),
  status: HackathonStatus,
  format: HackathonFormat,
  description: z.string().optional(),
  registrationOpen: z.string().nullable().optional(),
  registrationDeadline: z.string().nullable().optional(),
  submissionDeadline: z.string().nullable().optional(),
  resultsDate: z.string().nullable().optional(),
  prizePool: PrizePoolSchema.nullable().optional(),
  categories: z.array(z.string()),
  requirements: RequirementsSchema.optional(),
  blockchain: BlockchainInfoSchema.nullable().optional(),
  location: z.string().nullable().optional(),
  links: z
    .object({
      apply: z.string().url().optional(),
      discord: z.string().optional(),
      twitter: z.string().optional(),
      pastWinners: z.string().optional(),
    })
    .optional(),
  source: z.string(),
  lastUpdated: z.string(),
  confidence: z.number().min(0).max(1),
})

export type Hackathon = z.infer<typeof HackathonSchema>
export type HackathonStatus = z.infer<typeof HackathonStatus>
export type HackathonFormat = z.infer<typeof HackathonFormat>

export const ExtractionResultSchema = z.object({
  name: z.string(),
  organizer: z.string(),
  url: z.string(),
  format: HackathonFormat,
  description: z.string().optional(),
  registrationOpen: z.string().nullable().optional(),
  registrationDeadline: z.string().nullable().optional(),
  submissionDeadline: z.string().nullable().optional(),
  resultsDate: z.string().nullable().optional(),
  prizePool: PrizePoolSchema.nullable().optional(),
  categories: z.array(z.string()),
  requirements: RequirementsSchema.optional(),
  blockchain: BlockchainInfoSchema.nullable().optional(),
  location: z.string().nullable().optional(),
  links: z
    .object({
      apply: z.string().optional(),
      discord: z.string().optional(),
      twitter: z.string().optional(),
      pastWinners: z.string().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>
