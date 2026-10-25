import { z } from "zod";

// Browser-safe: the one shape every error response has. The app reads it, the service's `errorBody`
// must satisfy it, and renaming a field here breaks both at compile time.

export const issueSchema = z.object({ path: z.string(), message: z.string() });
export type Issue = z.infer<typeof issueSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .object({ issues: z.array(issueSchema).optional() })
      .loose()
      .optional(),
    requestId: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
