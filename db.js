const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Ensure this is properly set
  ssl: {
    rejectUnauthorized: false,  // Ensure SSL is handled properly if required by your host
  }
});

module.exports = pool;
