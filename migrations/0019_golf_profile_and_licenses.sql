ALTER TABLE `coach_profile` ADD `licenses` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_profile` ADD `license_other` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `thread` ADD `round_frequency` text;--> statement-breakpoint
ALTER TABLE `thread` ADD `average_score` integer;