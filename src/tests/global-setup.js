const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.test") });
const testPool = require(path.join(__dirname, "../../db"));

module.exports = async () => {
    globalThis.__POOL__ = testPool;
    await require("./utils/handleDockerDb").setupDb(globalThis.__POOL__);
};
