CREATE TABLE IF NOT EXISTS "idea_event_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"idea_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"description" text NOT NULL,
	"technologies" text NOT NULL,
	"contributors" text DEFAULT '',
	"is_built" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idea_event_metadata" ADD CONSTRAINT "idea_event_metadata_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idea_event_metadata" ADD CONSTRAINT "idea_event_metadata_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
