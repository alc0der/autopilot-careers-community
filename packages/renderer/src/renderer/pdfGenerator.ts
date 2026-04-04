import fs from "node:fs";
import { PDFDocument } from "pdf-lib";

let puppeteer: typeof import("puppeteer-core");
try {
  puppeteer = require("puppeteer-core");
} catch {
  console.error(
    "Error: puppeteer-core is not installed.\n" +
    "Install it with: npm install -g puppeteer-core"
  );
  process.exit(1);
}

export type PdfMetadata = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
};

const RENDERER_VERSION = "2.2.0";

const BROWSER_CANDIDATES: Record<string, string[]> = {
  chrome: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ],
  "chrome-canary": [
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ],
};

function findBrowser(choice: string): string {
  if (choice.includes("/")) {
    if (!fs.existsSync(choice)) {
      throw new Error(`Browser not found at: ${choice}`);
    }
    return choice;
  }

  const candidates = BROWSER_CANDIDATES[choice];
  if (!candidates) {
    throw new Error(
      `Unknown browser: ${choice}. Use: chrome, chrome-canary, or a direct path.`
    );
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `Could not find ${choice}. Searched:\n${candidates.map((p) => "  " + p).join("\n")}\nInstall Chrome or pass --browser /path/to/chrome`
  );
}

async function stampMetadata(pdfPath: string, metadata?: PdfMetadata): Promise<number> {
  const pdfBytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(pdfBytes);

  // Always set renderer-owned fields
  doc.setCreator(`oh-my-cv-render v${RENDERER_VERSION}`);
  // Note: pdf-lib overwrites Producer on save() with its own credit — that's fine,
  // Creator already identifies the renderer.
  doc.setCreationDate(new Date());

  // Set caller-provided fields
  if (metadata?.title) doc.setTitle(metadata.title);
  if (metadata?.author) doc.setAuthor(metadata.author);
  if (metadata?.subject) doc.setSubject(metadata.subject);
  if (metadata?.keywords) doc.setKeywords(metadata.keywords);

  // Get the page count before saving
  const pageCount = doc.getPageCount();

  const stamped = await doc.save();
  fs.writeFileSync(pdfPath, stamped);

  return pageCount;
}

export async function generatePdf(
  htmlContent: string,
  outputPath: string,
  browser: string = "chrome",
  metadata?: PdfMetadata,
): Promise<number> {
  const executablePath = findBrowser(browser);
  const instance = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await instance.newPage();

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Wait for Iconify icons to render (span.iconify → svg.iconify)
    await page.waitForFunction(
      () => {
        const pending = document.querySelectorAll("span.iconify[data-icon]");
        return pending.length === 0;
      },
      { timeout: 15000 }
    ).catch(() => {
      console.warn("Warning: Some Iconify icons may not have loaded.");
    });

    await page.pdf({
      path: outputPath,
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    // Stamp PDF metadata after Puppeteer writes the file and get page count
    const pageCount = await stampMetadata(outputPath, metadata);
    return pageCount;
  } finally {
    await instance.close();
  }
}
