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

  const pageContent = await page.content();
  await browser.close();
  return pageContent;
};

export const createPuppeteerFetcher = (): HtmlFetcher => fetchJobWithPuppeteer;
