const HTMLParser = require("node-html-parser");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

async function getEventDate(text) {
    async function loadEventPageDOM() {
        const url = text;

        try {
            const response = await fetch(url);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            return document;
        } catch (error) {
            console.error("Error loading Meetup DOM:", error);
        }
    }
    const evantPageDocument = await loadEventPageDOM();
    const dateTime = evantPageDocument.querySelector("time").textContent;

    const monthAndDay = extractMonthAndDay(dateTime);
    if (monthAndDay === null) return new Date();
    const year = analyseYear(monthAndDay);
    return new Date(`${monthAndDay} ${year}`);
    function extractMonthAndDay(str) {
        const regex = /(?<=, ).+(?=,)/;
        if (regex.test(str)) {
            const output = str.match(regex)[0];
            return output;
        } else {
            return null;
        }
    }
    function analyseYear(str) {
        const currMonth = new Date(str).getMonth();
        const nowMonth = new Date().getMonth();
        const nowYear = new Date().getFullYear();
        return currMonth >= nowMonth ? nowYear : nowYear + 1;
    }
}

module.exports = { getEventDate };
