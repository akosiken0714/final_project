-- PhineWash: batches 2, 3 and 4 (walk-in orders, staff role, intake record).
-- Run this ONCE in phpMyAdmin (MySQL / MariaDB) if you do not use `php artisan migrate`.
-- If you run it and later run `php artisan migrate` anyway, nothing breaks: the migration checks first.
-- "Duplicate column name" / "table already exists" means that step was already done; ignore it.
-- The staff role needs no column: it is just the value 'staff' in users.role.

-- 1. A walk-in customer at the counter may have no email.
ALTER TABLE `users` MODIFY `email` VARCHAR(255) NULL;

-- 2. Where an order came from, and which staff member made a walk-in order.
ALTER TABLE `orders`
  ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT 'online',
  ADD COLUMN `created_by` BIGINT UNSIGNED NULL,
  ADD INDEX `orders_created_by_index` (`created_by`);

-- 3. The intake record: what was received at the counter.
CREATE TABLE `order_intakes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `item_count` SMALLINT UNSIGNED NOT NULL,
  `notes` VARCHAR(500) NULL,
  `photo` VARCHAR(255) NULL,
  `received_by` BIGINT UNSIGNED NULL,
  `received_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_intakes_order_id_unique` (`order_id`),
  CONSTRAINT `order_intakes_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
);

-- 4. OPTIONAL, only if your database already has a `migrations` table (you used `php artisan migrate` before):
--    remove the two leading dashes from the next two lines so Laravel knows this migration is done.
-- INSERT INTO `migrations` (`migration`, `batch`)
-- SELECT '2026_10_21_000000_add_staff_walkin_and_intake', COALESCE(MAX(`batch`), 0) + 1 FROM `migrations`;
