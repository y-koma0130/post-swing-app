CREATE TABLE `purchase` (
	`id` text PRIMARY KEY NOT NULL,
	`student_user_id` text NOT NULL,
	`coach_user_id` text NOT NULL,
	`plan_kind` text NOT NULL,
	`price_yen` integer NOT NULL,
	`status` text NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_stripeCheckoutSessionId_unique` ON `purchase` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_stripeSubscriptionId_unique` ON `purchase` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `purchase_student_coach_idx` ON `purchase` (`student_user_id`,`coach_user_id`);--> statement-breakpoint
CREATE INDEX `purchase_coach_idx` ON `purchase` (`coach_user_id`);--> statement-breakpoint
CREATE TABLE `stripe_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `waitlist_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`notified_at` integer,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_coach_student_idx` ON `waitlist_entry` (`coach_user_id`,`student_user_id`);--> statement-breakpoint
CREATE TABLE `thread` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`plan_kind` text NOT NULL,
	`theme` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`closed_at` integer,
	`stripe_invoice_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchase`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thread_stripeInvoiceId_unique` ON `thread` (`stripe_invoice_id`);--> statement-breakpoint
CREATE INDEX `thread_coach_status_idx` ON `thread` (`coach_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `thread_student_idx` ON `thread` (`student_user_id`);