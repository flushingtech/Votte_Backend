require('dotenv').config(); // Load environment variables

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Read connection string from environment
  ssl: false  // Temporarily disable SSL to check if this resolves the password issue
});

module.exports = pool;
