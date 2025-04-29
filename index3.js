const express = require('express');
const playwright = require('playwright');

const app = express();
const port = 3000;

app.get('/fetch-video-url', async (req, res) => {
  console.log('Received a request at /fetch-video-url');

  const browser = await playwright.chromium.launch({
    headless: false, // Run non-headless so it looks real
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  const page = await context.newPage();

  // Apply stealth tricks manually
  await page.addInitScript(() => {
    // Pass the Webdriver Test.
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Pass the Chrome Test.
    window.chrome = {
      runtime: {},
      // etc.
    };

    // Pass the Plugins Length Test.
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3],
    });

    // Pass the Languages Test.
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  const url = 'https://kerolaunochan.online/v2/embed-4/yymyAxEbwbIC?_debug=true';

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('Page loaded. Waiting 5 seconds for JS...');

    await page.waitForTimeout(5000);

    await page.waitForSelector('div.jw-media video', { timeout: 0 });

    const videoInfo = await page.evaluate(() => {
      const video = document.querySelector('div.jw-media video');
      if (!video) return null;

      return {
        outerHTML: video.parentElement.outerHTML,
        videoSrc: video.getAttribute('src')
      };
    });

    if (videoInfo) {
      res.send({
        message: 'Found video!',
        outerHTML: videoInfo.outerHTML,
        videoURL: videoInfo.videoSrc
      });
    } else {
      res.status(404).send('Video element not found.');
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error finding video element.');
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
