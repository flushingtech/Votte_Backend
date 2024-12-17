import { defineConfig } from "drizzle-kit";
export default defineConfig({
    schema: "../db/schemas/**/*.ts",
    dialect: "postgresql",
    dbCredentials: {
        host: "localhost",
        port: 5433,
        user: "postgres_test",
        password: "mysecretpassword_test",
        database: "mydatabase_test",
        ssl: false,
    },
});
