const express = require("express");
const axios = require("axios");
const { parseStringPromise } = require("xml2js"); // Use the promise version of xml2js
const pool = require("../../db");
const router = express.Router();
const { getEventDate } = require("../utils/dateTimeUtils");
const e = require("express");

// Check if a user is an admin
router.post("/check-admin", async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query(
            "SELECT email FROM admin WHERE email = $1",
            [email]
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
            if (!item.link || !item.link[0]) {
                console.error("Missing link for item:", item);
                continue; // Skip items with missing link
            }
            const link = item.link[0];
            // Skip this iteration if event is already in the database
            if (await isEventInDatabase(link)) {
                continue;
            }

            const originalTitle = item.title[0];
            const eventTitle =
                titleCorrespondence[originalTitle] || originalTitle;

            let eventDate;
            try {
                eventDate = await getEventDate(link);
            } catch (err) {
                console.error(
                    `Error extracting date for event "${originalTitle}":`,
                    err.message
                );
                continue; // Skip this event if date extraction fails
            }

            if (eventTitle.toLowerCase().includes("happy hour")) {
                continue; // Skip this iteration
            }

            if (await isEventTileDateInDatabase(eventTitle, eventDate)) {
                //Insert the link to the database
                const results = await pool.query(
                    "UPDATE events SET link = $1 WHERE event_date = $2 AND link IS NULL",
                    [link, eventDate]
                );
                console.log(
                    `Update event link for ${eventTitle} on ${eventDate} with ${link}.`
                );
            } else {
                // Add event to the database
                await pool.query(
                    "INSERT INTO events (title, event_date, link) VALUES ($1, $2, $3)",
                    [eventTitle, eventDate, link]
                );
                console.log(
                    `Inserted new event: ${eventTitle} on ${eventDate}`
                );
            }
        }
        console.log("Finished processing RSS events.");
    } catch (error) {
        console.error("Error fetching or adding RSS events:", error.message);
        throw new Error("Error fetching or adding RSS events");
    }
    async function isEventInDatabase(link) {
        const query = "SELECT * FROM events WHERE link = $1";
        const result = await pool.query(query, [link]);
        return result.rowCount > 0;
    }
    async function isEventTileDateInDatabase(eventTitle, eventDate) {
        const query = `SELECT * FROM events WHERE event_date = $1 AND title = $2`;
        const result = await pool.query(query, [eventDate, eventTitle]);
        return result.rowCount > 0;
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
            [email]
        );
        if (adminResult.rowCount === 0) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        const result = await pool.query(
            "INSERT INTO events (title, event_date) VALUES ($1, $2) RETURNING *",
            [title, eventDate]
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
            [id]
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
            [eventId]
        );
        res.status(200).json({ ideas: result.rows });
    } catch (error) {
        console.error("Error fetching ideas for event:", error.message);
        res.status(500).json({ message: "Failed to fetch ideas for event" });
    }
});

// PUT endpoint to set the stage of an event and sub-stage
router.put("/set-stage/:id", async (req, res) => {
    const { id } = req.params;
    const { stage } = req.body;

    let sub_stage = null;
    if (stage === 2) {
        sub_stage = 1; // Default sub-stage for Stage 2 is 1 (Most Creative)
    }

    try {
        const result = await pool.query(
            "UPDATE events SET stage = $1, current_sub_stage = COALESCE($2, current_sub_stage) WHERE id = $3 RETURNING *",
            [stage, sub_stage, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({
            message: `Event stage updated to ${stage}, sub-stage ${sub_stage}`,
            event: result.rows[0],
        });
    } catch (error) {
        console.error("Error setting event stage:", error);
        res.status(500).json({ message: "Failed to set event stage" });
    }
});


// GET endpoint to fetch the stage of an event
router.get("/get-stage/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "SELECT stage, current_sub_stage FROM events WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ 
            stage: result.rows[0].stage,
            current_sub_stage: result.rows[0].current_sub_stage
        });
    } catch (error) {
        console.error("Error fetching event stage:", error);
        res.status(500).json({ message: "Failed to fetch event stage" });
    }
});


// PUT endpoint to transition an event to Results Time (stage 3)
router.put("/set-results-time/:id", async (req, res) => {
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
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({
            message: `Event "${result.rows[0].title}" transitioned to Results Time (stage 3).`,
            event: result.rows[0],
        });
    } catch (error) {
        console.error("Error transitioning to Results Time:", error);
        res.status(500).json({
            message: "Failed to transition to Results Time",
            error: error.message,
        });
    }
});

// PUT endpoint to update the sub-stage of an event
router.put("/set-sub-stage/:id", async (req, res) => {
    const { id } = req.params;
    const { sub_stage } = req.body; // Accept the new sub-stage value

    try {
        const updateQuery = `
            UPDATE events
            SET current_sub_stage = $1
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(updateQuery, [sub_stage, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        console.log(`Sub-stage updated successfully:`, result.rows[0]);

        res.status(200).json({
            message: "Sub-stage updated successfully!",
            event: result.rows[0],
        });
    } catch (error) {
        console.error("Error updating sub-stage:", error);
        res.status(500).json({ message: "Failed to update sub-stage", error: error.message });
    }
});

router.put('/:eventId/check-in', async (req, res) => {
    const { eventId } = req.params;
    const { email } = req.body;
  
    try {
      const eventResult = await pool.query('SELECT checked_in FROM events WHERE id = $1', [eventId]);
  
      if (eventResult.rowCount === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      let existing = eventResult.rows[0].checked_in || '';
      existing = existing.replace(/{}/g, '').trim();
      const emails = existing ? existing.split(',') : [];
  
      if (emails.includes(email)) {
        return res.status(400).json({ message: 'Already checked in' });
      }
  
      emails.push(email);
      const updated = emails.join(',');
  
      await pool.query('UPDATE events SET checked_in = $1 WHERE id = $2', [updated, eventId]);
  
      res.status(200).json({ message: 'Checked in successfully' });
    } catch (err) {
      console.error('Check-in error:', err);
      res.status(500).json({ message: 'Check-in failed' });
    }
  });

  // GET endpoint to fetch events that have at least one image associated with them through ideas
  router.get('/with-images', async (req, res) => {
    try {
      const query = `
        SELECT id, title, event_date, image_url
        FROM events
        WHERE image_url IS NOT NULL
        ORDER BY event_date DESC
      `;
      const result = await pool.query(query);
      res.status(200).json({ events: result.rows });
    } catch (error) {
      console.error('Error fetching events with images:', error);
      res.status(500).json({ message: 'Failed to fetch events with images', error: error.message });
    }
  });
  
  

module.exports = router;
