CREATE TABLE `books` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `author` text NOT NULL,
  `price` integer NOT NULL,
  `condition` text NOT NULL,
  `status` text DEFAULT 'available' NOT NULL,
  `tone` text DEFAULT 'coral' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `customer_name` text NOT NULL,
  `facebook_profile` text NOT NULL,
  `phone` text NOT NULL,
  `delivery_method` text NOT NULL,
  `address` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `total` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'pending_payment' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);
--> statement-breakpoint
CREATE TABLE `order_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` text NOT NULL,
  `book_id` integer NOT NULL,
  `price` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_book_id_unique` ON `order_items` (`book_id`);
--> statement-breakpoint
CREATE TABLE `settings` (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_books_status_created` ON `books` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_orders_status_created` ON `orders` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);
