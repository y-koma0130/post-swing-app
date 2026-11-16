-- スレッドを「提出」単位にする（1回の提出に動画1〜2本、添削は提出ごと、チャットはスレッドに1本）
-- 既存の動画は1本ずつ「動画1本の提出」に移す。提出の id は動画の id をそのまま使う（付け替えを簡単にするため）
-- drizzle-kit の生成をもとに、データの移し替えを手で足した。外部キーはコミット時にまとめて確かめる
PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`note` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`sent_during_absence_id` text,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submission_thread_idx` ON `submission` (`thread_id`);--> statement-breakpoint
INSERT INTO `submission`("id", "thread_id", "note", "submitted_at", "sent_during_absence_id") SELECT "id", "thread_id", "note", "uploaded_at", "sent_during_absence_id" FROM `video`;--> statement-breakpoint
CREATE TABLE `__new_video` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`submission_id` text,
	`uploader_user_id` text NOT NULL,
	`angle` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`duration_sec` real,
	`frame_rate` real,
	`uploaded_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploader_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_video`("id", "thread_id", "submission_id", "uploader_user_id", "angle", "r2_key", "content_type", "size_bytes", "duration_sec", "frame_rate", "uploaded_at", "deleted_at") SELECT v."id", v."thread_id", v."id", t."student_user_id", 'other', v."r2_key", v."content_type", v."size_bytes", NULL, v."frame_rate", v."uploaded_at", v."deleted_at" FROM `video` v JOIN `thread` t ON t."id" = v."thread_id";--> statement-breakpoint
-- カードは動画と返信を参照する。古い表を消して新しい表を付け替えるまで、制約のない仮の表に置いておく
CREATE TABLE `__tmp_review_card` AS SELECT c."id", c."reply_id", r."video_id", c."sort_order", c."position", c."time_sec", c."annotations", c."comment", c."image_r_2_key", c."drill_id" FROM `review_card` c JOIN `reply` r ON r."id" = c."reply_id";--> statement-breakpoint
CREATE TABLE `__new_reply` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reply`("id", "submission_id", "sent_at") SELECT "id", "video_id", "sent_at" FROM `reply`;--> statement-breakpoint
CREATE TABLE `__new_thread_notice` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`absence_id` text NOT NULL,
	`absence_end_date` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_thread_notice`("id", "thread_id", "submission_id", "absence_id", "absence_end_date", "created_at") SELECT "id", "thread_id", "video_id", "absence_id", "absence_end_date", "created_at" FROM `thread_notice`;--> statement-breakpoint
CREATE TABLE `__new_chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` integer NOT NULL,
	`sent_during_absence_id` text,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chat_message`("id", "thread_id", "sender_role", "sender_user_id", "body", "sent_at", "sent_during_absence_id") SELECT "id", "thread_id", "sender_role", "sender_user_id", "body", "sent_at", "sent_during_absence_id" FROM `chat_message`;--> statement-breakpoint
DROP TABLE `review_card`;--> statement-breakpoint
DROP TABLE `chat_message`;--> statement-breakpoint
DROP TABLE `thread_notice`;--> statement-breakpoint
DROP TABLE `reply`;--> statement-breakpoint
DROP TABLE `video`;--> statement-breakpoint
ALTER TABLE `__new_video` RENAME TO `video`;--> statement-breakpoint
ALTER TABLE `__new_reply` RENAME TO `reply`;--> statement-breakpoint
ALTER TABLE `__new_thread_notice` RENAME TO `thread_notice`;--> statement-breakpoint
ALTER TABLE `__new_chat_message` RENAME TO `chat_message`;--> statement-breakpoint
CREATE TABLE `review_card` (
	`id` text PRIMARY KEY NOT NULL,
	`reply_id` text NOT NULL,
	`video_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`position` text NOT NULL,
	`time_sec` real NOT NULL,
	`annotations` text NOT NULL,
	`comment` text NOT NULL,
	`image_r_2_key` text NOT NULL,
	`drill_id` text,
	FOREIGN KEY (`reply_id`) REFERENCES `reply`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `review_card`("id", "reply_id", "video_id", "sort_order", "position", "time_sec", "annotations", "comment", "image_r_2_key", "drill_id") SELECT "id", "reply_id", "video_id", "sort_order", "position", "time_sec", "annotations", "comment", "image_r_2_key", "drill_id" FROM `__tmp_review_card`;--> statement-breakpoint
DROP TABLE `__tmp_review_card`;--> statement-breakpoint
CREATE INDEX `video_thread_idx` ON `video` (`thread_id`);--> statement-breakpoint
CREATE INDEX `video_submission_idx` ON `video` (`submission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reply_submissionId_unique` ON `reply` (`submission_id`);--> statement-breakpoint
CREATE INDEX `review_card_reply_idx` ON `review_card` (`reply_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `thread_notice_absence_idx` ON `thread_notice` (`thread_id`,`absence_id`);--> statement-breakpoint
CREATE INDEX `chat_message_thread_idx` ON `chat_message` (`thread_id`);
