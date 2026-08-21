-- Migration: Update Meta Pixel / Dataset ID to authoritative 16-digit ID 1862583688445311
UPDATE public.store_settings
SET value = jsonb_set(
  jsonb_set(
    value,
    '{meta_pixel_id}',
    '"1862583688445311"'
  ),
  '{meta_api_version}',
  '"v21.0"'
),
updated_at = NOW()
WHERE key IN ('public_tracking_settings', 'tracking_settings')
  AND (value->>'meta_pixel_id' = '18625836884445311' OR value->>'meta_pixel_id' = '' OR value->>'meta_pixel_id' IS NULL);

-- Also update store_info tracking if present
UPDATE public.store_settings
SET value = jsonb_set(
  value,
  '{tracking,meta_pixel_id}',
  '"1862583688445311"'
),
updated_at = NOW()
WHERE key = 'store_info'
  AND value->'tracking'->>'meta_pixel_id' = '18625836884445311';
