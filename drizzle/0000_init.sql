CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `address` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`street` text NOT NULL,
	`house` text NOT NULL,
	`apartment` text,
	`comment` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `address_user_idx` ON `address` (`user_id`);--> statement-breakpoint
CREATE TABLE `collection_fragrance` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`desc_ru` text,
	`desc_kk` text,
	`desc_en` text,
	`items_json` text NOT NULL,
	`concentration_pct` integer DEFAULT 20 NOT NULL,
	`event_slug` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concentration` (
	`id` text PRIMARY KEY NOT NULL,
	`pct` integer NOT NULL,
	`surcharge_kzt` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concentration_pct_unique` ON `concentration` (`pct`);--> statement-breakpoint
CREATE TABLE `delivery_method` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_ru` text NOT NULL,
	`name_kk` text NOT NULL,
	`name_en` text NOT NULL,
	`price_kzt` integer,
	`requires_address` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `delivery_method_code_unique` ON `delivery_method` (`code`);--> statement-breakpoint
CREATE TABLE `event_category` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_ru` text NOT NULL,
	`name_kk` text NOT NULL,
	`name_en` text NOT NULL,
	`recommended_families` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_category_slug_unique` ON `event_category` (`slug`);--> statement-breakpoint
CREATE TABLE `formula_item` (
	`id` text PRIMARY KEY NOT NULL,
	`formula_id` text NOT NULL,
	`note_id` text NOT NULL,
	`parts` integer NOT NULL,
	`tier` text NOT NULL,
	FOREIGN KEY (`formula_id`) REFERENCES `formula`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `formula` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`event_slug` text,
	`concentration_pct` integer DEFAULT 20 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `formula_user_idx` ON `formula` (`user_id`);--> statement-breakpoint
CREATE TABLE `incompatible_pair` (
	`id` text PRIMARY KEY NOT NULL,
	`note_a` text NOT NULL,
	`note_b` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pair_uq` ON `incompatible_pair` (`note_a`,`note_b`);--> statement-breakpoint
CREATE TABLE `inquiry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`message` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `niche_fragrance` (
	`id` text PRIMARY KEY NOT NULL,
	`brand` text NOT NULL,
	`name` text NOT NULL,
	`notes` text NOT NULL,
	`other_notes` text DEFAULT '' NOT NULL,
	`accords` text DEFAULT '' NOT NULL,
	`image_url` text,
	`image_rights_confirmed` integer DEFAULT false NOT NULL,
	`source_url` text,
	`verified` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `note` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`name_ru` text NOT NULL,
	`name_kk` text NOT NULL,
	`name_en` text NOT NULL,
	`family` text NOT NULL,
	`material` text NOT NULL,
	`supplier` text,
	`safety_note` text,
	`documents` text,
	`desc_ru` text,
	`desc_kk` text,
	`desc_en` text,
	`tier` text,
	`tier_verified` integer DEFAULT false NOT NULL,
	`intensity` integer,
	`is_fixed` integer DEFAULT false NOT NULL,
	`fixed_parts` integer,
	`min_parts` integer DEFAULT 1 NOT NULL,
	`max_parts` integer DEFAULT 10 NOT NULL,
	`max_share_pct` real,
	`perfumer_verified` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_slug_unique` ON `note` (`slug`);--> statement-breakpoint
CREATE TABLE `order_event` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`formula_id` text,
	`formula_name` text NOT NULL,
	`formula_json` text NOT NULL,
	`volume_ml` integer NOT NULL,
	`concentration_pct` integer NOT NULL,
	`unit_price_kzt` integer NOT NULL,
	`qty` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'PENDING_PAYMENT' NOT NULL,
	`delivery_code` text NOT NULL,
	`payment_code` text NOT NULL,
	`address_json` text,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`subtotal_kzt` integer NOT NULL,
	`discount_kzt` integer DEFAULT 0 NOT NULL,
	`delivery_fee_kzt` integer NOT NULL,
	`total_kzt` integer NOT NULL,
	`payment_provider` text,
	`payment_ref` text,
	`paid_at` integer,
	`consent_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_number_unique` ON `order` (`number`);--> statement-breakpoint
CREATE INDEX `order_user_idx` ON `order` (`user_id`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_ru` text NOT NULL,
	`name_kk` text NOT NULL,
	`name_en` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_code_unique` ON `payment_method` (`code`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text,
	`password_hash` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`locale` text DEFAULT 'ru' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `volume` (
	`id` text PRIMARY KEY NOT NULL,
	`ml` integer NOT NULL,
	`price_kzt` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `volume_ml_unique` ON `volume` (`ml`);