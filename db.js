const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://default:m2nK4zDCoewi@ep-lively-wood-a4euf753.us-east-1.aws.neon.tech:5432/verceldb?sslmode=require"
})

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'idea_processor',
//   password: 'Tamer123',
//   port: 5432,
// });

module.exports = pool;
