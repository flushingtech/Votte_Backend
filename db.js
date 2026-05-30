const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Drop idle connections after 30 s so the pool retires them before the
  // server silently kills them (prevents ECONNRESET on the next query).
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
});

// Prevent unhandled pool errors from crashing the process.
pool.on('error', (err) => {
  console.error('pg pool error', err.message);
});

module.exports = pool;
