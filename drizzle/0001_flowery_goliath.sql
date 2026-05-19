CREATE TABLE `availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`date` datetime NOT NULL,
	`timeSlot` enum('morning','afternoon','evening','night'),
	`isAvailable` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(200) NOT NULL,
	`phone` varchar(20),
	`city` varchar(100),
	`latitude` float,
	`longitude` float,
	`rating` float DEFAULT 0,
	`totalReviews` int DEFAULT 0,
	`subscriptionPlan` enum('basic','premium','enterprise') DEFAULT 'basic',
	`subscriptionExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceRequestId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewedUserId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceRequestId` int NOT NULL,
	`role` enum('client','worker') NOT NULL,
	`statusAtTime` enum('requested','accepted','in_progress','completed','cancelled'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workerId` int,
	`specialtyId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`urgencyLevel` enum('low','medium','high','critical') DEFAULT 'medium',
	`status` enum('requested','accepted','in_progress','completed','cancelled') DEFAULT 'requested',
	`scheduledDate` datetime,
	`scheduledTime` varchar(10),
	`locationLatitude` float,
	`locationLongitude` float,
	`estimatedDurationMinutes` int,
	`proposedPrice` decimal(10,2),
	`finalPrice` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specialties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon_url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `specialties_id` PRIMARY KEY(`id`),
	CONSTRAINT `specialties_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `worker_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` text,
	`bio` text,
	`specialties` json DEFAULT ('[]'),
	`city` varchar(100),
	`latitude` float,
	`longitude` float,
	`hourlyRate` decimal(10,2),
	`rating` float DEFAULT 0,
	`totalReviews` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worker_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `worker_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','client','worker','admin') NOT NULL DEFAULT 'user';