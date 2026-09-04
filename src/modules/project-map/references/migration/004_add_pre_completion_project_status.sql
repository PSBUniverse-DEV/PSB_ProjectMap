-- Preserve a project's status while a run is Completed so reopening the run
-- can restore the status that existed before the completion cascade.
ALTER TABLE public.proj_t_projects
  ADD COLUMN IF NOT EXISTS status_before_run_completion_id integer null;

ALTER TABLE public.proj_t_projects
  DROP CONSTRAINT IF EXISTS proj_t_projects_status_before_run_completion_id_fkey;

ALTER TABLE public.proj_t_projects
  ADD CONSTRAINT proj_t_projects_status_before_run_completion_id_fkey
  FOREIGN KEY (status_before_run_completion_id)
  REFERENCES public.proj_s_project_status (status_id);

CREATE INDEX IF NOT EXISTS idx_proj_t_projects_status_before_run_completion
  ON public.proj_t_projects (status_before_run_completion_id);
