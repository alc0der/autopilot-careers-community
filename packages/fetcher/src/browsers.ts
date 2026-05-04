import fs from "node:fs";
import os from "node:os";
import type { PuppeteerLaunchOptions } from "puppeteer-core";
import puppeteer_extra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Configure puppeteer-extra with stealth plugin
puppeteer_extra.use(StealthPlugin());

type ChromeVersion = Pick<
  PuppeteerLaunchOptions,
  "executablePath" | "userDataDir"
> & {
  profileDirectory?: string;
};

export const googleChromeCanary: ChromeVersion = {
  executablePath:
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  userDataDir:
    "/Users/alc0der/Library/Application Support/Google/Chrome Canary",
  profileDirectory: "Profile 8",
};

export const googleChrome: ChromeVersion = {
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  userDataDir: "/Users/alc0der/Library/Application Support/Google/Chrome",
  profileDirectory: "Profile 8",
};

export const googleChromeTest: ChromeVersion = {
  userDataDir: "/Users/alc0der/.config/my-chrome-browser",
};

const maybeNeeded = {
  ignoreDefaultArgs: ["--disable-extensions"],
  args: ["--start-maximized", "--no-sandbox", "--disable-setuid-sandbox"],
};

// CHROME_EXECUTABLE_PATH / CHROME_USER_DATA_DIR let container environments
// supply a system Chromium instead of relying on macOS-specific paths.
// In container mode (CHROME_EXECUTABLE_PATH set) we do NOT use a fixed
// userDataDir — a fresh temp directory is created per launch to avoid
// SingletonLock conflicts from crashed/killed browser processes.
const browserProps: ChromeVersion = process.env.CHROME_EXECUTABLE_PATH
  ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
  : googleChromeTest;

export async function createBrowser(options?: { headless?: boolean }) {
  const headless = options?.headless ?? true;

  // In container mode, use a per-launch temp dir to avoid SingletonLock issues.
  const userDataDir = process.env.CHROME_EXECUTABLE_PATH
    ? fs.mkdtempSync(os.tmpdir() + "/chrome-")
    : browserProps.userDataDir;

  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    ...(headless ? [] : ["--start-maximized"]),
    ...(browserProps.profileDirectory
      ? [`--profile-directory=${browserProps.profileDirectory}`]
      : []),
  ];

  const browser = await puppeteer_extra.launch({
    headless,
    defaultViewport: null,
    pipe: true, // avoids uv_tty_init EINVAL in containers (no TTY available)
    ...(headless ? {} : { slowMo: 1000 }),
    args,
    ...(browserProps.executablePath ? { executablePath: browserProps.executablePath } : {}),
    userDataDir,
  });

  // Clean up the temp dir when the browser closes.
  if (process.env.CHROME_EXECUTABLE_PATH && userDataDir) {
    browser.on("disconnected", () => {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    });
  }

  return browser;
}
export function buildUrl(id: string): URL {
  return new URL(`https://www.linkedin.com/jobs/view/${id}`);
}
