CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender` text NOT NULL,
	`text` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
