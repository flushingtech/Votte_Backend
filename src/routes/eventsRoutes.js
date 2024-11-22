const express = require("express");
const axios = require("axios");
const { parseStringPromise } = require("xml2js"); // Use the promise version of xml2js
const pool = require("../../db");
const router = express.Router();

// Check if a user is an admin
router.post("/check-admin", async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query(
            "SELECT email FROM admin WHERE email = $1",
            [email],
        );
        res.json({ isAdmin: result.rowCount > 0 });
    } catch (error) {
        console.error("Error checking admin status:", error);
        res.status(500).json({ message: "Error checking admin status" });
    }
});

// Title Correspondence Mapping
const titleCorrespondence = {
    "Bi-Weekly Tech Jams": "Flushing Tech Bi-Weekly Hackathon",
    "Office Hours": "Flushing Tech: Office Hour",
    "Happy Hour": "Flushing Tech Happy Hour",
    "Virtual Hackathons": "Flushing Tech Virtual Hackathon",
};

// Function to fetch and add events from RSS feed
async function fetchRssAndAddEvents() {
    const rssUrl = "https://www.meetup.com/flushing-tech/events/rss";

    try {
        console.log("Fetching RSS feed...");
        const rssResponse = await axios.get(rssUrl);
        const rssData = rssResponse.data;

        // Parse RSS XML data
        const parsedResult = await parseStringPromise(rssData);
        const rssItems = parsedResult.rss.channel[0].item;

        for (const item of rssItems) {
            const originalTitle = item.title[0];
            const eventTitle =
                titleCorrespondence[originalTitle] || originalTitle;
            const eventDate = new Date(item.pubDate[0]);

            console.log(`Checking event: ${eventTitle} on ${eventDate}`);

            // Check if event already exists in the database
            const checkEventQuery =
                "SELECT * FROM events WHERE title = $1 AND event_date = $2";
            const result = await pool.query(checkEventQuery, [
                eventTitle,
                eventDate,
            ]);

            if (result.rowCount === 0) {
                // Add event if it doesn't exist
                await pool.query(
                    "INSERT INTO events (title, event_date) VALUES ($1, $2)",
                    [eventTitle, eventDate],
                );
                console.log(`Inserted new event: ${eventTitle}`);
            } else {
                console.log(`Event already exists: ${eventTitle}`);
            }
        }
        console.log("Finished processing RSS events.");
    } catch (error) {
        console.error("Error fetching or adding RSS events:", error);
        throw new Error("Error fetching or adding RSS events");
    }
}
// Ensure this function runs when `/all-events` is called

router.get("/all-events", async (req, res) => {
    try {
        // First, fetch RSS feed and add events to the database
        await fetchRssAndAddEvents();

        // Then, retrieve events from the database
        const dbEvents = await pool.query(
            "SELECT * FROM events ORDER BY event_date ASC",
        );
        res.json({ events: dbEvents.rows });
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Error fetching events" });
    }
});

// Add an event (requires admin)
router.post("/add-event", async (req, res) => {
    const { email, title, eventDate } = req.body;
    try {
        const adminResult = await pool.query(
            "SELECT email FROM admin WHERE email = $1",
            [email],
        );
        if (adminResult.rowCount === 0) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        const result = await pool.query(
            "INSERT INTO events (title, event_date) VALUES ($1, $2) RETURNING *",
            [title, eventDate],
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ message: "Error adding event" });
    }
});

// Delete an event
router.delete("/delete-event/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM events WHERE id = $1 RETURNING *",
            [id],
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.json({
            message: "Event deleted successfully",
            event: result.rows[0],
        });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Failed to delete event" });
    }
});

// Get ideas by event ID
router.get("/:eventId/ideas", async (req, res) => {
    const { eventId } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM ideas WHERE event_id = $1 ORDER BY created_at DESC",
        [eventId]
      );
      res.status(200).json({ ideas: result.rows });
    } catch (error) {
      console.error("Error fetching ideas for event:", error);
      res.status(500).json({ message: "Failed to fetch ideas for event" });
    }
  });
  


module.exports = router;
