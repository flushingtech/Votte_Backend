import {
  pgTable,
  serial,
  varchar,
  date,
  timestamp,
  integer,
  foreignKey,
  text,
  boolean,
  doublePrecision,
  unique,
  time,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const events = pgTable("events", {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  eventDate: date("event_date").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  stage: integer().default(1),
  eventTime: time(),
  link: text(),
  currentSubStage: text("current_sub_stage").default("1"),
  imageUrl: text("image_url"),
  checkedIn: text("checked_in").default(""),
});

export const ideas = pgTable("ideas", {
  id: serial().primaryKey().notNull(),
  email: varchar({ length: 255 }).notNull(),
  idea: text().notNull(),
  description: text().notNull(),
  technologies: text().notNull(),
  likes: integer().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  eventId: text("event_id").notNull(), // ✅ now a comma-separated string
  isBuilt: boolean("is_built").default(false),
  stage: integer().default(1),
  averageScore: doublePrecision("average_score").default(0),
  contributors: text("contributors").default(""),
  imageUrl: text("image_url"),
});

export const likes = pgTable(
  "likes",
  {
    id: serial().primaryKey().notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    ideaId: integer("idea_id").notNull(),
    likedAt: timestamp("liked_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    likesIdeaIdFkey: foreignKey({
      columns: [table.ideaId],
      foreignColumns: [ideas.id],
      name: "likes_idea_id_fkey",
    }).onDelete("cascade"),
    uniqueUserLike: unique("unique_user_like").on(table.userEmail, table.ideaId),
  })
);

export const admin = pgTable("admin", {
  email: varchar({ length: 255 }).primaryKey().notNull(),
});

export const votes = pgTable(
  "votes",
  {
    id: serial().primaryKey().notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    ideaId: integer("idea_id").notNull(),
    eventId: integer("event_id").notNull(),
    voteType: varchar("vote_type", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    votesIdeaIdFkey: foreignKey({
      columns: [table.ideaId],
      foreignColumns: [ideas.id],
      name: "votes_idea_id_fkey",
    }).onDelete("cascade"),
    votesEventIdFkey: foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: "votes_event_id_fkey",
    }).onDelete("cascade"),
  })
);

export const results = pgTable(
  "results",
  {
    id: serial().primaryKey().notNull(),
    eventId: integer("event_id").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    winningIdeaId: integer("winning_idea_id").notNull(),
    votes: integer().default(0),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    resultsEventIdFkey: foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: "results_event_id_fkey",
    }).onDelete("cascade"),
    resultsWinningIdeaIdFkey: foreignKey({
      columns: [table.winningIdeaId],
      foreignColumns: [ideas.id],
      name: "results_winning_idea_id_fkey",
    }).onDelete("cascade"),
    uniqueEventCategory: unique("unique_event_category").on(table.eventId, table.category),
  })
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const ideaEventMetadata = pgTable("idea_event_metadata", {
  id: serial().primaryKey().notNull(),
  ideaId: integer("idea_id").notNull(),
  eventId: integer("event_id").notNull(),
  description: text("description").notNull(),
  technologies: text("technologies").notNull(),
  contributors: text("contributors").default(""),
  isBuilt: boolean("is_built").default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  ideaEventMetadataIdeaIdFkey: foreignKey({
    columns: [table.ideaId],
    foreignColumns: [ideas.id],
    name: "idea_event_metadata_idea_id_fkey"
  }).onDelete("cascade"),
  ideaEventMetadataEventIdFkey: foreignKey({
    columns: [table.eventId],
    foreignColumns: [events.id],
    name: "idea_event_metadata_event_id_fkey"
  }).onDelete("cascade"),
  uniqueIdeaEvent: unique("unique_idea_event").on(table.ideaId, table.eventId)
}));
