const express = require('express');
const puppeteer = require('puppeteer');

// Create the Express app
const app = express();
const port = process.env.PORT || 3000;  // Set port to 3000 or the one provided by Koyeb

// Define the route to extract m3u8
app.get('/extract', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const m3u8Links = await extractM3U8(url);
        if (m3u8Links.length > 0) {
            res.json({ m3u8Urls: m3u8Links });
        } else {
            res.json({ message: 'No m3u8 URLs found.' });
        }
    } catch (error) {
        console.error('Error extracting m3u8:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to extract m3u8 from the URL
async function extractM3U8(url) {
    const browser = await puppeteer.launch({
        headless: true, // Run in headless mode for production
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Opening page...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.setRequestInterception(true);

    const m3u8Urls = [];

    page.on('request', (request) => {
        if (request.url().includes('.m3u8')) {
            m3u8Urls.push(request.url());
        }
        request.continue();
    });

    console.log('Monitoring network requests...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds (adjust as needed)

    await browser.close();

    return m3u8Urls;
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
