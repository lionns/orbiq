CREATE TYPE "public"."product_event_type" AS ENUM('price_change', 'deactivated', 'reactivated');--> statement-breakpoint
CREATE TABLE "product_event" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"type" "product_event_type" NOT NULL,
	"previous_price" integer,
	"new_price" integer,
	"user_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_event_price_change_needs_prices" CHECK (("product_event"."type" <> 'price_change' and "product_event"."previous_price" is null and "product_event"."new_price" is null)
        or ("product_event"."type" = 'price_change' and "product_event"."previous_price" is not null and "product_event"."new_price" is not null
            and "product_event"."previous_price" <> "product_event"."new_price"))
);
--> statement-breakpoint
ALTER TABLE "product_event" ADD CONSTRAINT "product_event_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_event" ADD CONSTRAINT "product_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_event_product_occurred_idx" ON "product_event" USING btree ("product_id","occurred_at");