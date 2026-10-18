CREATE TABLE `source_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`endpoint` text NOT NULL,
	`day` text NOT NULL,
	`sha256` text NOT NULL,
	`body` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artifact_endpoint_day_hash` ON `source_artifacts` (`endpoint`,`day`,`sha256`);--> statement-breakpoint
CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`checked_at` text NOT NULL,
	`status` text NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `source_checks_time` ON `source_checks` (`checked_at`);