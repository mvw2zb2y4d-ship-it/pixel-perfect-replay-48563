CREATE TABLE public.planner_states (
 user_id uuid PRIMARY KEY,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_states TO authenticated;
GRANT ALL ON public.planner_states TO service_role;
ALTER TABLE public.planner_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own planner" ON public.planner_states FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own planner" ON public.planner_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own planner" ON public.planner_states FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own planner" ON public.planner_states FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE FUNCTION public.save_planner_state(p_payload jsonb, p_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE next_revision integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'Invalid payload'; END IF;
 IF p_revision = 0 THEN
  INSERT INTO public.planner_states(user_id, payload, revision) VALUES (auth.uid(), p_payload, 1) ON CONFLICT (user_id) DO NOTHING RETURNING revision INTO next_revision;
 ELSE
  UPDATE public.planner_states SET payload = p_payload, revision = revision + 1, updated_at = now() WHERE user_id = auth.uid() AND revision = p_revision RETURNING revision INTO next_revision;
 END IF;
 IF next_revision IS NULL THEN RAISE EXCEPTION 'STATE_CONFLICT'; END IF;
 RETURN next_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.save_planner_state(jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_planner_state(jsonb, integer) TO authenticated, service_role;