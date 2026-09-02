import { defineConfig, devices } from '@playwright/test'

// Runs the real production shell: `next build` then `next start` on a
// fixed port, so the smoke and keyboard specs exercise what ships.
//
// Two projects:
// - `chromium` (default, run by `npm run test:e2e`): deterministic
//   render + interaction checks, safe to gate CI on cross-platform.
// - `visual` (run by `npm run test:e2e:visual`): screenshot baselines
//   for the brand rename (U2) and CSS/theme consolidation (U18). These
//   are platform-sensitive (font hinting, sub-pixel AA), so U18 owns
//   generating and pinning them on the CI runner image, not this unit.

const PORT = 3123

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
