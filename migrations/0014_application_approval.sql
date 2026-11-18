ALTER TABLE `purchase` ADD `stripe_payment_intent_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_stripePaymentIntentId_unique` ON `purchase` (`stripe_payment_intent_id`);--> statement-breakpoint
ALTER TABLE `thread` ADD `requested_at` integer;--> statement-breakpoint
ALTER TABLE `thread` ADD `decided_at` integer;--> statement-breakpoint
ALTER TABLE `thread` ADD `decline_reason` text;--> statement-breakpoint
ALTER TABLE `thread` ADD `decline_message` text;