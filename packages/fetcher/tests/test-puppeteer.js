const puppeteer = require('puppeteer-core');
const { exec } = require('child_process');

function initializeBrowser() {
  exec(
    "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222",
    {
      detached: true,
      stdio: "ignore",
    },
    (error, stdout) => {
      if (error) {
        console.error(`Error launching Chrome: ${error}`);
        return;
      }
      console.log(`Chrome launched in debug mode: ${stdout}`);
    },
  );
}

initializeBrowser();

setTimeout(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log(await page.title());
  await browser.close();
}, 5000); // Wait 5 seconds for Chrome to start
