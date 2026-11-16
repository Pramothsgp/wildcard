CREATE TABLE "game_event" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"room_code" text NOT NULL,
	"seq" integer NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"actor_id" text,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" text NOT NULL,
	"round" integer NOT NULL,
	"user_id" text NOT NULL,
	"points" integer NOT NULL,
	"won" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"host_id" text NOT NULL,
	"mode" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "room_member" (
	"room_code" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	CONSTRAINT "room_member_room_code_user_id_pk" PRIMARY KEY("room_code","user_id")
);
--> statement-breakpoint
ALTER TABLE "game_event" ADD CONSTRAINT "game_event_room_code_room_code_fk" FOREIGN KEY ("room_code") REFERENCES "public"."room"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_room_code_room_code_fk" FOREIGN KEY ("room_code") REFERENCES "public"."room"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_room_code_room_code_fk" FOREIGN KEY ("room_code") REFERENCES "public"."room"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_event_room_seq_idx" ON "game_event" USING btree ("room_code","seq");--> statement-breakpoint
CREATE INDEX "result_user_idx" ON "result" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "room_status_idx" ON "room" USING btree ("status");--> statement-breakpoint
CREATE INDEX "room_member_user_idx" ON "room_member" USING btree ("user_id");