const pool = require("../../db");
test("The Docker test database is ready.", async () => {
    await expect(
        pool.query("SELECT NOW()").then((res) => res.rows[0].now)
    ).resolves.not.toBeNull();
});
