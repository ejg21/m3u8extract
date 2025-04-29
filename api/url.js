const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  const fullUrl = req.query.url;
  const timeout = req.query.timeout || 90000; // Optional custom timeout (default 90 seconds)

  if (!fullUrl) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  let browser;
  let responseSent = false;

  try {
    console.log('Initializing Puppeteer with chromium-aws-lambda...');

    // Launch Puppeteer with chromium-aws-lambda settings
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();

    // Set user agent and other HTTP headers
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // Set navigator.webdriver to false to bypass bot detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log('Going to page:', fullUrl);

    let m3u8Urls = [];

    // Listen for responses to find .m3u8 files
    page.on('response', async (response) => {
      const responseUrl = response.url();
      if (responseUrl.endsWith('.m3u8')) {
        if (!m3u8Urls.includes(responseUrl)) {
          m3u8Urls.push(responseUrl);
          console.log('Found m3u8 URL:', responseUrl);

          // Send the response as soon as the first URL is found
          if (!responseSent) {
            responseSent = true;
            const html = `
              <html>
                <head><title>Found M3U8 URL</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                  <h1>Found M3U8 URL:</h1>
                  <p><a href="${responseUrl}" target="_blank">${responseUrl}</a></p>
                </body>
              </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            await browser.close();
          }
        }
      }
    });

    // Navigate to the URL and wait until the network is idle
    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: timeout,
    });

    // Fallback if no m3u8 found after timeout (default 15 seconds)
    setTimeout(async () => {
      if (!responseSent && m3u8Urls.length === 0) {
        responseSent = true;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>No M3U8 URLs found after timeout.</h1>');
        await browser.close();
      }
    }, 15000);

  } catch (error) {
    console.error('Error occurred:', error);
    if (!responseSent) {
      res.statusCode = 500;
      res.end('An error occurred while processing your request.');
    }
    if (browser) await browser.close();
  }
};
