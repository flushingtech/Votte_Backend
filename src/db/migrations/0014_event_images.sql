-- Add image_url column to idea_event_metadata for event-specific images
ALTER TABLE "idea_event_metadata"
ADD COLUMN "image_url" text;
