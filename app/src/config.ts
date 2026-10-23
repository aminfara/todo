// BUN_PUBLIC_* values are inlined at build time (see bunfig.toml). Required, no defaults.
const apiUrl = process.env.BUN_PUBLIC_API_URL;
if (!apiUrl) throw new Error("BUN_PUBLIC_API_URL is not set, see app/.env.example");

export const config = { apiUrl } as const;
