import { z } from 'zod';

// Campaign creation schema
export const createCampaignSchema = z.object({
  adAccountId: z.string().min(1).max(100),
  title: z.string().min(1).max(200).transform(s => s.trim()),
  objective: z.string().max(50).optional(),
  dailyBudget: z.number().positive().max(100000),
  totalBudget: z.number().positive().max(1000000).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format').optional().nullable(),
  targeting: z.object({
    locations: z.array(z.string().max(100)).max(50).optional(),
    interests: z.array(z.string().max(100)).max(50).optional(),
    ageMin: z.number().int().min(13).max(65).optional(),
    ageMax: z.number().int().min(13).max(65).optional(),
    genders: z.array(z.number().int().min(0).max(2)).optional(),
  }).optional(),
  creativeId: z.string().max(100).optional(),
  primaryText: z.string().max(500).optional().nullable(),
  headline: z.string().max(200).optional().nullable(),
  cta: z.string().max(50).optional().nullable(),
  destinationUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  pageId: z.string().max(100).optional().nullable(),
});

// Creative upload (JSON/base64) schema
export const createCreativeSchema = z.object({
  data: z.string().min(1).max(70_000_000), // ~50MB in base64
  fileName: z.string().min(1).max(255).transform(s => s.replace(/[^\w.\-]/g, '_')),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  orgId: z.string().max(100).optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateCreativeInput = z.infer<typeof createCreativeSchema>;
