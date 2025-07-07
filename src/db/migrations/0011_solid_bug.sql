ALTER TABLE "ideas" DROP CONSTRAINT "ideas_event_id_fkey";
--> statement-breakpoint
ALTER TABLE "ideas" ALTER COLUMN "event_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ideas" ALTER COLUMN "event_id" SET NOT NULL;