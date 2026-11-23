CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device_label" text NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "task_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"offset_minutes" integer,
	"custom_date" date,
	"custom_time" time,
	"sent_key" text,
	"snoozed_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_reminders_task_id_key" UNIQUE("task_id"),
	CONSTRAINT "task_reminders_kind_check" CHECK ("task_reminders"."kind" in ('none', 'at_due', 'before', 'custom')),
	CONSTRAINT "task_reminders_offset_check" CHECK (("task_reminders"."kind" = 'before' and "task_reminders"."offset_minutes" in (5, 10, 15, 30, 60, 120, 1440)) or ("task_reminders"."kind" <> 'before' and "task_reminders"."offset_minutes" is null)),
	CONSTRAINT "task_reminders_custom_check" CHECK (("task_reminders"."kind" = 'custom' and "task_reminders"."custom_date" is not null and "task_reminders"."custom_time" is not null) or ("task_reminders"."kind" <> 'custom' and "task_reminders"."custom_date" is null and "task_reminders"."custom_time" is null))
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminder_default" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminder_default_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminder_morning_time" time DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_start" time;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_end" time;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_owner_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_session_idx" ON "push_subscriptions" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_reminder_default_check" CHECK ("user_settings"."reminder_default" ~ '^(none|at_due|before:(5|10|15|30|60|120|1440))$');--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_quiet_hours_check" CHECK (("user_settings"."quiet_start" is null) = ("user_settings"."quiet_end" is null));