const express = require('express');
const pool = require('../../db'); // Database connection
const router = express.Router();

// POST: Create a contributor request
router.post('/create', async (req, res) => {
  const { ideaId, eventId, requesterEmail, message } = req.body;

  if (!ideaId || !eventId || !requesterEmail) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Check if user is already a contributor
    const checkContributorQuery = `
      SELECT contributors FROM idea_event_metadata
      WHERE idea_id = $1 AND event_id = $2;
    `;
    const contributorResult = await pool.query(checkContributorQuery, [ideaId, eventId]);

    if (contributorResult.rows.length > 0) {
      const contributors = contributorResult.rows[0].contributors || '';
      const contributorList = contributors.split(',').map(c => c.trim()).filter(c => c);

      if (contributorList.includes(requesterEmail)) {
        return res.status(400).json({ message: 'You are already a contributor on this project' });
      }
    }

    // Check if there's already a pending request
    const checkRequestQuery = `
      SELECT * FROM contributor_requests
      WHERE idea_id = $1 AND event_id = $2 AND requester_email = $3 AND status = 'pending';
    `;
    const existingRequest = await pool.query(checkRequestQuery, [ideaId, eventId, requesterEmail]);

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ message: 'You already have a pending request for this project' });
    }

    // Create the request
    const insertQuery = `
      INSERT INTO contributor_requests (idea_id, event_id, requester_email, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [ideaId, eventId, requesterEmail, message || null]);

    res.status(201).json({
      message: 'Contributor request created successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating contributor request:', error);
    res.status(500).json({ message: 'Failed to create contributor request' });
  }
});

// GET: Get pending requests for a specific idea and event
router.get('/pending/:ideaId/:eventId', async (req, res) => {
  const { ideaId, eventId } = req.params;

  try {
    const query = `
      SELECT cr.*, u.name as requester_name, u.profile_picture as requester_picture
      FROM contributor_requests cr
      LEFT JOIN users u ON cr.requester_email = u.email
      WHERE cr.idea_id = $1 AND cr.event_id = $2 AND cr.status = 'pending'
      ORDER BY cr.created_at ASC;
    `;
    const result = await pool.query(query, [ideaId, eventId]);

    res.status(200).json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

// GET: Get all requests made by a user
router.get('/my-requests/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const query = `
      SELECT cr.*, i.idea as idea_title, e.title as event_title
      FROM contributor_requests cr
      JOIN ideas i ON cr.idea_id = i.id
      JOIN events e ON cr.event_id = e.id
      WHERE cr.requester_email = $1
      ORDER BY cr.created_at DESC;
    `;
    const result = await pool.query(query, [email]);

    res.status(200).json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ message: 'Failed to fetch user requests' });
  }
});

// GET: Get all pending requests for projects owned by or admin user
router.get('/my-projects/:email', async (req, res) => {
  const { email } = req.params;

  try {
    // Check if user is admin
    const adminCheckQuery = `SELECT email FROM admin WHERE email = $1;`;
    const adminResult = await pool.query(adminCheckQuery, [email]);
    const isAdmin = adminResult.rows.length > 0;

    let query;
    let queryParams;

    if (isAdmin) {
      // Admin can see all pending requests
      query = `
        SELECT cr.*,
               i.idea as idea_title, i.email as idea_owner,
               e.title as event_title,
               u.name as requester_name, u.profile_picture as requester_picture
        FROM contributor_requests cr
        JOIN ideas i ON cr.idea_id = i.id
        JOIN events e ON cr.event_id = e.id
        LEFT JOIN users u ON cr.requester_email = u.email
        WHERE cr.status = 'pending'
        ORDER BY cr.created_at DESC;
      `;
      queryParams = [];
    } else {
      // Regular users see requests for their own projects
      query = `
        SELECT cr.*,
               i.idea as idea_title, i.email as idea_owner,
               e.title as event_title,
               u.name as requester_name, u.profile_picture as requester_picture
        FROM contributor_requests cr
        JOIN ideas i ON cr.idea_id = i.id
        JOIN events e ON cr.event_id = e.id
        LEFT JOIN users u ON cr.requester_email = u.email
        WHERE cr.status = 'pending' AND i.email = $1
        ORDER BY cr.created_at DESC;
      `;
      queryParams = [email];
    }

    const result = await pool.query(query, queryParams);

    res.status(200).json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching project requests:', error);
    res.status(500).json({ message: 'Failed to fetch project requests' });
  }
});

// GET: Get count of pending requests for user's projects
router.get('/count/:email', async (req, res) => {
  const { email } = req.params;

  try {
    // Check if user is admin
    const adminCheckQuery = `SELECT email FROM admin WHERE email = $1;`;
    const adminResult = await pool.query(adminCheckQuery, [email]);
    const isAdmin = adminResult.rows.length > 0;

    let query;
    let queryParams;

    if (isAdmin) {
      // Admin sees count of all pending requests
      query = `
        SELECT COUNT(*) as count
        FROM contributor_requests
        WHERE status = 'pending';
      `;
      queryParams = [];
    } else {
      // Regular users see count for their own projects
      query = `
        SELECT COUNT(*) as count
        FROM contributor_requests cr
        JOIN ideas i ON cr.idea_id = i.id
        WHERE cr.status = 'pending' AND i.email = $1;
      `;
      queryParams = [email];
    }

    const result = await pool.query(query, queryParams);

    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching request count:', error);
    res.status(500).json({ message: 'Failed to fetch request count' });
  }
});

// PUT: Accept a contributor request
router.put('/:requestId/accept', async (req, res) => {
  const { requestId } = req.params;
  const { userEmail } = req.body; // Email of user accepting (for permission check)

  if (!userEmail) {
    return res.status(400).json({ message: 'User email is required' });
  }

  try {
    // Get the request details
    const getRequestQuery = `
      SELECT cr.*, i.email as idea_owner
      FROM contributor_requests cr
      JOIN ideas i ON cr.idea_id = i.id
      WHERE cr.id = $1 AND cr.status = 'pending';
    `;
    const requestResult = await pool.query(getRequestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    const request = requestResult.rows[0];

    // Check if user has permission (owner or admin)
    const adminCheckQuery = `SELECT email FROM admin WHERE email = $1;`;
    const adminResult = await pool.query(adminCheckQuery, [userEmail]);
    const isAdmin = adminResult.rows.length > 0;
    const isOwner = request.idea_owner === userEmail;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You do not have permission to accept this request' });
    }

    // Add contributor to idea_event_metadata
    const updateContributorsQuery = `
      UPDATE idea_event_metadata
      SET contributors = CASE
        WHEN contributors IS NULL OR contributors = '' THEN $1
        ELSE contributors || ',' || $1
      END
      WHERE idea_id = $2 AND event_id = $3;
    `;
    await pool.query(updateContributorsQuery, [request.requester_email, request.idea_id, request.event_id]);

    // Update request status
    const updateRequestQuery = `
      UPDATE contributor_requests
      SET status = 'accepted', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(updateRequestQuery, [requestId]);

    res.status(200).json({
      message: 'Request accepted successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ message: 'Failed to accept request' });
  }
});

