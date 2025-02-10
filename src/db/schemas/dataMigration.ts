import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);
async function main() {
	const existingAdmin = await db
		.select()
		.from(schema.admin)
		.where(sql`email = 'tkhattab1999@gmail.com'`)
		.limit(1);

	if (existingAdmin.length === 0) {
		await db.insert(schema.admin).values({ email: "tkhattab1999@gmail.com" });
	} else {
		console.log("Admin already exists in the database.");
	}
}

main();
