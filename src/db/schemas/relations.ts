import { relations } from "drizzle-orm/relations";
const { events, ideas, likes } = require("./schema");

export const ideasRelations = relations(ideas, ({ one, many }) => ({
    event: one(events, {
        fields: [ideas.eventId],
        references: [events.id],
    }),
    likes: many(likes),
}));

export const eventsRelations = relations(events, ({ many }) => ({
    ideas: many(ideas),
}));

export const likesRelations = relations(likes, ({ one }) => ({
    idea: one(ideas, {
        fields: [likes.ideaId],
        references: [ideas.id],
    }),
}));
