DROP INDEX "finance_connections_user_provider_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "finance_connections_user_provider_unique" ON "finance_connections" USING btree ("user_id","provider");