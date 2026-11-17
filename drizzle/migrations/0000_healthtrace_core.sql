CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  date_of_birth date,
  sex text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  report_date date,
  lab_name text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  summary_en text,
  summary_hi text,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  value_text text,
  value_num double precision,
  unit text,
  ref_low double precision,
  ref_high double precision,
  ref_text text,
  flag text,
  measured_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lab_results_user_test ON public.lab_results(user_id, test_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own results" ON public.lab_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  severity int NOT NULL DEFAULT 3,
  notes text,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptoms TO authenticated;
GRANT ALL ON public.symptoms TO service_role;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own symptoms" ON public.symptoms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);