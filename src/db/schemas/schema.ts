const {
    pgTable,
    varchar,
    serial,
    date,
    timestamp,
    foreignKey,
    text,
    integer,
    boolean,
} = require("drizzle-orm/pg-core");
const { sql } = require("drizzle-orm");

const admin = pgTable("admin", {
    email: varchar({ length: 255 }).primaryKey().notNull(),
});

const events = pgTable("events", {
    id: serial().primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    eventDate: date("event_date").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default(
        sql`CURRENT_TIMESTAMP`
    ),
});

const ideas = pgTable(
    "ideas",
    {
        id: serial().primaryKey().notNull(),
        email: varchar({ length: 255 }).notNull(),
        idea: text().notNull(),
        description: text().notNull(),
        technologies: text().notNull(),
        isBuilt: boolean("is_built").default(false),
        likes: integer().default(0),
        createdAt: timestamp("created_at", { mode: "string" }).default(
            sql`CURRENT_TIMESTAMP`
        ),
        updatedAt: timestamp("updated_at", { mode: "string" }),
        eventId: integer("event_id"),
    },
    (table) => {
        return {
            ideasEventIdFkey: foreignKey({
                columns: [table.eventId],
                foreignColumns: [events.id],
                name: "ideas_event_id_fkey",
            }).onDelete("cascade"),
        };
    }
);

const likes = pgTable(
    "likes",
    {
        id: serial().primaryKey().notNull(),
        userEmail: varchar("user_email", { length: 255 }).notNull(),
        ideaId: integer("idea_id").notNull(),
        likedAt: timestamp("liked_at", { mode: "string" }).default(
            sql`CURRENT_TIMESTAMP`
        ),
    },
    (table) => {
        return {
            likesIdeaIdFkey: foreignKey({
                columns: [table.ideaId],
                foreignColumns: [ideas.id],
                name: "likes_idea_id_fkey",
            }).onDelete("cascade"),
        };
    }
);

module.exports = { admin, likes, events, ideas };
