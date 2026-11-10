CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"week_starts_on" smallint DEFAULT 1 NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"locale" text DEFAULT 'en-IN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_week_starts_on_check" CHECK ("user_settings"."week_starts_on" between 1 and 7),
	CONSTRAINT "user_settings_theme_check" CHECK ("user_settings"."theme" in ('system', 'light', 'dark')),
	CONSTRAINT "user_settings_currency_check" CHECK ("user_settings"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"icon" text,
	"description" text,
	"target_date" date,
	"is_inbox" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"position" text NOT NULL,
	"view_mode" text DEFAULT 'list' NOT NULL,
	"view_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lists_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "lists_name_check" CHECK (char_length("lists"."name") between 1 and 100),
	CONSTRAINT "lists_view_mode_check" CHECK ("lists"."view_mode" in ('list', 'board')),
	CONSTRAINT "lists_inbox_not_archived_check" CHECK (not ("lists"."is_inbox" and "lists"."is_archived"))
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sections_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "sections_name_check" CHECK (char_length("sections"."name") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"section_id" uuid,
	"parent_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	"due_date" date,
	"due_time" time,
	"recurrence_rule" text,
	"recurrence_mode" text DEFAULT 'fixed' NOT NULL,
	"recurrence_origin_id" uuid,
	"completed_at" timestamp with time zone,
	"position" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(notes, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "tasks_title_check" CHECK (char_length("tasks"."title") between 1 and 500),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('open', 'done')),
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" between 0 and 3),
	CONSTRAINT "tasks_recurrence_mode_check" CHECK ("tasks"."recurrence_mode" in ('fixed', 'after_completion')),
	CONSTRAINT "tasks_due_time_needs_date_check" CHECK ("tasks"."due_time" is null or "tasks"."due_date" is not null),
	CONSTRAINT "tasks_completed_at_matches_status_check" CHECK (("tasks"."status" = 'done') = ("tasks"."completed_at" is not null)),
	CONSTRAINT "tasks_not_own_parent_check" CHECK ("tasks"."parent_id" is null or "tasks"."parent_id" <> "tasks"."id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "tags_name_check" CHECK (char_length("tags"."name") between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tags_pkey" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_list_owner_fk" FOREIGN KEY ("list_id","user_id") REFERENCES "public"."lists"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_tasks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurrence_origin_id_tasks_id_fk" FOREIGN KEY ("recurrence_origin_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_owner_fk" FOREIGN KEY ("list_id","user_id") REFERENCES "public"."lists"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_owner_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_owner_fk" FOREIGN KEY ("tag_id","user_id") REFERENCES "public"."tags"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lists_user_position_idx" ON "lists" USING btree ("user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_one_inbox_per_user_idx" ON "lists" USING btree ("user_id") WHERE "lists"."is_inbox";--> statement-breakpoint
CREATE INDEX "sections_user_list_position_idx" ON "sections" USING btree ("user_id","list_id","position");--> statement-breakpoint
CREATE INDEX "tasks_user_list_position_idx" ON "tasks" USING btree ("user_id","list_id","position");--> statement-breakpoint
CREATE INDEX "tasks_user_due_date_open_idx" ON "tasks" USING btree ("user_id","due_date") WHERE "tasks"."deleted_at" is null and "tasks"."status" = 'open';--> statement-breakpoint
CREATE INDEX "tasks_search_idx" ON "tasks" USING gin ("search");--> statement-breakpoint
CREATE INDEX "tasks_user_completed_at_idx" ON "tasks" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "tasks_parent_idx" ON "tasks" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_lower_idx" ON "tags" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "task_tags_user_tag_idx" ON "task_tags" USING btree ("user_id","tag_id");