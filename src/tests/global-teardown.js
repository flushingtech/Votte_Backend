module.exports = async () => {
    await require("./utils/handleDockerDb").teardownDb(globalThis.__POOL__);
};
