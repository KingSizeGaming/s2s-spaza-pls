CREATE TYPE "public"."link_status" AS ENUM('VALID', 'USED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('REGISTRATION', 'PREDICTION');--> statement-breakpoint
CREATE TYPE "public"."user_state" AS ENUM('UNKNOWN', 'PENDING_REGISTRATION', 'ACTIVE');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_number" text NOT NULL,
	"week_id" text NOT NULL,
	"link_token" text NOT NULL,
	"picks" jsonb NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"type" "link_type" NOT NULL,
	"wa_number" text NOT NULL,
	"week_id" text,
	"status" "link_status" DEFAULT 'VALID' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaza_sids" (
	"sid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_number" text NOT NULL,
	"state" "user_state" DEFAULT 'UNKNOWN' NOT NULL,
	"home_sid" text,
	"leaderboard_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_token" text NOT NULL,
	"issuing_sid" text NOT NULL,
	"week_id" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by_wa_number" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_home_sid_spaza_sids_sid_fk" FOREIGN KEY ("home_sid") REFERENCES "public"."spaza_sids"("sid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_issuing_sid_spaza_sids_sid_fk" FOREIGN KEY ("issuing_sid") REFERENCES "public"."spaza_sids"("sid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_wa_week_uq" ON "entries" USING btree ("wa_number","week_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entries_link_token_uq" ON "entries" USING btree ("link_token");--> statement-breakpoint
CREATE INDEX "entries_wa_week_idx" ON "entries" USING btree ("wa_number","week_id");--> statement-breakpoint
CREATE INDEX "entries_link_token_idx" ON "entries" USING btree ("link_token");--> statement-breakpoint
CREATE INDEX "entries_submitted_at_idx" ON "entries" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "links_token_uq" ON "links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "links_wa_number_idx" ON "links" USING btree ("wa_number");--> statement-breakpoint
CREATE INDEX "links_week_id_idx" ON "links" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "links_status_idx" ON "links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "links_type_idx" ON "links" USING btree ("type");--> statement-breakpoint
CREATE INDEX "links_expires_at_idx" ON "links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "spaza_sids_is_active_idx" ON "spaza_sids" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "spaza_sids_name_idx" ON "spaza_sids" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wa_number_uq" ON "users" USING btree ("wa_number");--> statement-breakpoint
CREATE UNIQUE INDEX "users_leaderboard_id_uq" ON "users" USING btree ("leaderboard_id");--> statement-breakpoint
CREATE INDEX "users_state_idx" ON "users" USING btree ("state");--> statement-breakpoint
CREATE INDEX "users_home_sid_idx" ON "users" USING btree ("home_sid");--> statement-breakpoint
CREATE UNIQUE INDEX "vouchers_voucher_token_uq" ON "vouchers" USING btree ("voucher_token");--> statement-breakpoint
CREATE INDEX "vouchers_issuing_sid_idx" ON "vouchers" USING btree ("issuing_sid");--> statement-breakpoint
CREATE INDEX "vouchers_week_id_idx" ON "vouchers" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "vouchers_is_used_idx" ON "vouchers" USING btree ("is_used");