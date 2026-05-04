CREATE TYPE "public"."calendar_provider_write_operation" AS ENUM('create_event', 'update_event', 'delete_event', 'publish_note_description');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider_write_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'conflict', 'skipped');--> statement-breakpoint
CREATE TABLE "calendar_provider_write_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"calendar_id" uuid,
	"event_id" uuid,
	"source_calendar_id" text NOT NULL,
	"source_event_id" text,
	"operation" "calendar_provider_write_operation" NOT NULL,
	"status" "calendar_provider_write_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"entry_point" text DEFAULT 'calendar' NOT NULL,
	"scope_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_patch" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"previous_etag" text,
	"provider_etag" text,
	"provider_updated_at" timestamp with time zone,
	"error_code" text,
	"error_summary" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_provider_write_audit" ADD CONSTRAINT "calendar_provider_write_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_provider_write_audit" ADD CONSTRAINT "calendar_provider_write_audit_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_provider_write_audit" ADD CONSTRAINT "calendar_provider_write_audit_calendar_id_calendar_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_provider_write_audit" ADD CONSTRAINT "calendar_provider_write_audit_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_provider_write_audit_user_created_idx" ON "calendar_provider_write_audit" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "calendar_provider_write_audit_user_event_created_idx" ON "calendar_provider_write_audit" USING btree ("user_id","event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_provider_write_audit_user_idempotency_unique" ON "calendar_provider_write_audit" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "calendar_provider_write_audit_user_status_created_idx" ON "calendar_provider_write_audit" USING btree ("user_id","status","created_at");