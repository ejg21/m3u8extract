const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

app.get('/extract', async (req, res) => {
    const url = req.query.url; // URL passed as a query parameter

    if (!url) {
        return res.status(400).send('No URL provided');
    }

    try {
        // Fetch the HTML of the page
        const response = await axios.get(url);
        const html = response.data;

        // Use Cheerio to parse and traverse the HTML
        const $ = cheerio.load(html);

        // Check if we can directly find the m3u8 link in the HTML
        let m3u8Urls = [];
        $('script').each((i, script) => {
            const scriptContent = $(script).html();
            // Check if the script contains any m3u8 URLs
            const m3u8Matches = scriptContent.match(/https?:\/\/[^\s]+\.m3u8/g);
            if (m3u8Matches) {
                m3u8Urls = m3u8Urls.concat(m3u8Matches);
            }
        });

        // Check for iframe URLs in the page
        let iframeUrls = [];
        $('iframe').each((i, iframe) => {
            iframeUrls.push($(iframe).attr('src'));
        });

        // Return the results in JSON format
        res.json({
            m3u8Urls: m3u8Urls,
            iframeUrls: iframeUrls
        });

    } catch (error) {
        console.error('Error fetching or parsing the page:', error);
        res.status(500).send('Error extracting data');
    }
});

// Start the server on port 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
