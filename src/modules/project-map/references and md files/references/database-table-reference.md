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
  order_received_date date null,
  scheduled_project_date date null,
  install_date date null,
  project_subtotal numeric(12, 2) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  updated_by uuid null,
  constraint proj_t_projects_pkey primary key (id),
  constraint proj_t_projects_status_id_fkey foreign KEY (status_id) references proj_s_project_status (status_id)
) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_status_id on public.proj_t_projects using btree (status_id) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_client_name on public.proj_t_projects using btree (client_name) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_state_code on public.proj_t_projects using btree (state_code) TABLESPACE pg_default;

create index IF not exists idx_proj_t_projects_dealer on public.proj_t_projects using btree (dealer) TABLESPACE pg_default;



create table public.proj_s_project_status (
  status_id serial not null,
  status_name text not null,
  status_description text null,
  is_active boolean not null default true,
  date_created timestamp with time zone not null default now(),
  display_color text null,
  display_order integer not null default 0,
  constraint proj_s_project_status_pkey primary key (status_id),
  constraint proj_s_project_status_status_name_key unique (status_name)
) TABLESPACE pg_default;

-- Colors retrieved from display_color column, not hardcoded.



create table public.proj_s_origin_addresses (
  id uuid not null default gen_random_uuid(),
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



create table public.proj_s_states (
  id uuid not null default gen_random_uuid(),
  state_name text not null,
  state_code text not null,
  display_color text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint proj_s_states_pkey primary key (id),
  constraint proj_s_states_state_name_key unique (state_name),
  constraint proj_s_states_state_code_key unique (state_code)
) TABLESPACE pg_default;
