-- Create contributor_requests table for tracking contribution requests
CREATE TABLE IF NOT EXISTS "contributor_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"idea_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"requester_email" varchar(255) NOT NULL,
	"message" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_pending_request" UNIQUE("idea_id","event_id","requester_email","status")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributor_requests" ADD CONSTRAINT "contributor_requests_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributor_requests" ADD CONSTRAINT "contributor_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
