import { createBrowser } from "../browsers";
import { checkLoginStatus, isLinkedInUrl } from "../linkedIn";
import { promptLogin as didUserConfirmedLogin } from "../app_cli";
import type { HtmlFetcher } from "./index";

export const fetchJobWithPuppeteer = async (url: string): Promise<string> => {
  const browser = await createBrowser();
  const page = await browser.newPage();
  const response = await page.goto(url);

  if (response?.status() == 200) {
    if (isLinkedInUrl(new URL(url))) {
      if (!(await checkLoginStatus(page))) {
        // In non-interactive environments (no TTY), skip the login prompt.
        // @clack/prompts calls uv_tty_init which throws EINVAL without a TTY.
        // Instead, proceed with whatever content is visible (job pages are
        // largely public; the API path is the preferred route for private content).
        if (process.stdin.isTTY) {
          if (!(await didUserConfirmedLogin())) {
            await browser.close();
            throw new Error("User did not confirm login");
          }
          if (!(await checkLoginStatus(page))) {
            await browser.close();
            throw new Error("Unable to verify login status");
          }
        }
      }
    }
  }

  const pageContent = await page.content();
  await browser.close();
  return pageContent;
};

export const createPuppeteerFetcher = (): HtmlFetcher => fetchJobWithPuppeteer;
