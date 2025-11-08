-- Add unique constraint on idea_event_metadata to prevent duplicate entries
ALTER TABLE "idea_event_metadata"
ADD CONSTRAINT "unique_idea_event" UNIQUE("idea_id", "event_id");
