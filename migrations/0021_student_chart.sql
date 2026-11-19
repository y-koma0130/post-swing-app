CREATE TABLE `student_chart` (
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`coach_user_id`, `student_user_id`),
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `student_chart_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`body` text NOT NULL,
	`thread_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `student_chart_entry_pair_idx` ON `student_chart_entry` (`coach_user_id`,`student_user_id`);