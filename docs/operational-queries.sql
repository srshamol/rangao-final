-- ============================================================================
-- Rangao Operational Health & Diagnostic SQL Queries
-- Use these queries in the Supabase SQL Editor to monitor order health,
-- payment anomalies, stock discrepancies, failed alerts, and checkout drop-offs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Orders Stuck in Pending / Unpaid State (> 2 Hours)
-- Helps identify customers who abandoned payment gateway or failed transactions.
-- ----------------------------------------------------------------------------
SELECT 
  id,
  order_number,
  customer_name,
  customer_phone,
  payment_method,
  payment_status,
  order_status,
  total_amount,
  created_at,
  NOW() - created_at AS elapsed_time
FROM orders
WHERE payment_status = 'pending'
  AND payment_method IN ('uddoktapay', 'bkash', 'nagad')
  AND created_at < NOW() - INTERVAL '2 hours'
  AND created_at > NOW() - INTERVAL '48 hours'
ORDER BY created_at DESC;


-- ----------------------------------------------------------------------------
-- 2. Payment Webhook Anomalies & Mismatched Transactions
-- Finds orders marked paid where transaction ID is missing, or total amount is 0.
-- ----------------------------------------------------------------------------
SELECT 
  id,
  order_number,
  customer_name,
  customer_phone,
  payment_method,
  payment_status,
  total_amount,
  created_at
FROM orders
WHERE (payment_status = 'paid' AND total_amount <= 0)
   OR (payment_status = 'paid' AND payment_method != 'cod' AND updated_at IS NULL)
ORDER BY created_at DESC
LIMIT 50;


-- ----------------------------------------------------------------------------
-- 3. Stock Anomalies & Negative Inventory Detection
-- Detects products or variants with negative stock or out-of-stock active items.
-- ----------------------------------------------------------------------------
-- A. Out-of-Stock Active Base Products
SELECT 
  id,
  name,
  sku,
  stock_quantity,
  status,
  has_variants,
  updated_at
FROM products
WHERE status = 'active'
  AND stock_quantity <= 0
  AND has_variants = false
ORDER BY updated_at DESC;

-- B. Negative Stock on Any Product or Variant
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity AS product_stock,
  p.has_variants,
  p.variants
FROM products p
WHERE p.stock_quantity < 0
ORDER BY p.stock_quantity ASC;


-- ----------------------------------------------------------------------------
-- 4. Notification & Courier Dispatch Failures (Last 7 Days)
-- Inspects order_history for failed SMS, Telegram alerts, or Steadfast bookings.
-- ----------------------------------------------------------------------------
SELECT 
  oh.id,
  oh.order_id,
  o.order_number,
  oh.action,
  oh.details,
  oh.staff_name,
  oh.created_at
FROM order_history oh
LEFT JOIN orders o ON o.id = oh.order_id
WHERE oh.details ILIKE '%failed%'
   OR oh.details ILIKE '%error%'
   OR oh.action IN ('sms_failed', 'telegram_failed', 'courier_booking_failed')
ORDER BY oh.created_at DESC
LIMIT 100;


-- ----------------------------------------------------------------------------
-- 5. Checkout Conversion Drop-Offs & Incomplete Orders (Last 24 Hours)
-- Measures conversion rate from incomplete checkout drafts to completed orders.
-- ----------------------------------------------------------------------------
SELECT 
  DATE_TRUNC('hour', created_at) AS hour_window,
  COUNT(*) AS total_incomplete_drafts,
  COUNT(CASE WHEN converted = true THEN 1 END) AS converted_to_orders,
  COUNT(CASE WHEN converted = false THEN 1 END) AS abandoned_drafts,
  ROUND(
    (COUNT(CASE WHEN converted = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
    1
  ) AS conversion_rate_percent
FROM incomplete_orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour_window DESC;


-- ----------------------------------------------------------------------------
-- 6. High Velocity / Potential Fraud Signals
-- Identifies customer phone numbers with unusually high order volumes in 24 hours.
-- ----------------------------------------------------------------------------
SELECT 
  customer_phone,
  COUNT(*) AS orders_count_24h,
  SUM(total_amount) AS total_value,
  COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelled_count,
  ARRAY_AGG(order_number) AS order_numbers
FROM orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY customer_phone
HAVING COUNT(*) >= 5
ORDER BY orders_count_24h DESC;
