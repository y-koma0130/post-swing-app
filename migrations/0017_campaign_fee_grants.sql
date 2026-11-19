CREATE TABLE `campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`fee_rate` real NOT NULL,
	`duration_days` integer NOT NULL,
	`anchor` text NOT NULL,
	`max_grants` integer,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_code_unique` ON `campaign` (`code`);--> statement-breakpoint
CREATE TABLE `coach_fee_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`fee_rate` real NOT NULL,
	`duration_days` integer NOT NULL,
	`start_date` text,
	`end_date` text,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_fee_grant_coach_campaign_idx` ON `coach_fee_grant` (`coach_user_id`,`campaign_id`);--> statement-breakpoint
CREATE INDEX `coach_fee_grant_campaign_idx` ON `coach_fee_grant` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`coach_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`price_yen` integer NOT NULL,
	`system_fee_yen` integer NOT NULL,
	`platform_fee_rate` real NOT NULL,
	`platform_fee_yen` integer NOT NULL,
	`fee_grant_id` text,
	`fee_adjusted_yen` integer DEFAULT 0 NOT NULL,
	`refunded_yen` integer DEFAULT 0 NOT NULL,
	`refunded_fee_yen` integer DEFAULT 0 NOT NULL,
	`refunded_at` integer,
	`stripe_payment_intent_id` text,
	`stripe_invoice_id` text,
	`paid_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchase`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_stripeInvoiceId_unique` ON `payment` (`stripe_invoice_id`);--> statement-breakpoint
CREATE INDEX `payment_purchase_idx` ON `payment` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `payment_coach_idx` ON `payment` (`coach_user_id`,`paid_at`);--> statement-breakpoint
-- 先行募集：初めて生徒を承認した日から90日間、手数料0%。10名まで（取り消した特典は数えない）
INSERT INTO `campaign` (`id`, `code`, `name`, `fee_rate`, `duration_days`, `anchor`, `max_grants`, `active`, `created_at`)
  VALUES ('campaign_early_adopter_2026', 'early_adopter_2026', '先行募集', 0, 90, 'first_approval', 10, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
