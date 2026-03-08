import { zBoolean } from "@/modules/common-types.js";
import { z } from "zod/v4";

export const getInfoRequest = z.object({
  verbose: zBoolean.optional().default(false),
});

export const getInfoResponse = z.object({
  result: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    environment: z.string().optional(),
    uptime: z.number().optional(),
  }),
});

export type GetInfoRequest = z.infer<typeof getInfoRequest>;
export type GetInfoResponse = z.output<typeof getInfoResponse>;
