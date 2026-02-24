DO $$ BEGIN
  ALTER TABLE "events" ADD COLUMN "event_type" varchar(50) DEFAULT 'hackathon';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
