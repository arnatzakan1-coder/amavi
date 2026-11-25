CREATE TABLE `booking` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`user_id` text NOT NULL,
	`perfumer_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`status` text DEFAULT 'PENDING_DEPOSIT' NOT NULL,
	`volume_ml` integer NOT NULL,
	`deposit_kzt` integer NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`questionnaire_json` text NOT NULL,
	`staff_note` text,
	`consent_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`perfumer_id`) REFERENCES `perfumer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_number_unique` ON `booking` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_slot_uq` ON `booking` (`perfumer_id`,`starts_at`) WHERE status <> 'CANCELLED';--> statement-breakpoint
CREATE INDEX `booking_user_idx` ON `booking` (`user_id`);--> statement-breakpoint
CREATE TABLE `perfumer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio_ru` text,
	`bio_kk` text,
	`bio_en` text,
	`user_id` text,
	`work_days` text DEFAULT '1,2,3,4,5,6,7' NOT NULL,
	`start_time` text DEFAULT '10:00' NOT NULL,
	`end_time` text DEFAULT '21:00' NOT NULL,
	`days_off` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`name_verified` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE `formula` ADD `created_by_id` text;--> statement-breakpoint
ALTER TABLE `formula` ADD `booking_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone` text;