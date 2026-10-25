import tailwind from "bun-plugin-tailwind";

// The `bun build` CLI cannot run plugins, so the Tailwind plugin needs this script.
const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  target: "browser",
  sourcemap: "linked",
  minify: true,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  env: "BUN_PUBLIC_*",
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
