CREATE TABLE "finance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"entry_date" date NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"notes" text,
	"payment_method" text,
	"lender" text,
	"emi_type" text,
	"status" text,
	"paid_on" date,
	"platform" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_entries_kind_check" CHECK ("finance_entries"."kind" in ('income', 'emi', 'expense', 'investment')),
	CONSTRAINT "finance_entries_title_check" CHECK (char_length("finance_entries"."title") between 1 and 200),
	CONSTRAINT "finance_entries_category_check" CHECK (char_length("finance_entries"."category") between 1 and 60),
	CONSTRAINT "finance_entries_amount_check" CHECK ("finance_entries"."amount_minor" > 0 and "finance_entries"."amount_minor" <= 100000000000),
	CONSTRAINT "finance_entries_notes_check" CHECK ("finance_entries"."notes" is null or char_length("finance_entries"."notes") <= 1000),
	CONSTRAINT "finance_entries_payment_method_only_expense_check" CHECK ("finance_entries"."kind" = 'expense' or "finance_entries"."payment_method" is null),
	CONSTRAINT "finance_entries_emi_columns_only_emi_check" CHECK ("finance_entries"."kind" = 'emi' or ("finance_entries"."lender" is null and "finance_entries"."emi_type" is null and "finance_entries"."status" is null and "finance_entries"."paid_on" is null)),
	CONSTRAINT "finance_entries_platform_only_investment_check" CHECK ("finance_entries"."kind" = 'investment' or "finance_entries"."platform" is null),
	CONSTRAINT "finance_entries_emi_has_status_check" CHECK ("finance_entries"."kind" <> 'emi' or "finance_entries"."status" is not null),
	CONSTRAINT "finance_entries_paid_on_needs_paid_check" CHECK ("finance_entries"."paid_on" is null or "finance_entries"."status" = 'paid')
);
--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "finance_entries_user_kind_date_idx" ON "finance_entries" USING btree ("user_id","kind","entry_date") WHERE "finance_entries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "finance_entries_user_deleted_idx" ON "finance_entries" USING btree ("user_id","deleted_at");