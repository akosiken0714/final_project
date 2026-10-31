-- PhineWash: run in phpMyAdmin (SQL tab) on your laundry database.
-- Only needed if you build the schema by importing SQL instead of running `php artisan migrate`.

-- 1) REQUIRED: table for saved (reusable) orders
CREATE TABLE IF NOT EXISTS `saved_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(40) NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `quantity` smallint unsigned NOT NULL,
  `address` varchar(255) NOT NULL,
  `instructions` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saved_orders_user_id_name_unique` (`user_id`, `name`),
  KEY `saved_orders_service_id_foreign` (`service_id`),
  CONSTRAINT `saved_orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saved_orders_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) OPTIONAL: only if you ALREADY ran the earlier "archive" columns. Skip this part otherwise.
--    (If one line errors with "can't DROP", that part was never created: just skip that line.)
ALTER TABLE `orders` DROP INDEX `orders_status_archived_by_admin_at_index`;
ALTER TABLE `orders` DROP INDEX `orders_user_id_status_archived_by_customer_at_index`;
ALTER TABLE `orders` DROP COLUMN `archived_by_admin_at`;
ALTER TABLE `orders` DROP COLUMN `archived_by_customer_at`;
