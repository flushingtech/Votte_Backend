const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'idea_processor',
  password: 'Tamer123',
  port: 5432,
});

module.exports = pool;
