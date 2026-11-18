CREATE TABLE `coach_absence` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`pause_new_signups` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `coach_absence_coach_idx` ON `coach_absence` (`coach_user_id`,`end_date`);--> statement-breakpoint
CREATE TABLE `absence_ack` (
	`student_user_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`absence_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`student_user_id`, `thread_id`, `absence_id`),
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`absence_id`) REFERENCES `coach_absence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `thread_notice` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`video_id` text NOT NULL,
	`absence_id` text NOT NULL,
	`absence_end_date` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thread_notice_absence_idx` ON `thread_notice` (`thread_id`,`absence_id`);--> statement-breakpoint
ALTER TABLE `coach_profile` ADD `delay_flag_set_at` integer;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `sent_during_absence_id` text;--> statement-breakpoint
ALTER TABLE `video` ADD `sent_during_absence_id` text;