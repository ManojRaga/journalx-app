import { z } from 'zod'

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().default(''),
  tags: z.array(z.string().min(1)).default([]),
  summary: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type JournalEntry = z.infer<typeof JournalEntrySchema>

export const JournalEntryUpsertSchema = JournalEntrySchema.pick({
  id: true,
  title: true,
  content: true,
  tags: true,
}).partial({ id: true })

export type JournalEntryUpsert = z.infer<typeof JournalEntryUpsertSchema>

export const JournalEntryPreviewSchema = JournalEntrySchema.pick({
  id: true,
  title: true,
  summary: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
})

export type JournalEntryPreview = z.infer<typeof JournalEntryPreviewSchema>

export const JournalListResponseSchema = z.array(JournalEntryPreviewSchema)
export type JournalListResponse = z.infer<typeof JournalListResponseSchema>

export const DeleteEntrySchema = z.object({
  id: z.string().uuid(),
})

export type DeleteEntryPayload = z.infer<typeof DeleteEntrySchema>

