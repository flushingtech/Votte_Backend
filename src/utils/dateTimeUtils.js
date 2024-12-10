const HTMLParser = require("node-html-parser");

function getEventDate(text) {
	const dateStr = extractDateStr(text);
	const monthAndDay = extractMonthAndDay(dateStr);
	if (monthAndDay === null) return new Date();
	const year = analyseYear(monthAndDay);
	return new Date(`${monthAndDay} ${year}`);

	function extractDateStr(text) {
		const description = HTMLParser.parse(text);
		const l = description.childNodes.length;
		const output = description.childNodes[l - 6].childNodes[0]._rawText;
		return output;
	}
	function extractMonthAndDay(str) {
		const regex = /(?<=, ).+(?= at)/;
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
