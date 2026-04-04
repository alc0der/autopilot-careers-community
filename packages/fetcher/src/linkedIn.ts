import path from "node:path";
import type { Page } from "puppeteer";

export async function checkLoginStatus(page: Page): Promise<boolean> {
  console.log("Checking login status...");
  try {
    const isLoggedIn = await page.evaluate(() => {
      const elements = document.querySelectorAll("span");
      for (const element of elements) {
        if (element.textContent?.trim() === "Me") {
          console.log("Found 'Me' element:", element);
          return true;
        }
      }
      console.log("'Me' element not found");
      return false;
    });
    console.log("Login status:", isLoggedIn ? "Logged in" : "Not logged in");
    return isLoggedIn;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
}

export function isLinkedInUrl(url: URL): boolean {
  return url.hostname.includes("linkedin.com");
}

export function renameLinkedInJob(title: string, jdsDir: string): string {
  const [jobTitle, company, platform] = title.split(" | ");
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return path.join(jdsDir, `${datePrefix}_${company}_${jobTitle.replace("/", "|")}.md`);
}
