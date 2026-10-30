CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assigned_email` text,
	`data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`step` integer DEFAULT 0 NOT NULL,
	`checklist` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`pricing_snapshot` text
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`size` integer NOT NULL,
	`type` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`application_id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
