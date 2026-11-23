CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"audio_seconds" integer DEFAULT 0 NOT NULL,
	"web_searches" integer DEFAULT 0 NOT NULL,
	"plan_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_feature_check" CHECK ("ai_usage"."feature" in ('voice_transcribe', 'voice_understand', 'plan_questions', 'plan_followups', 'plan_make', 'plan_more', 'plan_links'))
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"goal" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"step" text,
	"start_date" date,
	"end_date" date,
	"basics" jsonb,
	"questions" jsonb,
	"answers" jsonb,
	"followups" jsonb,
	"draft" jsonb,
	"summary" text,
	"phases" jsonb,
	"resources" jsonb,
	"list_id" uuid,
	"list_created" boolean DEFAULT false NOT NULL,
	"trashed_task_ids" jsonb,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_title_check" CHECK (char_length("plans"."title") between 1 and 80),
	CONSTRAINT "plans_goal_check" CHECK (char_length("plans"."goal") <= 1000),
	CONSTRAINT "plans_status_check" CHECK ("plans"."status" in ('draft', 'active', 'done', 'archived')),
	CONSTRAINT "plans_step_check" CHECK ("plans"."step" is null or "plans"."step" in ('goal', 'basics', 'questions', 'followups', 'making', 'review'))
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "usd_to_inr" integer DEFAULT 8500 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "plan_phase" text;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_user_created_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_plan_idx" ON "ai_usage" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plans_user_status_idx" ON "plans" USING btree ("user_id","status") WHERE "plans"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_plan_idx" ON "tasks" USING btree ("user_id","plan_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_usd_to_inr_check" CHECK ("user_settings"."usd_to_inr" between 100 and 100000);