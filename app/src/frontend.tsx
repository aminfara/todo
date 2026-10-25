/**
 * Entry point and composition root of the app: builds the API client and the router, then renders.
 * Included by `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import { RouteErrorBoundary } from "./route-error-boundary";
import { createTaskApi } from "./tasks/task-api";
import { createTaskRoute } from "./tasks/task-route";

// Inlined by Bun when it bundles (BUN_PUBLIC_*, see bunfig.toml); nothing is read at runtime.
const apiUrl = process.env.BUN_PUBLIC_API_URL;
if (!apiUrl) throw new Error("BUN_PUBLIC_API_URL was not set when the app was bundled, see app/.env.example");

const router = createBrowserRouter([
  {
    path: "/",
    ErrorBoundary: RouteErrorBoundary,
    children: [createTaskRoute({ api: createTaskApi({ baseUrl: apiUrl }) })],
  },
]);

const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(document.getElementById("root")!)).render(app);
