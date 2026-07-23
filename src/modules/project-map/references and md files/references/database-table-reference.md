create table public.proj_t_projects (
  id serial not null,
  client_name text not null,
  formatted_address text null,
  address_line_1 text null,
  city text null,
  state text null,
  state_code text null,
  postal_code text null,
  country text null,
  address_latitude numeric(10, 7) null,
  address_longitude numeric(10, 7) null,
  site_latitude numeric(10, 7) null,
  site_longitude numeric(10, 7) null,
  location_source text null,
  location_confirmed boolean not null default false,
  status_id integer null,
  dealer text null,
  order_received_at timestamp without time zone null default now(),
  scheduled_project_start timestamp without time zone null,
  install_start timestamp without time zone null,
  project_subtotal numeric(12, 2) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by integer null,
  updated_by integer null,
  building_category_id integer null,
  permit_status_id integer null,
  welcome_call_status_id integer null,
  invoice_number character varying(50) null,
  scheduled_project_end timestamp without time zone null,
  install_end timestamp without time zone null,
  project_notes text null,
  constraint proj_t_projects_pkey primary key (id),
  constraint proj_t_projects_building_category_id_fkey foreign KEY (building_category_id) references proj_s_building_categories (id),
  constraint proj_t_projects_permit_status_id_fkey foreign KEY (permit_status_id) references proj_s_permit_status (id),
  constraint proj_t_projects_status_id_fkey foreign KEY (status_id) references proj_s_project_status (status_id),
  constraint proj_t_projects_welcome_call_status_id_fkey foreign KEY (welcome_call_status_id) references proj_s_welcome_call_status (id)
) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_status_id on public.proj_t_projects using btree (status_id) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_client_name on public.proj_t_projects using btree (client_name) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_state_code on public.proj_t_projects using btree (state_code) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_dealer on public.proj_t_projects using btree (dealer) TABLESPACE pg_default;

create index IF not exists idx_projects_building_category on public.proj_t_projects using btree (building_category_id) TABLESPACE pg_default;

create index IF not exists idx_projects_permit_status on public.proj_t_projects using btree (permit_status_id) TABLESPACE pg_default;

create index IF not exists idx_projects_welcome_call_status on public.proj_t_projects using btree (welcome_call_status_id) TABLESPACE pg_default;



create table public.proj_s_project_status (
  status_id serial not null,
  status_name text not null,
  status_description text null,
  display_color text null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  date_created timestamp with time zone not null default now(),
  constraint proj_s_project_status_pkey primary key (status_id),
  constraint proj_s_project_status_status_name_key unique (status_name)
) TABLESPACE pg_default;



create table public.proj_s_origin_addresses (
  id serial not null,
  origin_name text not null,
  origin_code text null,
  formatted_address text null,
  address_line_1 text null,
  city text null,
  state text null,
  state_code text null,
  postal_code text null,
  country text null,
  latitude numeric(10, 7) null,
  longitude numeric(10, 7) null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint proj_s_origin_addresses_pkey primary key (id),
  constraint proj_s_origin_addresses_origin_name_key unique (origin_name)
) TABLESPACE pg_default;



create table public.proj_s_building_categories (
  id serial not null,
  building_category_name character varying(100) not null,
  description text null,
  display_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint proj_s_building_categories_pkey primary key (id),
  constraint proj_s_building_categories_building_category_name_key unique (building_category_name)
) TABLESPACE pg_default;



create table public.proj_s_states (
  id serial not null,
  state_name text not null,
  state_code text not null,
  display_color text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint proj_s_states_pkey primary key (id),
  constraint proj_s_states_state_code_key unique (state_code),
  constraint proj_s_states_state_name_key unique (state_name)
) TABLESPACE pg_default;



create table public.proj_s_welcome_call_status (
  id serial not null,
  status_name character varying(100) not null,
  description text null,
  display_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint proj_s_welcome_call_status_pkey primary key (id),
  constraint proj_s_welcome_call_status_status_name_key unique (status_name)
) TABLESPACE pg_default;



