CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trampistaUserId` int NOT NULL,
	`clientUserId` int,
	`clientCompanyName` varchar(200) NOT NULL,
	`clientContact` varchar(200),
	`planChosen` enum('basico','pro','premiere') DEFAULT 'basico',
	`firstPaymentAmount` decimal(10,2),
	`status` enum('pending','active','paid','cancelled') DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`activatedAt` timestamp,
	`paidAt` timestamp,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `worker_profiles` ADD `acceptsFreela` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `worker_profiles` ADD `acceptsDiaria` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `worker_profiles` ADD `acceptsFixa` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `worker_profiles` ADD `professionArea` varchar(200);