// PUT: Decline a contributor request
router.put('/:requestId/decline', async (req, res) => {
  const { requestId } = req.params;
  const { userEmail } = req.body; // Email of user declining (for permission check)

  if (!userEmail) {
    return res.status(400).json({ message: 'User email is required' });
  }

  try {
    // Get the request details
    const getRequestQuery = `
      SELECT cr.*, i.email as idea_owner
      FROM contributor_requests cr
      JOIN ideas i ON cr.idea_id = i.id
      WHERE cr.id = $1 AND cr.status = 'pending';
    `;
    const requestResult = await pool.query(getRequestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    const request = requestResult.rows[0];

    // Check if user has permission (owner or admin)
    const adminCheckQuery = `SELECT email FROM admin WHERE email = $1;`;
    const adminResult = await pool.query(adminCheckQuery, [userEmail]);
    const isAdmin = adminResult.rows.length > 0;
    const isOwner = request.idea_owner === userEmail;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You do not have permission to decline this request' });
    }

    // Update request status
    const updateRequestQuery = `
      UPDATE contributor_requests
      SET status = 'declined', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(updateRequestQuery, [requestId]);

    res.status(200).json({
      message: 'Request declined successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error declining request:', error);
    res.status(500).json({ message: 'Failed to decline request' });
  }
});

module.exports = router;
