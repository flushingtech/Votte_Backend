import { pgTable, varchar, serial, date, timestamp, foreignKey, text, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const admin = pgTable("admin", {
	email: varchar({ length: 255 }).primaryKey().notNull(),
});

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	eventDate: date("event_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const ideas = pgTable("ideas", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	idea: text().notNull(),
	description: text().notNull(),
	technologies: text().notNull(),
	likes: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	eventId: integer("event_id"),
}, (table) => {
	return {
		ideasEventIdFkey: foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "ideas_event_id_fkey"
		}).onDelete("cascade"),
	}
});

export const likes = pgTable("likes", {
	id: serial().primaryKey().notNull(),
	userEmail: varchar("user_email", { length: 255 }).notNull(),
	ideaId: integer("idea_id").notNull(),
	likedAt: timestamp("liked_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
	return {
		likesIdeaIdFkey: foreignKey({
			columns: [table.ideaId],
			foreignColumns: [ideas.id],
			name: "likes_idea_id_fkey"
		}).onDelete("cascade"),
	}
});
