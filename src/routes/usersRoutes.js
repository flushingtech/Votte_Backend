const express = require('express');
const pool = require('../../db');
const { upload } = require('../helper/multer');
const { cloudinaryUploadFiles } = require('../helper/cloudinaryConfig');
const router = express.Router();

// GET all users (for contributor dropdown)
router.get('/all-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, email FROM users ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});


// GET the date a user joined via email list
router.get('/join-date/:email', async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: 'Missing required fields'})
    }

    try {
        const findStartDate = `
            SELECT created_at
            FROM users u
            WHERE u.email = $1
        `;
        
        const startDate = await pool.query(findStartDate, [email]);
        console.log(startDate.rows[0].created_at);
        res.status(200).json({ joinDate: startDate.rows[0].created_at })
    } catch(error) {
        console.error('The user email does not exist with that date:', error.message)
        res.status(500).json({ message: 'Failed to fetch join date', error: error.message })
    }

});

// GET user email by username (for cleaner URLs)
router.get('/email-by-username/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const query = `
      SELECT email
      FROM users
      WHERE email LIKE $1
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const result = await pool.query(query, [`${username}@%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ email: result.rows[0].email });
  } catch (error) {
    console.error('Error fetching user email by username:', error);
    res.status(500).json({ message: 'Failed to fetch user email', error: error.message });
  }
});

// GET user profile by email
router.get('/profile/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const query = `
      SELECT email, name, profile_picture, github_url, linkedin_url, created_at
      FROM users
      WHERE email = $1
    `;
    let result;
    try {
      result = await pool.query(query, [email]);
    } catch (err) {
      // Fallback for instances where the new social columns haven't been migrated yet
      if (err.code === '42703') { // undefined_column
        console.warn('Social link columns missing, falling back to legacy profile query:', err.message);
        const legacyQuery = `
          SELECT email, name, profile_picture, created_at
          FROM users
          WHERE email = $1
        `;
        result = await pool.query(legacyQuery, [email]);
        // Attach nulls so the frontend still gets keys
        if (result.rows[0]) {
          result.rows[0].github_url = null;
          result.rows[0].linkedin_url = null;
        }
      } else {
        throw err;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
});

// POST upload profile picture
router.post('/upload-profile-picture/:email', upload, async (req, res) => {
  try {
    const { email } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      console.log('❌ No files uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT email FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Upload to Cloudinary
    const uploaded = await cloudinaryUploadFiles(files, 'votte_profile_pics', `profile-${email.split('@')[0]}`);

    // Update user's profile_picture in database
    const query = `
      UPDATE users
      SET profile_picture = $1
      WHERE email = $2
      RETURNING email, profile_picture
    `;
    const result = await pool.query(query, [uploaded[0].cloudinary_url, email]);

    res.status(200).json({
      message: 'Profile picture uploaded successfully',
      user: result.rows[0],
      imageUrl: uploaded[0].cloudinary_url
    });
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    res.status(500).json({ message: 'Failed to upload profile picture', error: error.message });
  }
});

// PUT update username
router.put('/update-name', async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ message: 'Email and name are required' });
  }

  if (name.trim().length === 0) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }

  const trimmedName = name.trim();
  const MAX_NAME_LENGTH = 10;
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ message: `Name too long. Please keep it under ${MAX_NAME_LENGTH} characters.` });
  }

  try {
    const query = `
      UPDATE users
      SET name = $1
      WHERE email = $2
      RETURNING email, name, profile_picture, created_at
    `;
    const result = await pool.query(query, [trimmedName, email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Name updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating name:', error);
    res.status(500).json({ message: 'Failed to update name', error: error.message });
  }
});

// PUT update social links (GitHub/LinkedIn)
router.put('/social-links', async (req, res) => {
  const { email, githubUrl, linkedinUrl } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const query = `
      UPDATE users
      SET github_url = $1, linkedin_url = $2
      WHERE email = $3
      RETURNING email, name, profile_picture, github_url, linkedin_url, created_at
    `;
    const result = await pool.query(query, [githubUrl || null, linkedinUrl || null, email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Social links updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating social links:', error);
    res.status(500).json({ message: 'Failed to update social links', error: error.message });
  }
});

// POST get display names for emails
router.post('/display-names', async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ message: 'Emails array is required' });
  }

  try {
    const query = `
      SELECT
        email,
        COALESCE(name, SPLIT_PART(email, '@', 1)) as display_name
      FROM users
      WHERE email = ANY($1)
    `;
    const result = await pool.query(query, [emails]);

    // Create a map of email -> display_name
    const nameMap = {};
    result.rows.forEach(row => {
      nameMap[row.email] = row.display_name;
    });

    // For emails not in database, use email username as fallback
    emails.forEach(email => {
      if (!nameMap[email]) {
        nameMap[email] = email.split('@')[0];
      }
    });

    res.status(200).json({ names: nameMap });
  } catch (error) {
    console.error('Error fetching display names:', error);
    res.status(500).json({ message: 'Failed to fetch display names', error: error.message });
  }
});

module.exports = router;
