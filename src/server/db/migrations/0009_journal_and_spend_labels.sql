CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"mood" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_user_date_unique" UNIQUE("user_id","entry_date"),
	CONSTRAINT "journal_entries_body_check" CHECK (char_length("journal_entries"."body") <= 20000),
	CONSTRAINT "journal_entries_mood_check" CHECK ("journal_entries"."mood" is null or "journal_entries"."mood" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "finance_entries" ADD COLUMN "spend_label" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_spend_label_check" CHECK ("finance_entries"."spend_label" is null or ("finance_entries"."kind" = 'expense' and "finance_entries"."spend_label" in ('need', 'want')));