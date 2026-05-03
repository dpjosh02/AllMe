CREATE TYPE "public"."calendar_event_review_status" AS ENUM('none', 'needs_prep', 'done', 'ignored');--> statement-breakpoint
CREATE TABLE "calendar_event_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"linked_note_id" uuid,
	"review_status" "calendar_event_review_status" DEFAULT 'none' NOT NULL,
	"local_note" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_annotations" ADD CONSTRAINT "calendar_event_annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_annotations" ADD CONSTRAINT "calendar_event_annotations_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_annotations" ADD CONSTRAINT "calendar_event_annotations_linked_note_id_notes_id_fk" FOREIGN KEY ("linked_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_annotations_user_event_unique" ON "calendar_event_annotations" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "calendar_event_annotations_user_review_status_idx" ON "calendar_event_annotations" USING btree ("user_id","review_status");--> statement-breakpoint
CREATE INDEX "calendar_event_annotations_user_linked_note_idx" ON "calendar_event_annotations" USING btree ("user_id","linked_note_id");