CREATE TABLE `drill_video` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`duration_sec` real,
	`frame_rate` real,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `coach_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `drill_video_coach_idx` ON `drill_video` (`coach_user_id`);--> statement-breakpoint
ALTER TABLE `chat_message` ADD `drill_video_id` text REFERENCES drill_video(id);--> statement-breakpoint
ALTER TABLE `drill` ADD `video_id` text REFERENCES drill_video(id);--> statement-breakpoint
ALTER TABLE `reply_drill` ADD `video_id` text REFERENCES drill_video(id);