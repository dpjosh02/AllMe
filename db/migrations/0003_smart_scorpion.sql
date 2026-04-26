CREATE TYPE "public"."finance_category_assignment_source" AS ENUM('manual', 'rule', 'system', 'uncategorized');--> statement-breakpoint
CREATE TABLE "finance_category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"match_logic" text DEFAULT 'all' NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transaction_category_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid,
	"source" "finance_category_assignment_source" DEFAULT 'uncategorized' NOT NULL,
	"matched_rule_id" uuid,
	"confidence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_user_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"icon" text,
	"parent_id" uuid,
	"include_in_spending" boolean DEFAULT true NOT NULL,
	"include_in_income" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_category_rules" ADD CONSTRAINT "finance_category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_category_rules" ADD CONSTRAINT "finance_category_rules_category_id_finance_user_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_user_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transaction_category_assignments" ADD CONSTRAINT "finance_transaction_category_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transaction_category_assignments" ADD CONSTRAINT "finance_transaction_category_assignments_transaction_id_finance_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."finance_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transaction_category_assignments" ADD CONSTRAINT "finance_transaction_category_assignments_category_id_finance_user_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_user_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transaction_category_assignments" ADD CONSTRAINT "finance_transaction_category_assignments_matched_rule_id_finance_category_rules_id_fk" FOREIGN KEY ("matched_rule_id") REFERENCES "public"."finance_category_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_user_categories" ADD CONSTRAINT "finance_user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finance_category_rules_user_category_name_unique" ON "finance_category_rules" USING btree ("user_id","category_id","name");--> statement-breakpoint
CREATE INDEX "finance_category_rules_user_active_priority_idx" ON "finance_category_rules" USING btree ("user_id","is_active","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_transaction_category_assignments_user_transaction_unique" ON "finance_transaction_category_assignments" USING btree ("user_id","transaction_id");--> statement-breakpoint
CREATE INDEX "finance_transaction_category_assignments_user_category_idx" ON "finance_transaction_category_assignments" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_user_categories_user_slug_unique" ON "finance_user_categories" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "finance_user_categories_user_sort_idx" ON "finance_user_categories" USING btree ("user_id","sort_order");