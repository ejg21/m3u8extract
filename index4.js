const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

app.get('/url', async (req, res) => {
  const fullUrl = req.query.url;

  if (!fullUrl) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  let browser;
  let responseSent = false;

  try {
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--mute-audio'
      ],
      userDataDir: './tmp',
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log('Going to full page:', fullUrl);

    let m3u8Urls = [];

    page.on('response', async (response) => {
      const responseUrl = response.url();
      if (responseUrl.endsWith('.m3u8') && !m3u8Urls.includes(responseUrl)) {
        m3u8Urls.push(responseUrl);
        console.log('Found m3u8 URL:', responseUrl);

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
          res.send(html);
        }
      }
    });

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 90000,
    });

    // Fallback response if no .m3u8 is found after 15 seconds
    setTimeout(() => {
      if (!responseSent && m3u8Urls.length === 0) {
        responseSent = true;
        res.send('<h1>No M3U8 URLs found after timeout.</h1>');
        browser && browser.close();
      }
    }, 15000);

  } catch (error) {
    console.error('Error occurred:', error);
    if (!responseSent) {
      responseSent = true;
      res.status(500).send('An error occurred while processing your request.');
    }
    browser && browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
