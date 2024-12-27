/** @type {import('jest').Config} */
const config = {
    globalSetup: "./src/tests/global-setup",
    globalTeardown: "./src/tests/global-teardown",
    setupFilesAfterEnv: ["./src/tests/setup-after-env-pool"],
};

module.exports = config;
