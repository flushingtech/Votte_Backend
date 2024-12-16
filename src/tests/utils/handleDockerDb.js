const path = require("path");
const os = require("os");
const fs = require("fs");
const { exec } = require("child_process");
const dockerCompose = require("docker-compose");
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const chalk = require("../../devUtils/chalk");

const dockerComposeOptions = {
    cwd: path.join(__dirname, "../"),
};
const drizzlePath = path.join(__dirname, "../../../drizzle");
try {
    var isDrizzlePath =
        fs.existsSync(drizzlePath) && fs.statSync(drizzlePath).isDirectory();
} catch (err) {
    console.error(err);
    var isDrizzlePath = false;
}

const setupDb = async (pool) => {
    const db = drizzle(pool);
    console.log("\n" + chalk("Start to set up the test database...", "blink"));
    //Prepare the migrations folder.
    await new Promise((resolve, reject) => {
        exec("npx drizzle-kit generate", (error, _, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(new Error(stderr));
                return;
            }
            resolve();
        });
    });
    //Spin up the dockerized database.
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
    await migrate(db, {
        migrationsFolder: drizzlePath,
    });
    console.log(chalk("Migrations completed successfully!", "brightGreen"));
    console.log(
        chalk(`Tests start at ${new Date().toString()}`, "brightWhite")
    );
    function getPoolReady() {
        return new Promise((resolve) => {
            console.log(
                chalk("The database system is starting up...", "blink")
            );
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
                } catch (err) {}
            }, 500);
        });
    }
};

const teardownDb = async (pool) => {
    //Remove the migrations folder if it was not preexisting.
    if (isDrizzlePath !== true) {
        const command =
            (os.platform() === "win32" ? "rmdir /s /q " : "rm -rf ") +
            drizzlePath;
        exec(command, (error, _, stderr) => {
            if (error || stderr)
                console.warn(
                    "Failed to delete the Drizzle files. Please delete them manually."
                );
            if (error) {
                console.error(`Execution error: ${error}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(chalk(`Deleted the Drizzle files.`, "dim"));
        });
    }
    //Tear down the test database.
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
