require("dotenv").config({ path: "../../../.env" });
async function verifyIdeaOwner(id, email) {
  const pool = require("../../../db");
  const results = await pool.query(
    "SELECT * FROM ideas WHERE id = $1 AND email = $2",
    [id, email]
  );
  if (results.rowCount === 1) return true;
  else return false;
}

module.exports = verifyIdeaOwner;
