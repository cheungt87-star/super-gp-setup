SELECT cron.schedule(
  'check-task-deadlines-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url:='https://ycatxllbpddsbaqojxkb.supabase.co/functions/v1/check-task-deadlines',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYXR4bGxicGRkc2JhcW9qeGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjMzODYsImV4cCI6MjA4MDIzOTM4Nn0.B-mZ9ZHC4G1_V1mQTgz2h95OOnYCzKwpeHzW-YOI-Rs"}'::jsonb,
    body:='{"time": "scheduled"}'::jsonb
  ) as request_id;$$
)