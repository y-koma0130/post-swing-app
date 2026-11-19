CREATE TABLE `retake_request` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`reason` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`requested_at` integer NOT NULL,
	`closed_at` integer,
	`close_reason` text,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `retake_request_thread_idx` ON `retake_request` (`thread_id`);--> statement-breakpoint
ALTER TABLE `video` ADD `retake_request_id` text;