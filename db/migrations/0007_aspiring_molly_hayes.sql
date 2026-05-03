CREATE TYPE "public"."calendar_connection_status" AS ENUM('active', 'reauthorization_required', 'disabled', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_kind" AS ENUM('full', 'incremental', 'recovery_full');--> statement-breakpoint
CREATE TABLE "calendar_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"source_calendar_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"timezone" text,
	"color" text,
	"access_role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_selected" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"sync_token" text,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"account_email" text,
	"display_name" text NOT NULL,
	"status" "calendar_connection_status" DEFAULT 'active' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sync_token" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"source_event_id" text NOT NULL,
	"source_ical_uid" text,
	"recurring_event_id" text,
	"original_start_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"status" "calendar_event_status" DEFAULT 'confirmed' NOT NULL,
	"visibility" text,
	"transparency" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"start_date" date,
	"end_date" date,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"timezone" text,
	"html_link" text,
	"etag" text,
	"provider_updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"calendar_id" uuid,
	"source_type" text DEFAULT 'google_calendar' NOT NULL,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"sync_kind" "calendar_sync_kind" NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"window_start" timestamp with time zone,
	"window_end" timestamp with time zone,
	"events_scanned" integer DEFAULT 0 NOT NULL,
	"events_inserted" integer DEFAULT 0 NOT NULL,
	"events_updated" integer DEFAULT 0 NOT NULL,
	"events_cancelled" integer DEFAULT 0 NOT NULL,
	"events_skipped" integer DEFAULT 0 NOT NULL,
	"next_sync_token_written" boolean DEFAULT false NOT NULL,
	"error_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_calendars" ADD CONSTRAINT "calendar_calendars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_calendars" ADD CONSTRAINT "calendar_calendars_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_id_calendar_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD CONSTRAINT "calendar_sync_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD CONSTRAINT "calendar_sync_runs_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD CONSTRAINT "calendar_sync_runs_calendar_id_calendar_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_calendars_source_calendar_unique" ON "calendar_calendars" USING btree ("user_id","connection_id","source_calendar_id");--> statement-breakpoint
CREATE INDEX "calendar_calendars_user_visibility_idx" ON "calendar_calendars" USING btree ("user_id","is_selected","is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_provider_unique" ON "calendar_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "calendar_connections_user_status_idx" ON "calendar_connections" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_source_event_unique" ON "calendar_events" USING btree ("user_id","calendar_id","source_event_id");--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_at_idx" ON "calendar_events" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_date_idx" ON "calendar_events" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "calendar_events_user_status_idx" ON "calendar_events" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "calendar_events_user_ical_uid_idx" ON "calendar_events" USING btree ("user_id","source_ical_uid");--> statement-breakpoint
CREATE INDEX "calendar_sync_runs_user_status_idx" ON "calendar_sync_runs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "calendar_sync_runs_user_connection_created_idx" ON "calendar_sync_runs" USING btree ("user_id","connection_id","created_at");--> statement-breakpoint
CREATE INDEX "calendar_sync_runs_user_calendar_created_idx" ON "calendar_sync_runs" USING btree ("user_id","calendar_id","created_at");