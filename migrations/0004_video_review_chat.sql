CREATE TABLE `chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`video_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_message_thread_idx` ON `chat_message` (`thread_id`);--> statement-breakpoint
CREATE TABLE `drill` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `drill_coach_idx` ON `drill` (`coach_user_id`);--> statement-breakpoint
CREATE TABLE `reply` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reply_videoId_unique` ON `reply` (`video_id`);--> statement-breakpoint
CREATE TABLE `review_card` (
	`id` text PRIMARY KEY NOT NULL,
	`reply_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`position` text NOT NULL,
	`time_sec` real NOT NULL,
	`annotations` text NOT NULL,
	`comment` text NOT NULL,
	`image_r_2_key` text NOT NULL,
	`drill_id` text,
	FOREIGN KEY (`reply_id`) REFERENCES `reply`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_card_reply_idx` ON `review_card` (`reply_id`);--> statement-breakpoint
CREATE TABLE `video` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`note` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `video_thread_idx` ON `video` (`thread_id`);