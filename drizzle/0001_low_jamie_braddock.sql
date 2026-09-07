CREATE INDEX "account_user_provider_idx" ON "account" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE INDEX "sale_created_at_idx" ON "sale" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sale_line_sale_id_idx" ON "sale_line" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_line_product_id_idx" ON "sale_line" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movement_product_occurred_idx" ON "stock_movement" USING btree ("product_id","occurred_at");