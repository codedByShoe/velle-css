import { defineConfig } from "@playwright/test"
import { fileURLToPath } from "node:url"

const externalUrl = process.env.VELLE_BLAZOR_URL
const baseURL = externalUrl || "http://127.0.0.1:5278"

export default defineConfig({
  testDir: ".",
  outputDir: "test-results",
  use: { baseURL },
  webServer: externalUrl ? undefined : {
    command: "dotnet run --project samples/Velle.Blazor.Sample --no-launch-profile -- --urls http://127.0.0.1:5278",
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ASPNETCORE_ENVIRONMENT: "Development" },
    url: baseURL,
  },
})
