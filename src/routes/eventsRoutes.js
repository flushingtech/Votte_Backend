const express = require("express");
const axios = require("axios");
const { parseStringPromise } = require("xml2js"); // Use the promise version of xml2js
const pool = require("../../db");
const router = express.Router();
const { getEventDate } = require("../utils/dateTimeUtils");

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
            if (!item.description || !item.description[0]) {
                console.error("Missing description for item:", item);
                continue; // Skip items with missing descriptions
            }

            const originalTitle = item.title[0];
            const eventTitle =
                titleCorrespondence[originalTitle] || originalTitle;

            let eventDate;
            try {
                eventDate = getEventDate(item.description[0]);
            } catch (err) {
                console.error(`Error extracting date for event "${originalTitle}":`, err.message);
                continue; // Skip this event if date extraction fails
            }

            console.log(`Checking event: ${eventTitle} on ${eventDate}`);

            if (eventTitle.toLowerCase().includes("happy hour")) {
                console.log(`Skipping Happy Hour event: ${eventTitle}`);
                continue; // Skip this iteration
            }

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
                    [eventTitle, eventDate]
                );
                console.log(`Inserted new event: ${eventTitle}`);
            } else {
                console.log(`Event already exists: ${eventTitle}`);
            }
        }
        console.log("Finished processing RSS events.");
    } catch (error) {
        console.error("Error fetching or adding RSS events:", error.message);
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
            "SELECT * FROM events ORDER BY event_date ASC"
        );
        res.json({ events: dbEvents.rows });
    } catch (error) {
        console.error("Error fetching events:", error.message);
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
        console.error("Error adding event:", error.message);
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
        console.error("Error deleting event:", error.message);
        res.status(500).json({ message: "Failed to delete event" });
    }
});

// Get ideas by event ID
router.get("/:eventId/ideas", async (req, res) => {
    const { eventId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM ideas WHERE event_id = $1 ORDER BY created_at DESC",
            [eventId],
        );
        res.status(200).json({ ideas: result.rows });
    } catch (error) {
        console.error("Error fetching ideas for event:", error.message);
        res.status(500).json({ message: "Failed to fetch ideas for event" });
    }
});

// PUT endpoint to set the stage of an event
router.put('/set-stage/:id', async (req, res) => {
    const { id } = req.params;
    const { stage } = req.body;

    try {
        const updateQuery = `
            UPDATE events
            SET stage = $1
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(updateQuery, [stage, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({
            message: 'Event stage updated successfully!',
            event: result.rows[0],
        });
    } catch (error) {
        console.error('Error setting event stage:', error);
        res.status(500).json({ message: 'Failed to set event stage', error: error.message });
    }
});

// GET endpoint to fetch the stage of an event
router.get('/get-stage/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query('SELECT stage FROM events WHERE id = $1', [id]);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      res.status(200).json({ stage: result.rows[0].stage });
    } catch (error) {
      console.error('Error fetching event stage:', error);
      res.status(500).json({ message: 'Failed to fetch event stage' });
    }
  });

  // PUT endpoint to transition an event to Results Time (stage 3)
router.put('/set-results-time/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Update the stage of the event to 3
        const updateQuery = `
            UPDATE events
            SET stage = 3
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(updateQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({
            message: `Event "${result.rows[0].title}" transitioned to Results Time (stage 3).`,
            event: result.rows[0],
        });
    } catch (error) {
        console.error('Error transitioning to Results Time:', error);
        res.status(500).json({ message: 'Failed to transition to Results Time', error: error.message });
    }
});


module.exports = router;
