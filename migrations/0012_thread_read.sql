CREATE TABLE `thread_read` (
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`thread_id`, `user_id`),
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 以前はチャットでも「コーチの番」になっていたので、添削していない提出がないスレッドは「生徒の番」に戻す
UPDATE `thread` SET `status` = 'waiting_student' WHERE `status` = 'waiting_coach' AND NOT EXISTS (SELECT 1 FROM `submission` s LEFT JOIN `reply` r ON r.`submission_id` = s.`id` WHERE s.`thread_id` = `thread`.`id` AND r.`id` IS NULL);
