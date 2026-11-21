ALTER TABLE `chat_message` ADD `drill_youtube_video_id` text;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `drill_youtube_start_sec` integer;--> statement-breakpoint
ALTER TABLE `drill` ADD `youtube_video_id` text;--> statement-breakpoint
ALTER TABLE `drill` ADD `youtube_start_sec` integer;--> statement-breakpoint
ALTER TABLE `reply_drill` ADD `youtube_video_id` text;--> statement-breakpoint
ALTER TABLE `reply_drill` ADD `youtube_start_sec` integer;