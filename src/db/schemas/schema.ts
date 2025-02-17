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
  check,
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
});


export const ideas = pgTable(
  "ideas",
  {
    id: serial().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    idea: text().notNull(),
    description: text().notNull(),
    technologies: text().notNull(),
    likes: integer().default(0),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
    eventId: integer("event_id"),
    isBuilt: boolean("is_built").default(false),
    stage: integer().default(1),
    averageScore: doublePrecision("average_score").default(0),
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

export const likes = pgTable(
  "likes",
  {
    id: serial().primaryKey().notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    ideaId: integer("idea_id").notNull(),
    likedAt: timestamp("liked_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      likesIdeaIdFkey: foreignKey({
        columns: [table.ideaId],
        foreignColumns: [ideas.id],
        name: "likes_idea_id_fkey",
      }).onDelete("cascade"),
      uniqueUserLike: unique("unique_user_like").on(table.userEmail, table.ideaId), // Ensure unique likes
    };
  }
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
    eventId: integer("event_id").notNull(),  // Added missing event_id
    voteType: varchar("vote_type", { length: 50 }).notNull(), // Added missing vote_type
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`), // Added updatedAt
  },
  (table) => {
    return {
      votesIdeaIdFkey: foreignKey({
        columns: [table.ideaId],
        foreignColumns: [ideas.id],
        name: "votes_idea_id_fkey",
      }).onDelete("cascade"),
      votesEventIdFkey: foreignKey({
        columns: [table.eventId],
        foreignColumns: [events.id],
        name: "votes_event_id_fkey",
      }).onDelete("cascade"), // Ensure cascading delete for event_id
    };
  }
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
  (table) => {
    return {
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
    };
  }
);


