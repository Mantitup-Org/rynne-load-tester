EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT e.*, u.id AS host_uid, u.name AS host_name, u.image AS host_image
FROM events e
LEFT JOIN "user" u ON u.id = e.host_id
WHERE e.slug = 'loadtest-meetup'
LIMIT 1;
