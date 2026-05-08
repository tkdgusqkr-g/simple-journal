CREATE TABLE `invite_links` (
	`token` text PRIMARY KEY NOT NULL,
	`diary_id` text NOT NULL REFERENCES `diaries`(`id`) ON DELETE CASCADE,
	`role` text NOT NULL,
	`created_by` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`expires_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `invite_links_diary_idx` ON `invite_links` (`diary_id`);
