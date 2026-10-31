-- PhineWash: run ONCE in phpMyAdmin (SQL tab) on your laundry database.
-- Only needed if you build the schema by importing SQL instead of running `php artisan migrate`.
-- Adds the columns used by "Weigh & confirm" and "Cancel order (admin)". Nothing is deleted; old orders stay as they are.
-- If it says "Duplicate column name", the columns are already there and you can ignore it.

ALTER TABLE `orders`
  ADD COLUMN `estimated_quantity` decimal(8,2) NULL,
  ADD COLUMN `weighed_at` timestamp NULL DEFAULT NULL,
  ADD COLUMN `cancel_reason` varchar(200) NULL;
