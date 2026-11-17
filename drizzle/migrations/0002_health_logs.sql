CREATE TABLE public.health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  value_num numeric,
  value2_num numeric,
  unit text,
  severity int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_logs TO authenticated;
GRANT ALL ON public.health_logs TO service_role;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health logs" ON public.health_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX health_logs_user_time ON public.health_logs(user_id, logged_at);