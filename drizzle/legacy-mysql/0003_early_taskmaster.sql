CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_request_match','request_accepted','request_in_progress','request_completed','request_cancelled_by_client','worker_dropped','review_received','referral_active','referral_paid') NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`linkPath` varchar(200),
	`relatedId` int,
	`read` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
