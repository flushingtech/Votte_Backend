-- Add featured column to ideas table
ALTER TABLE "ideas"
ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false;
