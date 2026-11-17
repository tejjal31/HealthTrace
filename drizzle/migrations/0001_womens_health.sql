CREATE TABLE public.period_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  flow text NOT NULL DEFAULT 'medium',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_logs TO authenticated;
GRANT ALL ON public.period_logs TO service_role;
ALTER TABLE public.period_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own periods" ON public.period_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.symptoms ADD COLUMN category text NOT NULL DEFAULT 'general';