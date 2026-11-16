ALTER TABLE "user_settings" ADD COLUMN "journal_pin_length" smallint;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "journal_pin_lockouts" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "journal_relock" text DEFAULT 'leave' NOT NULL;