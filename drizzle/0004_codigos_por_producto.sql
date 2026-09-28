ALTER TYPE "public"."movement_type" ADD VALUE 'purchase';--> statement-breakpoint
CREATE TABLE "product_barcode" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_barcode_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DROP INDEX "product_barcode_unique";--> statement-breakpoint
ALTER TABLE "stock_movement" ADD COLUMN "barcode_id" text;--> statement-breakpoint
ALTER TABLE "product_barcode" ADD CONSTRAINT "product_barcode_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_barcode_product_id_idx" ON "product_barcode" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_barcode_id_product_barcode_id_fk" FOREIGN KEY ("barcode_id") REFERENCES "public"."product_barcode"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- D-010. Cada producto con código pasa a tener ese código como el primero de su lista, y cada movimiento
-- suyo dice que fue de ese código: antes solo podía ser de ese. No cambia ninguna cantidad, tipo ni
-- fecha del libro. El id es un UUIDv7 armado con la fecha del producto, para que ordenen igual.
INSERT INTO "product_barcode" ("id", "product_id", "code", "created_at")
SELECT
	(lpad(to_hex(floor(extract(epoch FROM "created_at") * 1000)::bigint), 12, '0')
		|| '7' || substr(md5(gen_random_uuid()::text), 1, 3)
		|| to_hex(8 + floor(random() * 4)::int) || substr(md5(gen_random_uuid()::text), 1, 15))::uuid::text,
	"id", "barcode", "created_at"
FROM "product"
WHERE "barcode" IS NOT NULL;--> statement-breakpoint
UPDATE "stock_movement" AS m
SET "barcode_id" = b."id"
FROM "product_barcode" AS b
WHERE b."product_id" = m."product_id";--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "barcode";