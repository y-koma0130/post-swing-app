ALTER TABLE `chat_message` ADD `attachment_kind` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `drill_title` text;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `drill_description` text;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `video_id` text REFERENCES video(id);--> statement-breakpoint
ALTER TABLE `chat_message` ADD `quote` text;--> statement-breakpoint
ALTER TABLE `video` ADD `chat_message_id` text;