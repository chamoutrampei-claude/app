CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceRequestId` int NOT NULL,
	`openedByUserId` int NOT NULL,
	`reason` text NOT NULL,
	`severity` enum('low','medium','high','critical') DEFAULT 'medium',
	`status` enum('open','resolved','dismissed') DEFAULT 'open',
	`resolution` text,
	`resolvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('new_request_match','request_accepted','request_in_progress','request_completed','request_cancelled_by_client','worker_dropped','review_received','referral_active','referral_paid','dispute_opened','dispute_resolved') NOT NULL;