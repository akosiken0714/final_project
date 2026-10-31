-- PhineWash: run in phpMyAdmin (SQL tab) on your laundry database.
-- Only needed if you build the schema by importing SQL instead of running `php artisan migrate`.
-- Adds the table used by the customer star rating and the "Customer feedback" part of the admin report.

CREATE TABLE IF NOT EXISTS `order_ratings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NULL,
  `stars` tinyint unsigned NOT NULL,
  `comment` text NULL,
  `demo` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_ratings_order_id_unique` (`order_id`),
  KEY `order_ratings_user_id_foreign` (`user_id`),
  CONSTRAINT `order_ratings_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_ratings_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
