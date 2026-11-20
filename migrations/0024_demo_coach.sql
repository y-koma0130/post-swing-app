ALTER TABLE `coach_profile` ADD `demo_expires_at` integer;--> statement-breakpoint
ALTER TABLE `coach_profile` ADD `demo_token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `coach_profile_demoTokenHash_unique` ON `coach_profile` (`demo_token_hash`);