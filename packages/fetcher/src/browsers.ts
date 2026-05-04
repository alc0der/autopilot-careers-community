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
const browserProps: ChromeVersion = process.env.CHROME_EXECUTABLE_PATH
  ? {
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
      userDataDir: process.env.CHROME_USER_DATA_DIR ?? "/tmp/chrome-user-data",
    }
  : googleChromeTest;

export async function createBrowser(options?: { headless?: boolean }) {
  const headless = options?.headless ?? true;
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    ...(headless ? [] : ["--start-maximized"]),
    ...(browserProps.profileDirectory
      ? [`--profile-directory=${browserProps.profileDirectory}`]
      : []),
  ];

  return await puppeteer_extra.launch({
    headless,
    defaultViewport: null,
    ...(headless ? {} : { slowMo: 1000 }),
    args,
    ...(browserProps.executablePath ? { executablePath: browserProps.executablePath } : {}),
    userDataDir: browserProps.userDataDir,
  });
}
export function buildUrl(id: string): URL {
  return new URL(`https://www.linkedin.com/jobs/view/${id}`);
}
