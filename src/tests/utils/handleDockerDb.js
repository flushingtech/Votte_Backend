const path = require("path");
const { execSync } = require("child_process");
const dockerCompose = require("docker-compose");
const chalk = require("../../devUtils/chalk");

const testsRootPath = path.join(__dirname, "../");
console.log(testsRootPath);
const dockerComposeOptions = {
    cwd: testsRootPath,
};

const setupDb = async (pool) => {
    console.log("\n" + chalk("Start to set up the test database...", "blink"));
    await dockerCompose
        .upAll(dockerComposeOptions)
        .then((res) => {
            console.log(chalk("The Docker container is up!", "brightGreen"));
        })
        .catch((err) => {
            console.error("something went wrong", err.message);
            throw err;
        });
    await getPoolReady();
    console.log(chalk("Running database migrations...", "blink"));
    execSync(`npx drizzle-kit push`, { cwd: testsRootPath });
    console.log(chalk("Migrations completed successfully!", "brightGreen"));
    console.log(
        chalk(`Tests start at ${new Date().toString()}`, "brightWhite")
    );
    function getPoolReady() {
        return new Promise((resolve, reject) => {
            console.log(
                chalk("The database system is starting up...", "blink")
            );
            let retryCount = 0;
            const interval = setInterval(async () => {
                try {
                    const results = await pool.query("SELECT NOW()");
                    console.log(
                        chalk(
                            `The database is ready at ${results.rows[0].now}!`,
                            "brightGreen"
                        )
                    );
                    clearInterval(interval);
                    resolve(results);
                } catch (err) {
                    retryCount++;
                    if (retryCount > 20) {
                        clearInterval(interval);
                        reject(err);
                    }
                }
            }, 500);
        });
    }
};

const teardownDb = async (pool) => {
    try {
        var results = await pool.query("SELECT NOW()");
        await pool.end();
        console.log(chalk("Database closed.", "dim"));
        await dockerCompose.down(dockerComposeOptions);
        console.log(chalk("The Docker container is down.", "dim"));
    } catch (err) {
        console.error(err);
    } finally {
        console.log(
            chalk(
                "Tests end at " + results?.rows[0]?.now.toString(),
                "BrightWhite"
            )
        );
    }
};

module.exports = { setupDb, teardownDb };
