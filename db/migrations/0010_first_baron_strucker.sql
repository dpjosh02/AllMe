CREATE TABLE "calendar_event_note_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"event_id" uuid,
	"calendar_id" uuid,
	"scope" text DEFAULT 'event_instance' NOT NULL,
	"source_ical_uid" text,
	"recurring_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_note_links" ADD CONSTRAINT "calendar_event_note_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_note_links" ADD CONSTRAINT "calendar_event_note_links_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_note_links" ADD CONSTRAINT "calendar_event_note_links_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_note_links" ADD CONSTRAINT "calendar_event_note_links_calendar_id_calendar_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_event_note_links_user_event_idx" ON "calendar_event_note_links" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "calendar_event_note_links_user_note_idx" ON "calendar_event_note_links" USING btree ("user_id","note_id");--> statement-breakpoint
CREATE INDEX "calendar_event_note_links_user_series_idx" ON "calendar_event_note_links" USING btree ("user_id","calendar_id","source_ical_uid");