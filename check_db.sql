SELECT 
  'hero_count_draft' as metric, count(*) as value FROM homepage_hero WHERE status = 'draft'
UNION ALL
SELECT 
  'hero_count_published', count(*) FROM homepage_hero WHERE status = 'published'
UNION ALL
SELECT 
  'settings_exists', count(*) FROM homepage_settings;




















