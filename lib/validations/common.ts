import { z } from "zod";

export const listParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListParams = z.infer<typeof listParamsSchema>;

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
