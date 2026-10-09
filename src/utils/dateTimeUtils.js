const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

// Meetup event pages used to render a <time> element with a human-readable
// date we could scrape; their redesign dropped that element entirely (the
// page now ships a schema.org Event block as JSON-LD instead), which made
// every RSS sync silently skip every event. Read startDate from that
// JSON-LD block instead — it's structured, includes the UTC offset, and
// doesn't depend on Meetup's visible page markup.
async function getEventDate(url) {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
        let data;
        try {
            data = JSON.parse(script.textContent);
        } catch {
            continue;
        }
        if (data["@type"] === "Event" && data.startDate) {
            return new Date(data.startDate);
        }
    }

    throw new Error(`No Event JSON-LD with a startDate found on ${url}`);
}

module.exports = { getEventDate };