create table public.proj_s_origin_addresses (
  id serial not null,
  origin_name text not null,
  origin_code text null,
  formatted_address text null,
  address_line_1 text null,
  city text null,
  state text null,
  state_code text null,
  postal_code text null,
  country text null,
  latitude numeric(10, 7) null,
  longitude numeric(10, 7) null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint proj_s_origin_addresses_pkey primary key (id),
  constraint proj_s_origin_addresses_origin_name_key unique (origin_name)
) TABLESPACE pg_default;



create table public.proj_s_permit_status (
  id serial not null,
  status_name character varying(100) not null,
  description text null,
  display_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint proj_s_permit_status_pkey primary key (id),
  constraint proj_s_permit_status_status_name_key unique (status_name)
) TABLESPACE pg_default;
-- ====================================================
-- Runs Module Tables
-- ====================================================

create table public.proj_t_runs (
  id serial not null,
  run_number serial not null,
  run_name text not null,
  origin_id integer null,
  run_date date null,
  status text not null default 'Draft'::text,
  notes text null,
  team_assigned text null,
  vehicle_assigned text null,
  estimated_distance numeric(10, 2) null,
  estimated_duration numeric(10, 2) null,
  estimated_subtotal numeric(12, 2) null,
  created_by integer null,
  updated_by integer null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  stops integer null,
  estimated_mileage numeric(10, 2) null,
  constraint proj_t_runs_pkey primary key (id),
  constraint proj_t_runs_origin_id_fkey foreign KEY (origin_id) references proj_s_origin_addresses (id)
) TABLESPACE pg_default;

create index IF not exists idx_proj_t_runs_run_date on public.proj_t_runs using btree (run_date) TABLESPACE pg_default;

create index IF not exists idx_proj_t_runs_status on public.proj_t_runs using btree (status) TABLESPACE pg_default;

create table public.proj_t_run_projects (
  id serial not null,
  run_id integer not null,
  project_id integer not null,
  stop_sequence integer not null default 0,
  notes text null,
  estimated_arrival timestamp with time zone null,
  estimated_departure timestamp with time zone null,
  estimated_distance numeric(10, 2) null,
  estimated_duration numeric(10, 2) null,
  estimated_mileage numeric(10, 2) null,
  estimated_subtotal numeric(12, 2) null,
  arrival_datetime timestamp without time zone null,
  constraint proj_t_run_projects_pkey primary key (id),
  constraint proj_t_run_projects_run_project_unique unique (run_id, project_id),
  constraint proj_t_run_projects_project_id_fkey foreign KEY (project_id) references proj_t_projects (id),
  constraint proj_t_run_projects_run_id_fkey foreign KEY (run_id) references proj_t_runs (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_proj_t_run_projects_run_id on public.proj_t_run_projects using btree (run_id) TABLESPACE pg_default;

create index IF not exists idx_proj_t_run_projects_project_id on public.proj_t_run_projects using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_run_projects_arrival on public.proj_t_run_projects using btree (arrival_datetime) TABLESPACE pg_default;



create table public.psb_s_user (
  user_id bigserial not null,
  username text not null,
  email text not null,
  first_name character varying null,
  middle_name character varying null,
  last_name character varying null,
  address character varying null,
  phone character varying null,
  comp_id bigint null,
  dept_id bigint null,
  position character varying null,
  hire_date date null,
  status_id bigint null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  created_by bigint null,
  updated_by bigint null,
  auth_user_id uuid null,
  constraint psb_s_user_pkey primary key (user_id),
  constraint psb_s_user_auth_user_id_key unique (auth_user_id),
  constraint psb_s_user_email_key unique (email),
  constraint psb_s_user_username_key unique (username),
  constraint fk_user_department foreign KEY (dept_id) references psb_s_department (dept_id) on delete set null,
  constraint fk_user_status foreign KEY (status_id) references psb_s_status (status_id) on delete set null,
  constraint fk_user_company foreign KEY (comp_id) references psb_s_company (comp_id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_user_email on public.psb_s_user using btree (email) TABLESPACE pg_default;

create index IF not exists idx_user_company on public.psb_s_user using btree (comp_id) TABLESPACE pg_default;

create trigger invalidate_user_sessions
after
update on psb_s_user for EACH row when (
  new.is_active = false
  and old.is_active = true
)
execute FUNCTION invalidate_user_sessions_func ();