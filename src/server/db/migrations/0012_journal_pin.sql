ALTER TABLE "user_settings" ADD COLUMN "journal_pin_hash" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "journal_pin_failures" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "journal_pin_locked_until" timestamp with time zone;