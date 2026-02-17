-- Add player betting settings columns to users table
-- These are managed by master agents only

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bookmakerDelay" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessionDelay" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "matchDelay" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bookmakerMinStack" DECIMAL(12, 2) NOT NULL DEFAULT 100;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bookmakerMaxStack" DECIMAL(12, 2) NOT NULL DEFAULT 200000;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "betDeleteAllowed" BOOLEAN NOT NULL DEFAULT false;
