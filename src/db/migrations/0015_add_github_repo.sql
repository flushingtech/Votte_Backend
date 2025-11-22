-- Add github_repo column to ideas table for linking GitHub repositories
ALTER TABLE "ideas"
ADD COLUMN IF NOT EXISTS "github_repo" text;
