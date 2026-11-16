CREATE TABLE `reply_drill` (
	`reply_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`drill_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	PRIMARY KEY(`reply_id`, `sort_order`),
	FOREIGN KEY (`reply_id`) REFERENCES `reply`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `reply` ADD `comment` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- 以前はカードごとにドリルを付けていた。添削ごとのおすすめのドリルに移す（同じドリルは1つにまとめ、中身を写す）
INSERT INTO `reply_drill` (`reply_id`, `sort_order`, `drill_id`, `title`, `description`) SELECT c.`reply_id`, MIN(c.`sort_order`), c.`drill_id`, d.`title`, d.`description` FROM `review_card` c JOIN `drill` d ON d.`id` = c.`drill_id` GROUP BY c.`reply_id`, c.`drill_id`;
