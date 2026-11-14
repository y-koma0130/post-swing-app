CREATE TABLE `line_friend` (
	`line_user_id` text PRIMARY KEY NOT NULL,
	`is_friend` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coach_review` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`coach_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`coach_reply` text,
	`created_at` integer NOT NULL,
	`replied_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_review_threadId_unique` ON `coach_review` (`thread_id`);--> statement-breakpoint
CREATE INDEX `coach_review_coach_idx` ON `coach_review` (`coach_user_id`);