CREATE TABLE `monitor_code` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`price_yen` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`expires_on` text,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monitor_code_code_unique` ON `monitor_code` (`code`);--> statement-breakpoint
CREATE INDEX `monitor_code_coach_idx` ON `monitor_code` (`coach_user_id`);--> statement-breakpoint
CREATE TABLE `share_consent` (
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`allow_publish` integer NOT NULL,
	`show_face` integer NOT NULL,
	`show_age_range` integer NOT NULL,
	`show_score` integer NOT NULL,
	`text_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`coach_user_id`, `student_user_id`),
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `share_consent_log` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`allow_publish` integer NOT NULL,
	`show_face` integer NOT NULL,
	`show_age_range` integer NOT NULL,
	`show_score` integer NOT NULL,
	`text_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `share_consent_log_pair_idx` ON `share_consent_log` (`coach_user_id`,`student_user_id`);--> statement-breakpoint
ALTER TABLE `purchase` ADD `monitor_code_id` text REFERENCES monitor_code(id);--> statement-breakpoint
CREATE INDEX `purchase_monitor_code_idx` ON `purchase` (`monitor_code_id`);--> statement-breakpoint
ALTER TABLE `thread` ADD `age_range` text;