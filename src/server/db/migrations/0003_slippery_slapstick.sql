ALTER TABLE "customers" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "last_name" DROP DEFAULT;