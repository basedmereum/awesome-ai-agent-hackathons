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
  breakdown: z.record(z.string(), z.number()).nullable().optional(),
})

export const BlockchainInfoSchema = z.object({
  chain: z.string(),
  ecosystem: z.string().nullable().optional(),
  tokenPrize: z.boolean().nullable().optional(),
})

export const RequirementsSchema = z.object({
  techStack: z.array(z.string()).nullable().optional(),
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
      apply: z.string().url().nullable().optional(),
      discord: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      pastWinners: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  source: z.string(),
  lastUpdated: z.string(),
  confidence: z.number().min(0).max(1),
})

export type Hackathon = z.infer<typeof HackathonSchema>
export type HackathonStatus = z.infer<typeof HackathonStatus>
export type HackathonFormat = z.infer<typeof HackathonFormat>

export const ExtractionResultSchema = z.object({
  name: z.string().nullable(),
  organizer: z.string().nullable(),
  url: z.string().nullable(),
  format: HackathonFormat.nullable(),
  description: z.string().nullable().optional(),
  registrationOpen: z.string().nullable().optional(),
  registrationDeadline: z.string().nullable().optional(),
  submissionDeadline: z.string().nullable().optional(),
  resultsDate: z.string().nullable().optional(),
  prizePool: PrizePoolSchema.nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  requirements: RequirementsSchema.nullable().optional(),
  blockchain: BlockchainInfoSchema.nullable().optional(),
  location: z.string().nullable().optional(),
  links: z
    .object({
      apply: z.string().nullable().optional(),
      discord: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      pastWinners: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  confidence: z.number().min(0).max(1),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>
