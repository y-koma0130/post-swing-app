CREATE TABLE `coach_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`monthly_capacity` integer NOT NULL,
	`stripe_account_id` text,
	`charges_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_profile_slug_unique` ON `coach_profile` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `coach_profile_stripeAccountId_unique` ON `coach_profile` (`stripe_account_id`);--> statement-breakpoint
CREATE TABLE `plan` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`price_yen` integer NOT NULL,
	`description` text NOT NULL,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_coach_kind_idx` ON `plan` (`coach_user_id`,`kind`);