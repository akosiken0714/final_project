-- ONLY if you do NOT want to run `php artisan migrate`. Import this in phpMyAdmin instead.
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  order_id BIGINT UNSIGNED NULL,
  event VARCHAR(40) NOT NULL,
  summary VARCHAR(255) NOT NULL,
  meta JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id), INDEX (order_id), INDEX (event), INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  notifiable_type VARCHAR(255) NOT NULL,
  notifiable_id BIGINT UNSIGNED NOT NULL,
  data TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX notifications_notifiable_index (notifiable_type, notifiable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OPTIONAL, run ONCE: fills the History page with your old orders, status changes and payments.
INSERT INTO activity_logs (user_id, order_id, event, summary, created_at)
SELECT o.user_id, o.id, 'order.placed', CONCAT('Order #', LPAD(o.id,4,'0'), ' placed'), o.created_at FROM orders o;

INSERT INTO activity_logs (user_id, order_id, event, summary, created_at)
SELECT l.changed_by, l.order_id, 'order.status', CONCAT('Order #', LPAD(l.order_id,4,'0'), ': ', l.from_status, ' → ', l.to_status), l.created_at FROM order_status_logs l;

INSERT INTO activity_logs (user_id, order_id, event, summary, created_at)
SELECT p.user_id, p.order_id, CONCAT('payment.', p.method), CONCAT(IF(p.method='gcash','GCash','Cash'), ' ₱', FORMAT(p.amount,2), ' paid for order #', LPAD(p.order_id,4,'0')), p.created_at FROM payments p WHERE p.status = 'success';
