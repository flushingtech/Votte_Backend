-- Add social link columns to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "github_url" text;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "linkedin_url" text;
