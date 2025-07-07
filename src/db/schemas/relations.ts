import { relations } from "drizzle-orm/relations";
import { events, ideas, likes, votes, results } from "./schema"; // ✅ Ensure results is imported

export const ideasRelations = relations(ideas, ({ many }) => ({
  likes: many(likes),
  votes: many(votes),
  results: many(results),
}));


export const eventsRelations = relations(events, ({ many }) => ({
  ideas: many(ideas),
  results: many(results), // ✅ FIXED: No need for `fields` and `references` in `many()`
}));

export const likesRelations = relations(likes, ({ one }) => ({
  idea: one(ideas, {
    fields: [likes.ideaId],
    references: [ideas.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  idea: one(ideas, {
    fields: [votes.ideaId],
    references: [ideas.id],
  }),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  event: one(events, {
    fields: [results.eventId],
    references: [events.id],
  }),
  winningIdea: one(ideas, { // ✅ FIXED: No `fields` or `references` here
    fields: [results.winningIdeaId],
    references: [ideas.id],
  }),
}));
