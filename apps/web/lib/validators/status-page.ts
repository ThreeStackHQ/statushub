import { z } from 'zod';

// Status Page validation schemas
export const createStatusPageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Subdomain must contain only lowercase letters, numbers, and hyphens'
    ),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .default('#3b82f6'),
});

export const updateStatusPageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  customDomain: z.string().max(255).optional().nullable(),
});

// Component validation schemas
export const createComponentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  type: z.enum(['http', 'https', 'tcp', 'icmp']).default('http'),
  url: z.string().url('Invalid URL'),
  checkInterval: z.number().int().min(60).max(3600).default(60), // 1 min to 1 hour
  sortOrder: z.number().int().default(0).optional(),
});

export const updateComponentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['http', 'https', 'tcp', 'icmp']).optional(),
  url: z.string().url().optional(),
  checkInterval: z.number().int().min(60).max(3600).optional(),
  status: z.enum(['operational', 'degraded', 'down', 'maintenance']).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateStatusPageInput = z.infer<typeof createStatusPageSchema>;
export type UpdateStatusPageInput = z.infer<typeof updateStatusPageSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
