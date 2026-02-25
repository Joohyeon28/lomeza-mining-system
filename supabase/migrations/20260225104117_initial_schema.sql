drop extension if exists "pg_net";

create schema if not exists "kalagadi";

create schema if not exists "sileko";

create schema if not exists "workshop";

create sequence "kalagadi"."haul_entries_id_seq";

create sequence "public"."haul_entries_id_seq";

create sequence "public"."production_entries_id_seq";

create sequence "public"."production_points_id_seq";

create sequence "sileko"."haul_entries_id_seq";


  create table "kalagadi"."asset_capabilities" (
    "asset_type" text not null,
    "bucket_capacity_m3" numeric not null,
    "avg_cycle_time_min" numeric,
    "notes" text
      );

-- Create custom roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supervisor') THEN
    CREATE ROLE supervisor;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'controller') THEN
    CREATE ROLE controller;
  END IF;
END
$$;

alter table "kalagadi"."asset_capabilities" enable row level security;


  create table "kalagadi"."assets" (
    "id" uuid not null default gen_random_uuid(),
    "asset_code" text,
    "asset_type" text,
    "site" text,
    "location" text,
    "status" text default 'UP'::text,
    "machine_role" text,
    "current_location" text default 'SITE'::text,
    "operational_status" text default 'ACTIVE'::text
      );


alter table "kalagadi"."assets" enable row level security;


  create table "kalagadi"."blocks" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_name" text not null,
    "status" text not null default 'PLANNED'::text,
    "sequence_order" integer,
    "created_at" timestamp without time zone default now(),
    "is_active" boolean default false
      );


alter table "kalagadi"."blocks" enable row level security;


  create table "kalagadi"."breakdown_events" (
    "id" uuid not null default gen_random_uuid(),
    "machine_id" uuid not null,
    "site" text not null,
    "start_datetime" timestamp without time zone not null,
    "end_datetime" timestamp without time zone,
    "reason" text not null,
    "reported_by" uuid not null,
    "resolved_by" uuid,
    "status" text not null,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."breakdown_events" enable row level security;


  create table "kalagadi"."breakdowns" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "site" text not null,
    "reason" text not null,
    "reported_by" uuid,
    "breakdown_start" timestamp without time zone not null,
    "breakdown_end" timestamp without time zone,
    "resolved_by" uuid,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."breakdowns" enable row level security;


  create table "kalagadi"."daily_plan_machines" (
    "id" uuid not null default gen_random_uuid(),
    "daily_plan_id" uuid,
    "machine_id" uuid not null,
    "material_type" text not null,
    "haul_distance" numeric not null
      );


alter table "kalagadi"."daily_plan_machines" enable row level security;


  create table "kalagadi"."daily_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "shift_date" date not null,
    "shift" text not null,
    "created_by" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."daily_plans" enable row level security;


  create table "kalagadi"."exceptions" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid not null,
    "site" character varying(50) not null,
    "reason" text not null,
    "severity" character varying(20),
    "status" character varying(20) default 'OPEN'::character varying,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "resolved_at" timestamp without time zone,
    "acknowledged_by" uuid,
    "acknowledged_at" timestamp without time zone,
    "resolved_by" uuid,
    "resolution_notes" text,
    "workshop_type" text default 'ON_SITE'::text,
    "escalated_at" timestamp without time zone,
    "breakdown_reason" text,
    "comment" text
      );


alter table "kalagadi"."exceptions" enable row level security;


  create table "kalagadi"."haul_entries" (
    "id" integer not null default nextval('kalagadi.haul_entries_id_seq'::regclass),
    "production_point_id" integer,
    "truck_id" uuid not null,
    "loads" integer not null,
    "bucket_size" integer not null,
    "cubes" integer generated always as ((loads * bucket_size)) stored
      );


alter table "kalagadi"."haul_entries" enable row level security;


  create table "kalagadi"."machine_shift_status" (
    "id" uuid not null default gen_random_uuid(),
    "shift_id" uuid,
    "asset_id" uuid,
    "planned_hours" integer not null,
    "breakdown_hours" integer default 0,
    "standby_hours" integer default 0,
    "productive_hours" integer default 0,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."machine_shift_status" enable row level security;


  create table "kalagadi"."machine_state" (
    "asset_id" uuid not null,
    "site" text not null,
    "state" text not null,
    "since_timestamp" timestamp without time zone not null default now(),
    "updated_by" uuid
      );


alter table "kalagadi"."machine_state" enable row level security;


  create table "kalagadi"."production_entries" (
    "id" integer not null default nextval('public.production_entries_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer,
    "shift" character varying(20),
    "machine_id" uuid,
    "activity" character varying(50),
    "material_type" character varying(50),
    "number_of_loads" integer,
    "haul_distance" numeric(6,2),
    "status" character varying(20) default 'PENDING'::character varying,
    "site" character varying(50),
    "submitted_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp without time zone,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "rejection_reason" text,
    "block_id" uuid
      );


alter table "kalagadi"."production_entries" enable row level security;


  create table "kalagadi"."production_points" (
    "id" integer not null default nextval('public.production_points_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer not null,
    "shift" text not null,
    "excavator_id" uuid not null,
    "material" text not null,
    "distance" integer,
    "site" text not null,
    "submitted_by" uuid not null,
    "status" text default 'PENDING'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."production_points" enable row level security;


  create table "kalagadi"."shift_definitions" (
    "code" text not null,
    "description" text,
    "start_hour" integer,
    "end_hour" integer,
    "duration_hours" integer not null
      );


alter table "kalagadi"."shift_definitions" enable row level security;


  create table "kalagadi"."shift_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_id" uuid,
    "plan_date" date not null,
    "shift_code" text,
    "target_total_m3" integer not null,
    "target_ob_m3" integer not null,
    "target_coal_m3" integer not null,
    "planned_excavators" integer not null,
    "planned_adts" integer not null,
    "planned_fels" integer not null,
    "mining_method" text,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "started" boolean default false
      );


alter table "kalagadi"."shift_plans" enable row level security;


  create table "kalagadi"."shift_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "planned_hours" integer not null,
    "productive_hours" integer not null
      );


alter table "kalagadi"."shift_templates" enable row level security;


  create table "kalagadi"."shifts" (
    "id" uuid not null default gen_random_uuid(),
    "shift_date" date not null,
    "crew" text not null,
    "template_id" uuid,
    "site" text not null,
    "is_active" boolean default true,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."shifts" enable row level security;


  create table "kalagadi"."users" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "password" text not null,
    "role" text not null,
    "site" text
      );


alter table "kalagadi"."users" enable row level security;


  create table "kalagadi"."workshop_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "source_site" text,
    "workshop_type" text,
    "reason" text,
    "severity" text,
    "status" text default 'OPEN'::text,
    "sent_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "expected_return" date,
    "created_by" uuid,
    "created_at" timestamp without time zone default now()
      );


alter table "kalagadi"."workshop_jobs" enable row level security;


  create table "public"."asset_capabilities" (
    "asset_type" text not null,
    "bucket_capacity_m3" numeric not null,
    "avg_cycle_time_min" numeric,
    "notes" text
      );



  create table "public"."assets" (
    "id" uuid not null default gen_random_uuid(),
    "asset_code" text,
    "asset_type" text,
    "site" text,
    "location" text,
    "status" text default 'UP'::text,
    "machine_role" text,
    "current_location" text default 'SITE'::text,
    "operational_status" text default 'ACTIVE'::text
      );


alter table "public"."assets" enable row level security;


  create table "public"."blocks" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_name" text not null,
    "status" text not null default 'PLANNED'::text,
    "sequence_order" integer,
    "created_at" timestamp without time zone default now(),
    "is_active" boolean default false
      );



  create table "public"."breakdown_events" (
    "id" uuid not null default gen_random_uuid(),
    "machine_id" uuid not null,
    "site" text not null,
    "start_datetime" timestamp without time zone not null,
    "end_datetime" timestamp without time zone,
    "reason" text not null,
    "reported_by" uuid not null,
    "resolved_by" uuid,
    "status" text not null,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."breakdowns" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "site" text not null,
    "reason" text not null,
    "reported_by" uuid,
    "breakdown_start" timestamp without time zone not null,
    "breakdown_end" timestamp without time zone,
    "resolved_by" uuid,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."breakdowns" enable row level security;


  create table "public"."daily_plan_machines" (
    "id" uuid not null default gen_random_uuid(),
    "daily_plan_id" uuid,
    "machine_id" uuid not null,
    "material_type" text not null,
    "haul_distance" numeric not null
      );


alter table "public"."daily_plan_machines" enable row level security;


  create table "public"."daily_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "shift_date" date not null,
    "shift" text not null,
    "created_by" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."daily_plans" enable row level security;


  create table "public"."exceptions" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid not null,
    "site" character varying(50) not null,
    "reason" text not null,
    "severity" character varying(20),
    "status" character varying(20) default 'OPEN'::character varying,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "resolved_at" timestamp without time zone,
    "acknowledged_by" uuid,
    "acknowledged_at" timestamp without time zone,
    "resolved_by" uuid,
    "resolution_notes" text,
    "workshop_type" text default 'ON_SITE'::text,
    "escalated_at" timestamp without time zone,
    "breakdown_reason" text,
    "comment" text
      );



  create table "public"."haul_entries" (
    "id" integer not null default nextval('public.haul_entries_id_seq'::regclass),
    "production_point_id" integer,
    "truck_id" uuid not null,
    "loads" integer not null,
    "bucket_size" integer not null,
    "cubes" integer generated always as ((loads * bucket_size)) stored
      );



  create table "public"."machine_shift_status" (
    "id" uuid not null default gen_random_uuid(),
    "shift_id" uuid,
    "asset_id" uuid,
    "planned_hours" integer not null,
    "breakdown_hours" integer default 0,
    "standby_hours" integer default 0,
    "productive_hours" integer default 0,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."machine_state" (
    "asset_id" uuid not null,
    "site" text not null,
    "state" text not null,
    "since_timestamp" timestamp without time zone not null default now(),
    "updated_by" uuid
      );



  create table "public"."production_entries" (
    "id" integer not null default nextval('public.production_entries_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer,
    "shift" character varying(20),
    "machine_id" uuid,
    "activity" character varying(50),
    "material_type" character varying(50),
    "number_of_loads" integer,
    "haul_distance" numeric(6,2),
    "status" character varying(20) default 'PENDING'::character varying,
    "site" character varying(50),
    "submitted_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp without time zone,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "rejection_reason" text,
    "block_id" uuid
      );


alter table "public"."production_entries" enable row level security;


  create table "public"."production_points" (
    "id" integer not null default nextval('public.production_points_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer not null,
    "shift" text not null,
    "excavator_id" uuid not null,
    "material" text not null,
    "distance" integer,
    "site" text not null,
    "submitted_by" uuid not null,
    "status" text default 'PENDING'::text,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."shift_definitions" (
    "code" text not null,
    "description" text,
    "start_hour" integer,
    "end_hour" integer,
    "duration_hours" integer not null
      );


alter table "public"."shift_definitions" enable row level security;


  create table "public"."shift_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_id" uuid,
    "plan_date" date not null,
    "shift_code" text,
    "target_total_m3" integer not null,
    "target_ob_m3" integer not null,
    "target_coal_m3" integer not null,
    "planned_excavators" integer not null,
    "planned_adts" integer not null,
    "planned_fels" integer not null,
    "mining_method" text,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "started" boolean default false
      );


alter table "public"."shift_plans" enable row level security;


  create table "public"."shift_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "planned_hours" integer not null,
    "productive_hours" integer not null
      );



  create table "public"."shifts" (
    "id" uuid not null default gen_random_uuid(),
    "shift_date" date not null,
    "crew" text not null,
    "template_id" uuid,
    "site" text not null,
    "is_active" boolean default true,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "password" text not null,
    "role" text not null,
    "site" text
      );


alter table "public"."users" enable row level security;


  create table "public"."workshop_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "source_site" text,
    "workshop_type" text,
    "reason" text,
    "severity" text,
    "status" text default 'OPEN'::text,
    "sent_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "expected_return" date,
    "created_by" uuid,
    "created_at" timestamp without time zone default now()
      );



  create table "sileko"."asset_capabilities" (
    "asset_type" text not null,
    "bucket_capacity_m3" numeric not null,
    "avg_cycle_time_min" numeric,
    "notes" text
      );


alter table "sileko"."asset_capabilities" enable row level security;


  create table "sileko"."assets" (
    "id" uuid not null default gen_random_uuid(),
    "asset_code" text,
    "asset_type" text,
    "site" text,
    "location" text,
    "status" text default 'UP'::text,
    "machine_role" text,
    "current_location" text default 'SITE'::text,
    "operational_status" text default 'ACTIVE'::text
      );


alter table "sileko"."assets" enable row level security;


  create table "sileko"."blocks" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_name" text not null,
    "status" text not null default 'PLANNED'::text,
    "sequence_order" integer,
    "created_at" timestamp without time zone default now(),
    "is_active" boolean default false
      );


alter table "sileko"."blocks" enable row level security;


  create table "sileko"."breakdown_events" (
    "id" uuid not null default gen_random_uuid(),
    "machine_id" uuid not null,
    "site" text not null,
    "start_datetime" timestamp without time zone not null,
    "end_datetime" timestamp without time zone,
    "reason" text not null,
    "reported_by" uuid not null,
    "resolved_by" uuid,
    "status" text not null,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."breakdown_events" enable row level security;


  create table "sileko"."breakdowns" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "site" text not null,
    "reason" text not null,
    "reported_by" uuid,
    "breakdown_start" timestamp without time zone not null,
    "breakdown_end" timestamp without time zone,
    "resolved_by" uuid,
    "created_at" timestamp without time zone default now(),
    "status" text default 'OPEN'::text,
    "operator" text,
    "acknowledged" boolean default false,
    "acknowledged_by" text,
    "acknowledged_at" timestamp with time zone,
    "other_reason" text
      );


alter table "sileko"."breakdowns" enable row level security;


  create table "sileko"."daily_plan_machines" (
    "id" uuid not null default gen_random_uuid(),
    "daily_plan_id" uuid,
    "machine_id" uuid not null,
    "material_type" text not null,
    "haul_distance" numeric not null
      );


alter table "sileko"."daily_plan_machines" enable row level security;


  create table "sileko"."daily_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "shift_date" date not null,
    "shift" text not null,
    "created_by" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."daily_plans" enable row level security;


  create table "sileko"."exceptions" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid not null,
    "site" character varying(50) not null,
    "reason" text not null,
    "severity" character varying(20),
    "status" character varying(20) default 'OPEN'::character varying,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "resolved_at" timestamp without time zone,
    "acknowledged_by" uuid,
    "acknowledged_at" timestamp without time zone,
    "resolved_by" uuid,
    "resolution_notes" text,
    "workshop_type" text default 'ON_SITE'::text,
    "escalated_at" timestamp without time zone,
    "breakdown_reason" text,
    "comment" text
      );


alter table "sileko"."exceptions" enable row level security;


  create table "sileko"."haul_entries" (
    "id" integer not null default nextval('sileko.haul_entries_id_seq'::regclass),
    "production_point_id" integer,
    "truck_id" uuid not null,
    "loads" integer not null,
    "bucket_size" integer not null,
    "cubes" integer generated always as ((loads * bucket_size)) stored
      );


alter table "sileko"."haul_entries" enable row level security;


  create table "sileko"."machine_shift_status" (
    "id" uuid not null default gen_random_uuid(),
    "shift_id" uuid,
    "asset_id" uuid,
    "planned_hours" integer not null,
    "breakdown_hours" integer default 0,
    "standby_hours" integer default 0,
    "productive_hours" integer default 0,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."machine_shift_status" enable row level security;


  create table "sileko"."machine_state" (
    "asset_id" uuid not null,
    "site" text not null,
    "state" text not null,
    "since_timestamp" timestamp without time zone not null default now(),
    "updated_by" uuid
      );


alter table "sileko"."machine_state" enable row level security;


  create table "sileko"."production_entries" (
    "id" integer not null default nextval('public.production_entries_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer,
    "shift" character varying(20),
    "machine_id" uuid,
    "activity" character varying(50),
    "material_type" character varying(50),
    "number_of_loads" integer,
    "haul_distance" numeric(6,2),
    "status" character varying(20) default 'PENDING'::character varying,
    "site" character varying(50),
    "submitted_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp without time zone,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "rejection_reason" text,
    "block_id" uuid,
    "operator" text
      );


alter table "sileko"."production_entries" enable row level security;


  create table "sileko"."production_points" (
    "id" integer not null default nextval('public.production_points_id_seq'::regclass),
    "shift_date" date not null,
    "hour" integer not null,
    "shift" text not null,
    "excavator_id" uuid not null,
    "material" text not null,
    "distance" integer,
    "site" text not null,
    "submitted_by" uuid not null,
    "status" text default 'PENDING'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."production_points" enable row level security;


  create table "sileko"."shift_definitions" (
    "code" text not null,
    "description" text,
    "start_hour" integer,
    "end_hour" integer,
    "duration_hours" integer not null
      );


alter table "sileko"."shift_definitions" enable row level security;


  create table "sileko"."shift_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site" text not null,
    "block_id" uuid,
    "plan_date" date not null,
    "shift_code" text,
    "target_total_m3" integer not null,
    "target_ob_m3" integer not null,
    "target_coal_m3" integer not null,
    "planned_excavators" integer not null,
    "planned_adts" integer not null,
    "planned_fels" integer not null,
    "mining_method" text,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "started" boolean default false
      );


alter table "sileko"."shift_plans" enable row level security;


  create table "sileko"."shift_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "planned_hours" integer not null,
    "productive_hours" integer not null
      );


alter table "sileko"."shift_templates" enable row level security;


  create table "sileko"."shifts" (
    "id" uuid not null default gen_random_uuid(),
    "shift_date" date not null,
    "crew" text not null,
    "template_id" uuid,
    "site" text not null,
    "is_active" boolean default true,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."shifts" enable row level security;


  create table "sileko"."users" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "password" text not null,
    "role" text not null,
    "site" text
      );


alter table "sileko"."users" enable row level security;


  create table "sileko"."workshop_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "source_site" text,
    "workshop_type" text,
    "reason" text,
    "severity" text,
    "status" text default 'OPEN'::text,
    "sent_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "expected_return" date,
    "created_by" uuid,
    "created_at" timestamp without time zone default now()
      );


alter table "sileko"."workshop_jobs" enable row level security;


  create table "workshop"."assets" (
    "id" uuid not null default gen_random_uuid(),
    "asset_code" text not null,
    "asset_type" text not null,
    "site" text not null,
    "location" text default 'Workshop'::text,
    "status" text default 'ACTIVE'::text,
    "machine_role" text,
    "operational_status" text default 'ACTIVE'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "workshop"."assets" enable row level security;


  create table "workshop"."breakdowns" (
    "id" uuid not null default gen_random_uuid(),
    "asset_id" uuid,
    "site" text not null,
    "reason" text not null,
    "reported_by" uuid,
    "breakdown_start" timestamp without time zone not null,
    "breakdown_end" timestamp without time zone,
    "resolved_by" uuid,
    "created_at" timestamp without time zone default now(),
    "status" text default 'OPEN'::text,
    "operator" text,
    "acknowledged" boolean default false,
    "acknowledged_by" text,
    "acknowledged_at" timestamp with time zone,
    "other_reason" text
      );


alter table "workshop"."breakdowns" enable row level security;

alter sequence "public"."haul_entries_id_seq" owned by "public"."haul_entries"."id";

alter sequence "public"."production_entries_id_seq" owned by "public"."production_entries"."id";

alter sequence "public"."production_points_id_seq" owned by "public"."production_points"."id";

CREATE UNIQUE INDEX asset_capabilities_pkey ON kalagadi.asset_capabilities USING btree (asset_type);

CREATE UNIQUE INDEX assets_asset_code_key ON kalagadi.assets USING btree (asset_code);

CREATE UNIQUE INDEX assets_pkey ON kalagadi.assets USING btree (id);

CREATE UNIQUE INDEX blocks_pkey ON kalagadi.blocks USING btree (id);

CREATE UNIQUE INDEX blocks_site_idx ON kalagadi.blocks USING btree (site) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX breakdown_events_pkey ON kalagadi.breakdown_events USING btree (id);

CREATE UNIQUE INDEX breakdowns_pkey ON kalagadi.breakdowns USING btree (id);

CREATE UNIQUE INDEX daily_plan_machines_pkey ON kalagadi.daily_plan_machines USING btree (id);

CREATE UNIQUE INDEX daily_plans_pkey ON kalagadi.daily_plans USING btree (id);

CREATE UNIQUE INDEX daily_plans_site_shift_date_shift_key ON kalagadi.daily_plans USING btree (site, shift_date, shift);

CREATE UNIQUE INDEX daily_plans_site_shift_date_shift_key_idx_kalagadi ON kalagadi.daily_plans USING btree (site, shift_date, shift);

CREATE UNIQUE INDEX exceptions_pkey ON kalagadi.exceptions USING btree (id);

CREATE UNIQUE INDEX haul_entries_pkey ON kalagadi.haul_entries USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_pkey ON kalagadi.machine_shift_status USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_shift_id_asset_id_key ON kalagadi.machine_shift_status USING btree (shift_id, asset_id);

CREATE UNIQUE INDEX machine_state_pkey ON kalagadi.machine_state USING btree (asset_id);

CREATE UNIQUE INDEX one_active_block_per_site ON kalagadi.blocks USING btree (site) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_idx ON kalagadi.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_idx1 ON kalagadi.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_key ON kalagadi.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_shift_idx ON kalagadi.production_entries USING btree (machine_id, shift_date, hour, shift) WHERE ((status)::text <> 'REJECTED'::text);

CREATE UNIQUE INDEX production_entries_pkey ON kalagadi.production_entries USING btree (id);

CREATE UNIQUE INDEX production_points_pkey ON kalagadi.production_points USING btree (id);

CREATE UNIQUE INDEX shift_definitions_pkey ON kalagadi.shift_definitions USING btree (code);

CREATE UNIQUE INDEX shift_plans_pkey ON kalagadi.shift_plans USING btree (id);

CREATE UNIQUE INDEX shift_templates_pkey ON kalagadi.shift_templates USING btree (id);

CREATE UNIQUE INDEX shifts_pkey ON kalagadi.shifts USING btree (id);

CREATE UNIQUE INDEX shifts_shift_date_crew_site_key ON kalagadi.shifts USING btree (shift_date, crew, site);

CREATE UNIQUE INDEX unique_machine_hour_entry ON kalagadi.production_entries USING btree (machine_id, shift_date, hour, shift) WHERE ((status)::text <> 'REJECTED'::text);

CREATE UNIQUE INDEX unique_machine_hour_shift ON kalagadi.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX uq_machine_shift_hour ON kalagadi.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX users_email_key ON kalagadi.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON kalagadi.users USING btree (id);

CREATE UNIQUE INDEX workshop_jobs_pkey ON kalagadi.workshop_jobs USING btree (id);

CREATE UNIQUE INDEX asset_capabilities_pkey ON public.asset_capabilities USING btree (asset_type);

CREATE UNIQUE INDEX assets_pkey ON public.assets USING btree (id);

CREATE UNIQUE INDEX blocks_pkey ON public.blocks USING btree (id);

CREATE UNIQUE INDEX breakdown_events_pkey ON public.breakdown_events USING btree (id);

CREATE UNIQUE INDEX breakdowns_pkey ON public.breakdowns USING btree (id);

CREATE UNIQUE INDEX daily_plan_machines_pkey ON public.daily_plan_machines USING btree (id);

CREATE UNIQUE INDEX daily_plans_pkey ON public.daily_plans USING btree (id);

CREATE UNIQUE INDEX daily_plans_site_shift_date_shift_key ON public.daily_plans USING btree (site, shift_date, shift);

CREATE UNIQUE INDEX exceptions_pkey ON public.exceptions USING btree (id);

CREATE UNIQUE INDEX haul_entries_pkey ON public.haul_entries USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_pkey ON public.machine_shift_status USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_shift_id_asset_id_key ON public.machine_shift_status USING btree (shift_id, asset_id);

CREATE UNIQUE INDEX machine_state_pkey ON public.machine_state USING btree (asset_id);

CREATE UNIQUE INDEX one_active_block_per_site ON public.blocks USING btree (site) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX production_entries_pkey ON public.production_entries USING btree (id);

CREATE UNIQUE INDEX production_points_pkey ON public.production_points USING btree (id);

CREATE UNIQUE INDEX shift_definitions_pkey ON public.shift_definitions USING btree (code);

CREATE UNIQUE INDEX shift_plans_pkey ON public.shift_plans USING btree (id);

CREATE UNIQUE INDEX shift_templates_pkey ON public.shift_templates USING btree (id);

CREATE UNIQUE INDEX shifts_pkey ON public.shifts USING btree (id);

CREATE UNIQUE INDEX shifts_shift_date_crew_site_key ON public.shifts USING btree (shift_date, crew, site);

CREATE UNIQUE INDEX unique_asset_code ON public.assets USING btree (asset_code);

CREATE UNIQUE INDEX unique_machine_hour ON public.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX unique_machine_hour_entry ON public.production_entries USING btree (machine_id, shift_date, hour, shift) WHERE ((status)::text <> 'REJECTED'::text);

CREATE UNIQUE INDEX unique_machine_hour_shift ON public.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX uq_machine_shift_hour ON public.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX workshop_jobs_pkey ON public.workshop_jobs USING btree (id);

CREATE UNIQUE INDEX asset_capabilities_pkey ON sileko.asset_capabilities USING btree (asset_type);

CREATE UNIQUE INDEX assets_asset_code_key ON sileko.assets USING btree (asset_code);

CREATE UNIQUE INDEX assets_pkey ON sileko.assets USING btree (id);

CREATE UNIQUE INDEX blocks_pkey ON sileko.blocks USING btree (id);

CREATE UNIQUE INDEX blocks_site_idx ON sileko.blocks USING btree (site) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX breakdown_events_pkey ON sileko.breakdown_events USING btree (id);

CREATE UNIQUE INDEX breakdowns_pkey ON sileko.breakdowns USING btree (id);

CREATE UNIQUE INDEX daily_plan_machines_pkey ON sileko.daily_plan_machines USING btree (id);

CREATE UNIQUE INDEX daily_plans_pkey ON sileko.daily_plans USING btree (id);

CREATE UNIQUE INDEX daily_plans_site_shift_date_shift_key ON sileko.daily_plans USING btree (site, shift_date, shift);

CREATE UNIQUE INDEX daily_plans_site_shift_date_shift_key_idx ON sileko.daily_plans USING btree (site, shift_date, shift);

CREATE UNIQUE INDEX exceptions_pkey ON sileko.exceptions USING btree (id);

CREATE UNIQUE INDEX haul_entries_pkey ON sileko.haul_entries USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_pkey ON sileko.machine_shift_status USING btree (id);

CREATE UNIQUE INDEX machine_shift_status_shift_id_asset_id_key ON sileko.machine_shift_status USING btree (shift_id, asset_id);

CREATE UNIQUE INDEX machine_state_pkey ON sileko.machine_state USING btree (asset_id);

CREATE UNIQUE INDEX one_active_block_per_site ON sileko.blocks USING btree (site) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_idx ON sileko.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_idx1 ON sileko.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_key ON sileko.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX production_entries_machine_id_shift_date_hour_shift_idx ON sileko.production_entries USING btree (machine_id, shift_date, hour, shift) WHERE ((status)::text <> 'REJECTED'::text);

CREATE UNIQUE INDEX production_entries_pkey ON sileko.production_entries USING btree (id);

CREATE UNIQUE INDEX production_points_pkey ON sileko.production_points USING btree (id);

CREATE UNIQUE INDEX shift_definitions_pkey ON sileko.shift_definitions USING btree (code);

CREATE UNIQUE INDEX shift_plans_pkey ON sileko.shift_plans USING btree (id);

CREATE UNIQUE INDEX shift_templates_pkey ON sileko.shift_templates USING btree (id);

CREATE UNIQUE INDEX shifts_pkey ON sileko.shifts USING btree (id);

CREATE UNIQUE INDEX shifts_shift_date_crew_site_key ON sileko.shifts USING btree (shift_date, crew, site);

CREATE UNIQUE INDEX unique_machine_hour_entry ON sileko.production_entries USING btree (machine_id, shift_date, hour, shift) WHERE ((status)::text <> 'REJECTED'::text);

CREATE UNIQUE INDEX unique_machine_hour_shift ON sileko.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX uq_machine_shift_hour ON sileko.production_entries USING btree (machine_id, shift_date, hour);

CREATE UNIQUE INDEX users_email_key ON sileko.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON sileko.users USING btree (id);

CREATE UNIQUE INDEX workshop_jobs_pkey ON sileko.workshop_jobs USING btree (id);

CREATE UNIQUE INDEX assets_asset_code_key ON workshop.assets USING btree (asset_code);

CREATE UNIQUE INDEX assets_pkey ON workshop.assets USING btree (id);

CREATE UNIQUE INDEX breakdowns_pkey ON workshop.breakdowns USING btree (id);

CREATE INDEX idx_workshop_assets_code ON workshop.assets USING btree (asset_code);

CREATE INDEX idx_workshop_assets_site ON workshop.assets USING btree (site);

alter table "kalagadi"."asset_capabilities" add constraint "asset_capabilities_pkey" PRIMARY KEY using index "asset_capabilities_pkey";

alter table "kalagadi"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "kalagadi"."blocks" add constraint "blocks_pkey" PRIMARY KEY using index "blocks_pkey";

alter table "kalagadi"."breakdown_events" add constraint "breakdown_events_pkey" PRIMARY KEY using index "breakdown_events_pkey";

alter table "kalagadi"."breakdowns" add constraint "breakdowns_pkey" PRIMARY KEY using index "breakdowns_pkey";

alter table "kalagadi"."daily_plan_machines" add constraint "daily_plan_machines_pkey" PRIMARY KEY using index "daily_plan_machines_pkey";

alter table "kalagadi"."daily_plans" add constraint "daily_plans_pkey" PRIMARY KEY using index "daily_plans_pkey";

alter table "kalagadi"."exceptions" add constraint "exceptions_pkey" PRIMARY KEY using index "exceptions_pkey";

alter table "kalagadi"."haul_entries" add constraint "haul_entries_pkey" PRIMARY KEY using index "haul_entries_pkey";

alter table "kalagadi"."machine_shift_status" add constraint "machine_shift_status_pkey" PRIMARY KEY using index "machine_shift_status_pkey";

alter table "kalagadi"."machine_state" add constraint "machine_state_pkey" PRIMARY KEY using index "machine_state_pkey";

alter table "kalagadi"."production_entries" add constraint "production_entries_pkey" PRIMARY KEY using index "production_entries_pkey";

alter table "kalagadi"."production_points" add constraint "production_points_pkey" PRIMARY KEY using index "production_points_pkey";

alter table "kalagadi"."shift_definitions" add constraint "shift_definitions_pkey" PRIMARY KEY using index "shift_definitions_pkey";

alter table "kalagadi"."shift_plans" add constraint "shift_plans_pkey" PRIMARY KEY using index "shift_plans_pkey";

alter table "kalagadi"."shift_templates" add constraint "shift_templates_pkey" PRIMARY KEY using index "shift_templates_pkey";

alter table "kalagadi"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "kalagadi"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "kalagadi"."workshop_jobs" add constraint "workshop_jobs_pkey" PRIMARY KEY using index "workshop_jobs_pkey";

alter table "public"."asset_capabilities" add constraint "asset_capabilities_pkey" PRIMARY KEY using index "asset_capabilities_pkey";

alter table "public"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "public"."blocks" add constraint "blocks_pkey" PRIMARY KEY using index "blocks_pkey";

alter table "public"."breakdown_events" add constraint "breakdown_events_pkey" PRIMARY KEY using index "breakdown_events_pkey";

alter table "public"."breakdowns" add constraint "breakdowns_pkey" PRIMARY KEY using index "breakdowns_pkey";

alter table "public"."daily_plan_machines" add constraint "daily_plan_machines_pkey" PRIMARY KEY using index "daily_plan_machines_pkey";

alter table "public"."daily_plans" add constraint "daily_plans_pkey" PRIMARY KEY using index "daily_plans_pkey";

alter table "public"."exceptions" add constraint "exceptions_pkey" PRIMARY KEY using index "exceptions_pkey";

alter table "public"."haul_entries" add constraint "haul_entries_pkey" PRIMARY KEY using index "haul_entries_pkey";

alter table "public"."machine_shift_status" add constraint "machine_shift_status_pkey" PRIMARY KEY using index "machine_shift_status_pkey";

alter table "public"."machine_state" add constraint "machine_state_pkey" PRIMARY KEY using index "machine_state_pkey";

alter table "public"."production_entries" add constraint "production_entries_pkey" PRIMARY KEY using index "production_entries_pkey";

alter table "public"."production_points" add constraint "production_points_pkey" PRIMARY KEY using index "production_points_pkey";

alter table "public"."shift_definitions" add constraint "shift_definitions_pkey" PRIMARY KEY using index "shift_definitions_pkey";

alter table "public"."shift_plans" add constraint "shift_plans_pkey" PRIMARY KEY using index "shift_plans_pkey";

alter table "public"."shift_templates" add constraint "shift_templates_pkey" PRIMARY KEY using index "shift_templates_pkey";

alter table "public"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."workshop_jobs" add constraint "workshop_jobs_pkey" PRIMARY KEY using index "workshop_jobs_pkey";

alter table "sileko"."asset_capabilities" add constraint "asset_capabilities_pkey" PRIMARY KEY using index "asset_capabilities_pkey";

alter table "sileko"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "sileko"."blocks" add constraint "blocks_pkey" PRIMARY KEY using index "blocks_pkey";

alter table "sileko"."breakdown_events" add constraint "breakdown_events_pkey" PRIMARY KEY using index "breakdown_events_pkey";

alter table "sileko"."breakdowns" add constraint "breakdowns_pkey" PRIMARY KEY using index "breakdowns_pkey";

alter table "sileko"."daily_plan_machines" add constraint "daily_plan_machines_pkey" PRIMARY KEY using index "daily_plan_machines_pkey";

alter table "sileko"."daily_plans" add constraint "daily_plans_pkey" PRIMARY KEY using index "daily_plans_pkey";

alter table "sileko"."exceptions" add constraint "exceptions_pkey" PRIMARY KEY using index "exceptions_pkey";

alter table "sileko"."haul_entries" add constraint "haul_entries_pkey" PRIMARY KEY using index "haul_entries_pkey";

alter table "sileko"."machine_shift_status" add constraint "machine_shift_status_pkey" PRIMARY KEY using index "machine_shift_status_pkey";

alter table "sileko"."machine_state" add constraint "machine_state_pkey" PRIMARY KEY using index "machine_state_pkey";

alter table "sileko"."production_entries" add constraint "production_entries_pkey" PRIMARY KEY using index "production_entries_pkey";

alter table "sileko"."production_points" add constraint "production_points_pkey" PRIMARY KEY using index "production_points_pkey";

alter table "sileko"."shift_definitions" add constraint "shift_definitions_pkey" PRIMARY KEY using index "shift_definitions_pkey";

alter table "sileko"."shift_plans" add constraint "shift_plans_pkey" PRIMARY KEY using index "shift_plans_pkey";

alter table "sileko"."shift_templates" add constraint "shift_templates_pkey" PRIMARY KEY using index "shift_templates_pkey";

alter table "sileko"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "sileko"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "sileko"."workshop_jobs" add constraint "workshop_jobs_pkey" PRIMARY KEY using index "workshop_jobs_pkey";

alter table "workshop"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "workshop"."breakdowns" add constraint "breakdowns_pkey" PRIMARY KEY using index "breakdowns_pkey";

alter table "kalagadi"."assets" add constraint "assets_asset_code_key" UNIQUE using index "assets_asset_code_key";

alter table "kalagadi"."blocks" add constraint "blocks_status_check" CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'COMPLETED'::text]))) not valid;

alter table "kalagadi"."blocks" validate constraint "blocks_status_check";

alter table "kalagadi"."breakdown_events" add constraint "breakdown_events_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text]))) not valid;

alter table "kalagadi"."breakdown_events" validate constraint "breakdown_events_status_check";

alter table "kalagadi"."breakdowns" add constraint "breakdowns_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."breakdowns" validate constraint "breakdowns_asset_id_fkey";

alter table "kalagadi"."breakdowns" add constraint "breakdowns_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."breakdowns" validate constraint "breakdowns_reported_by_fkey";

alter table "kalagadi"."breakdowns" add constraint "breakdowns_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."breakdowns" validate constraint "breakdowns_resolved_by_fkey";

alter table "kalagadi"."daily_plan_machines" add constraint "daily_plan_machines_daily_plan_id_fkey" FOREIGN KEY (daily_plan_id) REFERENCES kalagadi.daily_plans(id) ON DELETE CASCADE not valid;

alter table "kalagadi"."daily_plan_machines" validate constraint "daily_plan_machines_daily_plan_id_fkey";

alter table "kalagadi"."daily_plans" add constraint "daily_plans_site_shift_date_shift_key" UNIQUE using index "daily_plans_site_shift_date_shift_key";

alter table "kalagadi"."exceptions" add constraint "exceptions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."exceptions" validate constraint "exceptions_asset_id_fkey";

alter table "kalagadi"."exceptions" add constraint "exceptions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."exceptions" validate constraint "exceptions_created_by_fkey";

alter table "kalagadi"."exceptions" add constraint "exceptions_status_check" CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('ACKNOWLEDGED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('RESOLVED'::character varying)::text]))) not valid;

alter table "kalagadi"."exceptions" validate constraint "exceptions_status_check";

alter table "kalagadi"."exceptions" add constraint "exceptions_workshop_type_check" CHECK ((workshop_type = ANY (ARRAY['ON_SITE'::text, 'SUNDRA'::text]))) not valid;

alter table "kalagadi"."exceptions" validate constraint "exceptions_workshop_type_check";

alter table "kalagadi"."haul_entries" add constraint "haul_entries_production_point_id_fkey" FOREIGN KEY (production_point_id) REFERENCES kalagadi.production_points(id) not valid;

alter table "kalagadi"."haul_entries" validate constraint "haul_entries_production_point_id_fkey";

alter table "kalagadi"."machine_shift_status" add constraint "machine_shift_status_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."machine_shift_status" validate constraint "machine_shift_status_asset_id_fkey";

alter table "kalagadi"."machine_shift_status" add constraint "machine_shift_status_shift_id_asset_id_key" UNIQUE using index "machine_shift_status_shift_id_asset_id_key";

alter table "kalagadi"."machine_shift_status" add constraint "machine_shift_status_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES kalagadi.shifts(id) not valid;

alter table "kalagadi"."machine_shift_status" validate constraint "machine_shift_status_shift_id_fkey";

alter table "kalagadi"."machine_state" add constraint "machine_state_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."machine_state" validate constraint "machine_state_asset_id_fkey";

alter table "kalagadi"."machine_state" add constraint "machine_state_state_check" CHECK ((state = ANY (ARRAY['AVAILABLE'::text, 'PRODUCING'::text, 'STANDBY'::text, 'BREAKDOWN'::text]))) not valid;

alter table "kalagadi"."machine_state" validate constraint "machine_state_state_check";

alter table "kalagadi"."machine_state" add constraint "machine_state_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."machine_state" validate constraint "machine_state_updated_by_fkey";

alter table "kalagadi"."production_entries" add constraint "production_block_fk" FOREIGN KEY (block_id) REFERENCES kalagadi.blocks(id) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_block_fk";

alter table "kalagadi"."production_entries" add constraint "production_entries_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_entries_approved_by_fkey";

alter table "kalagadi"."production_entries" add constraint "production_entries_hour_check" CHECK (((hour >= 0) AND (hour <= 23))) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_entries_hour_check";

alter table "kalagadi"."production_entries" add constraint "production_entries_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_entries_machine_id_fkey";

alter table "kalagadi"."production_entries" add constraint "production_entries_machine_id_shift_date_hour_key" UNIQUE using index "production_entries_machine_id_shift_date_hour_key";

alter table "kalagadi"."production_entries" add constraint "production_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES kalagadi.users(id) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_entries_submitted_by_fkey";

alter table "kalagadi"."production_entries" add constraint "production_status_check" CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text]))) not valid;

alter table "kalagadi"."production_entries" validate constraint "production_status_check";

alter table "kalagadi"."shift_plans" add constraint "shift_plans_block_id_fkey" FOREIGN KEY (block_id) REFERENCES kalagadi.blocks(id) not valid;

alter table "kalagadi"."shift_plans" validate constraint "shift_plans_block_id_fkey";

alter table "kalagadi"."shift_plans" add constraint "shift_plans_mining_method_check" CHECK ((mining_method = ANY (ARRAY['BLASTING'::text, 'FREE_DIGGING'::text]))) not valid;

alter table "kalagadi"."shift_plans" validate constraint "shift_plans_mining_method_check";

alter table "kalagadi"."shift_plans" add constraint "shift_plans_shift_code_fkey" FOREIGN KEY (shift_code) REFERENCES kalagadi.shift_definitions(code) not valid;

alter table "kalagadi"."shift_plans" validate constraint "shift_plans_shift_code_fkey";

alter table "kalagadi"."shifts" add constraint "shifts_shift_date_crew_site_key" UNIQUE using index "shifts_shift_date_crew_site_key";

alter table "kalagadi"."shifts" add constraint "shifts_template_id_fkey" FOREIGN KEY (template_id) REFERENCES kalagadi.shift_templates(id) not valid;

alter table "kalagadi"."shifts" validate constraint "shifts_template_id_fkey";

alter table "kalagadi"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "kalagadi"."workshop_jobs" add constraint "workshop_jobs_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES kalagadi.assets(id) not valid;

alter table "kalagadi"."workshop_jobs" validate constraint "workshop_jobs_asset_id_fkey";

alter table "public"."assets" add constraint "unique_asset_code" UNIQUE using index "unique_asset_code";

alter table "public"."blocks" add constraint "blocks_status_check" CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'COMPLETED'::text]))) not valid;

alter table "public"."blocks" validate constraint "blocks_status_check";

alter table "public"."breakdown_events" add constraint "breakdown_events_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text]))) not valid;

alter table "public"."breakdown_events" validate constraint "breakdown_events_status_check";

alter table "public"."breakdowns" add constraint "breakdowns_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.assets(id) not valid;

alter table "public"."breakdowns" validate constraint "breakdowns_asset_id_fkey";

alter table "public"."breakdowns" add constraint "breakdowns_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.users(id) not valid;

alter table "public"."breakdowns" validate constraint "breakdowns_reported_by_fkey";

alter table "public"."breakdowns" add constraint "breakdowns_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public.users(id) not valid;

alter table "public"."breakdowns" validate constraint "breakdowns_resolved_by_fkey";

alter table "public"."daily_plan_machines" add constraint "daily_plan_machines_daily_plan_id_fkey" FOREIGN KEY (daily_plan_id) REFERENCES public.daily_plans(id) ON DELETE CASCADE not valid;

alter table "public"."daily_plan_machines" validate constraint "daily_plan_machines_daily_plan_id_fkey";

alter table "public"."daily_plans" add constraint "daily_plans_site_shift_date_shift_key" UNIQUE using index "daily_plans_site_shift_date_shift_key";

alter table "public"."exceptions" add constraint "exceptions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.assets(id) not valid;

alter table "public"."exceptions" validate constraint "exceptions_asset_id_fkey";

alter table "public"."exceptions" add constraint "exceptions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."exceptions" validate constraint "exceptions_created_by_fkey";

alter table "public"."exceptions" add constraint "exceptions_status_check" CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('ACKNOWLEDGED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('RESOLVED'::character varying)::text]))) not valid;

alter table "public"."exceptions" validate constraint "exceptions_status_check";

alter table "public"."exceptions" add constraint "exceptions_workshop_type_check" CHECK ((workshop_type = ANY (ARRAY['ON_SITE'::text, 'SUNDRA'::text]))) not valid;

alter table "public"."exceptions" validate constraint "exceptions_workshop_type_check";

alter table "public"."haul_entries" add constraint "haul_entries_production_point_id_fkey" FOREIGN KEY (production_point_id) REFERENCES public.production_points(id) not valid;

alter table "public"."haul_entries" validate constraint "haul_entries_production_point_id_fkey";

alter table "public"."machine_shift_status" add constraint "machine_shift_status_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.assets(id) not valid;

alter table "public"."machine_shift_status" validate constraint "machine_shift_status_asset_id_fkey";

alter table "public"."machine_shift_status" add constraint "machine_shift_status_shift_id_asset_id_key" UNIQUE using index "machine_shift_status_shift_id_asset_id_key";

alter table "public"."machine_shift_status" add constraint "machine_shift_status_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES public.shifts(id) not valid;

alter table "public"."machine_shift_status" validate constraint "machine_shift_status_shift_id_fkey";

alter table "public"."machine_state" add constraint "machine_state_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.assets(id) not valid;

alter table "public"."machine_state" validate constraint "machine_state_asset_id_fkey";

alter table "public"."machine_state" add constraint "machine_state_state_check" CHECK ((state = ANY (ARRAY['AVAILABLE'::text, 'PRODUCING'::text, 'STANDBY'::text, 'BREAKDOWN'::text]))) not valid;

alter table "public"."machine_state" validate constraint "machine_state_state_check";

alter table "public"."machine_state" add constraint "machine_state_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."machine_state" validate constraint "machine_state_updated_by_fkey";

alter table "public"."production_entries" add constraint "production_block_fk" FOREIGN KEY (block_id) REFERENCES public.blocks(id) not valid;

alter table "public"."production_entries" validate constraint "production_block_fk";

alter table "public"."production_entries" add constraint "production_entries_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.users(id) not valid;

alter table "public"."production_entries" validate constraint "production_entries_approved_by_fkey";

alter table "public"."production_entries" add constraint "production_entries_hour_check" CHECK (((hour >= 0) AND (hour <= 23))) not valid;

alter table "public"."production_entries" validate constraint "production_entries_hour_check";

alter table "public"."production_entries" add constraint "production_entries_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.assets(id) not valid;

alter table "public"."production_entries" validate constraint "production_entries_machine_id_fkey";

alter table "public"."production_entries" add constraint "production_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public.users(id) not valid;

alter table "public"."production_entries" validate constraint "production_entries_submitted_by_fkey";

alter table "public"."production_entries" add constraint "production_status_check" CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text]))) not valid;

alter table "public"."production_entries" validate constraint "production_status_check";

alter table "public"."production_entries" add constraint "unique_machine_hour" UNIQUE using index "unique_machine_hour";

alter table "public"."shift_plans" add constraint "shift_plans_block_id_fkey" FOREIGN KEY (block_id) REFERENCES public.blocks(id) not valid;

alter table "public"."shift_plans" validate constraint "shift_plans_block_id_fkey";

alter table "public"."shift_plans" add constraint "shift_plans_mining_method_check" CHECK ((mining_method = ANY (ARRAY['BLASTING'::text, 'FREE_DIGGING'::text]))) not valid;

alter table "public"."shift_plans" validate constraint "shift_plans_mining_method_check";

alter table "public"."shift_plans" add constraint "shift_plans_shift_code_fkey" FOREIGN KEY (shift_code) REFERENCES public.shift_definitions(code) not valid;

alter table "public"."shift_plans" validate constraint "shift_plans_shift_code_fkey";

alter table "public"."shifts" add constraint "shifts_shift_date_crew_site_key" UNIQUE using index "shifts_shift_date_crew_site_key";

alter table "public"."shifts" add constraint "shifts_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.shift_templates(id) not valid;

alter table "public"."shifts" validate constraint "shifts_template_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."workshop_jobs" add constraint "workshop_jobs_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.assets(id) not valid;

alter table "public"."workshop_jobs" validate constraint "workshop_jobs_asset_id_fkey";

alter table "sileko"."assets" add constraint "assets_asset_code_key" UNIQUE using index "assets_asset_code_key";

alter table "sileko"."blocks" add constraint "blocks_status_check" CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'COMPLETED'::text]))) not valid;

alter table "sileko"."blocks" validate constraint "blocks_status_check";

alter table "sileko"."breakdown_events" add constraint "breakdown_events_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text]))) not valid;

alter table "sileko"."breakdown_events" validate constraint "breakdown_events_status_check";

alter table "sileko"."breakdowns" add constraint "breakdowns_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."breakdowns" validate constraint "breakdowns_asset_id_fkey";

alter table "sileko"."breakdowns" add constraint "breakdowns_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."breakdowns" validate constraint "breakdowns_reported_by_fkey";

alter table "sileko"."breakdowns" add constraint "breakdowns_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."breakdowns" validate constraint "breakdowns_resolved_by_fkey";

alter table "sileko"."daily_plan_machines" add constraint "daily_plan_machines_daily_plan_id_fkey" FOREIGN KEY (daily_plan_id) REFERENCES sileko.daily_plans(id) ON DELETE CASCADE not valid;

alter table "sileko"."daily_plan_machines" validate constraint "daily_plan_machines_daily_plan_id_fkey";

alter table "sileko"."daily_plan_machines" add constraint "daily_plan_machines_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."daily_plan_machines" validate constraint "daily_plan_machines_machine_id_fkey";

alter table "sileko"."daily_plans" add constraint "daily_plans_site_shift_date_shift_key" UNIQUE using index "daily_plans_site_shift_date_shift_key";

alter table "sileko"."exceptions" add constraint "exceptions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."exceptions" validate constraint "exceptions_asset_id_fkey";

alter table "sileko"."exceptions" add constraint "exceptions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."exceptions" validate constraint "exceptions_created_by_fkey";

alter table "sileko"."exceptions" add constraint "exceptions_status_check" CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('ACKNOWLEDGED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('RESOLVED'::character varying)::text]))) not valid;

alter table "sileko"."exceptions" validate constraint "exceptions_status_check";

alter table "sileko"."exceptions" add constraint "exceptions_workshop_type_check" CHECK ((workshop_type = ANY (ARRAY['ON_SITE'::text, 'SUNDRA'::text]))) not valid;

alter table "sileko"."exceptions" validate constraint "exceptions_workshop_type_check";

alter table "sileko"."haul_entries" add constraint "haul_entries_production_point_id_fkey" FOREIGN KEY (production_point_id) REFERENCES sileko.production_points(id) not valid;

alter table "sileko"."haul_entries" validate constraint "haul_entries_production_point_id_fkey";

alter table "sileko"."machine_shift_status" add constraint "machine_shift_status_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."machine_shift_status" validate constraint "machine_shift_status_asset_id_fkey";

alter table "sileko"."machine_shift_status" add constraint "machine_shift_status_shift_id_asset_id_key" UNIQUE using index "machine_shift_status_shift_id_asset_id_key";

alter table "sileko"."machine_shift_status" add constraint "machine_shift_status_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES sileko.shifts(id) not valid;

alter table "sileko"."machine_shift_status" validate constraint "machine_shift_status_shift_id_fkey";

alter table "sileko"."machine_state" add constraint "machine_state_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."machine_state" validate constraint "machine_state_asset_id_fkey";

alter table "sileko"."machine_state" add constraint "machine_state_state_check" CHECK ((state = ANY (ARRAY['AVAILABLE'::text, 'PRODUCING'::text, 'STANDBY'::text, 'BREAKDOWN'::text]))) not valid;

alter table "sileko"."machine_state" validate constraint "machine_state_state_check";

alter table "sileko"."machine_state" add constraint "machine_state_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."machine_state" validate constraint "machine_state_updated_by_fkey";

alter table "sileko"."production_entries" add constraint "production_block_fk" FOREIGN KEY (block_id) REFERENCES sileko.blocks(id) not valid;

alter table "sileko"."production_entries" validate constraint "production_block_fk";

alter table "sileko"."production_entries" add constraint "production_entries_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."production_entries" validate constraint "production_entries_approved_by_fkey";

alter table "sileko"."production_entries" add constraint "production_entries_hour_check" CHECK (((hour >= 0) AND (hour <= 23))) not valid;

alter table "sileko"."production_entries" validate constraint "production_entries_hour_check";

alter table "sileko"."production_entries" add constraint "production_entries_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."production_entries" validate constraint "production_entries_machine_id_fkey";

alter table "sileko"."production_entries" add constraint "production_entries_machine_id_shift_date_hour_key" UNIQUE using index "production_entries_machine_id_shift_date_hour_key";

alter table "sileko"."production_entries" add constraint "production_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES sileko.users(id) not valid;

alter table "sileko"."production_entries" validate constraint "production_entries_submitted_by_fkey";

alter table "sileko"."production_entries" add constraint "production_status_check" CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text]))) not valid;

alter table "sileko"."production_entries" validate constraint "production_status_check";

alter table "sileko"."shift_plans" add constraint "shift_plans_block_id_fkey" FOREIGN KEY (block_id) REFERENCES sileko.blocks(id) not valid;

alter table "sileko"."shift_plans" validate constraint "shift_plans_block_id_fkey";

alter table "sileko"."shift_plans" add constraint "shift_plans_mining_method_check" CHECK ((mining_method = ANY (ARRAY['BLASTING'::text, 'FREE_DIGGING'::text]))) not valid;

alter table "sileko"."shift_plans" validate constraint "shift_plans_mining_method_check";

alter table "sileko"."shift_plans" add constraint "shift_plans_shift_code_fkey" FOREIGN KEY (shift_code) REFERENCES sileko.shift_definitions(code) not valid;

alter table "sileko"."shift_plans" validate constraint "shift_plans_shift_code_fkey";

alter table "sileko"."shifts" add constraint "shifts_shift_date_crew_site_key" UNIQUE using index "shifts_shift_date_crew_site_key";

alter table "sileko"."shifts" add constraint "shifts_template_id_fkey" FOREIGN KEY (template_id) REFERENCES sileko.shift_templates(id) not valid;

alter table "sileko"."shifts" validate constraint "shifts_template_id_fkey";

alter table "sileko"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "sileko"."workshop_jobs" add constraint "workshop_jobs_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES sileko.assets(id) not valid;

alter table "sileko"."workshop_jobs" validate constraint "workshop_jobs_asset_id_fkey";

alter table "workshop"."assets" add constraint "assets_asset_code_key" UNIQUE using index "assets_asset_code_key";

grant delete on table "kalagadi"."asset_capabilities" to "admin";

grant insert on table "kalagadi"."asset_capabilities" to "admin";

grant select on table "kalagadi"."asset_capabilities" to "admin";

grant update on table "kalagadi"."asset_capabilities" to "admin";

grant delete on table "kalagadi"."assets" to "admin";

grant insert on table "kalagadi"."assets" to "admin";

grant select on table "kalagadi"."assets" to "admin";

grant update on table "kalagadi"."assets" to "admin";

grant delete on table "kalagadi"."assets" to "authenticated";

grant insert on table "kalagadi"."assets" to "authenticated";

grant select on table "kalagadi"."assets" to "authenticated";

grant update on table "kalagadi"."assets" to "authenticated";

grant delete on table "kalagadi"."blocks" to "admin";

grant insert on table "kalagadi"."blocks" to "admin";

grant select on table "kalagadi"."blocks" to "admin";

grant update on table "kalagadi"."blocks" to "admin";

grant delete on table "kalagadi"."breakdown_events" to "admin";

grant insert on table "kalagadi"."breakdown_events" to "admin";

grant select on table "kalagadi"."breakdown_events" to "admin";

grant update on table "kalagadi"."breakdown_events" to "admin";

grant delete on table "kalagadi"."breakdowns" to "admin";

grant insert on table "kalagadi"."breakdowns" to "admin";

grant select on table "kalagadi"."breakdowns" to "admin";

grant update on table "kalagadi"."breakdowns" to "admin";

grant delete on table "kalagadi"."breakdowns" to "authenticated";

grant insert on table "kalagadi"."breakdowns" to "authenticated";

grant select on table "kalagadi"."breakdowns" to "authenticated";

grant update on table "kalagadi"."breakdowns" to "authenticated";

grant delete on table "kalagadi"."daily_plan_machines" to "admin";

grant insert on table "kalagadi"."daily_plan_machines" to "admin";

grant select on table "kalagadi"."daily_plan_machines" to "admin";

grant update on table "kalagadi"."daily_plan_machines" to "admin";

grant delete on table "kalagadi"."daily_plan_machines" to "authenticated";

grant insert on table "kalagadi"."daily_plan_machines" to "authenticated";

grant select on table "kalagadi"."daily_plan_machines" to "authenticated";

grant update on table "kalagadi"."daily_plan_machines" to "authenticated";

grant delete on table "kalagadi"."daily_plans" to "admin";

grant insert on table "kalagadi"."daily_plans" to "admin";

grant select on table "kalagadi"."daily_plans" to "admin";

grant update on table "kalagadi"."daily_plans" to "admin";

grant delete on table "kalagadi"."daily_plans" to "authenticated";

grant insert on table "kalagadi"."daily_plans" to "authenticated";

grant select on table "kalagadi"."daily_plans" to "authenticated";

grant update on table "kalagadi"."daily_plans" to "authenticated";

grant delete on table "kalagadi"."exceptions" to "admin";

grant insert on table "kalagadi"."exceptions" to "admin";

grant select on table "kalagadi"."exceptions" to "admin";

grant update on table "kalagadi"."exceptions" to "admin";

grant delete on table "kalagadi"."haul_entries" to "admin";

grant insert on table "kalagadi"."haul_entries" to "admin";

grant select on table "kalagadi"."haul_entries" to "admin";

grant update on table "kalagadi"."haul_entries" to "admin";

grant delete on table "kalagadi"."machine_shift_status" to "admin";

grant insert on table "kalagadi"."machine_shift_status" to "admin";

grant select on table "kalagadi"."machine_shift_status" to "admin";

grant update on table "kalagadi"."machine_shift_status" to "admin";

grant delete on table "kalagadi"."machine_state" to "admin";

grant insert on table "kalagadi"."machine_state" to "admin";

grant select on table "kalagadi"."machine_state" to "admin";

grant update on table "kalagadi"."machine_state" to "admin";

grant delete on table "kalagadi"."production_entries" to "admin";

grant insert on table "kalagadi"."production_entries" to "admin";

grant select on table "kalagadi"."production_entries" to "admin";

grant update on table "kalagadi"."production_entries" to "admin";

grant delete on table "kalagadi"."production_entries" to "authenticated";

grant insert on table "kalagadi"."production_entries" to "authenticated";

grant select on table "kalagadi"."production_entries" to "authenticated";

grant update on table "kalagadi"."production_entries" to "authenticated";

grant delete on table "kalagadi"."production_points" to "admin";

grant insert on table "kalagadi"."production_points" to "admin";

grant select on table "kalagadi"."production_points" to "admin";

grant update on table "kalagadi"."production_points" to "admin";

grant delete on table "kalagadi"."shift_definitions" to "admin";

grant insert on table "kalagadi"."shift_definitions" to "admin";

grant select on table "kalagadi"."shift_definitions" to "admin";

grant update on table "kalagadi"."shift_definitions" to "admin";

grant select on table "kalagadi"."shift_definitions" to "authenticated";

grant delete on table "kalagadi"."shift_plans" to "admin";

grant insert on table "kalagadi"."shift_plans" to "admin";

grant select on table "kalagadi"."shift_plans" to "admin";

grant update on table "kalagadi"."shift_plans" to "admin";

grant delete on table "kalagadi"."shift_plans" to "authenticated";

grant insert on table "kalagadi"."shift_plans" to "authenticated";

grant select on table "kalagadi"."shift_plans" to "authenticated";

grant update on table "kalagadi"."shift_plans" to "authenticated";

grant delete on table "kalagadi"."shift_templates" to "admin";

grant insert on table "kalagadi"."shift_templates" to "admin";

grant select on table "kalagadi"."shift_templates" to "admin";

grant update on table "kalagadi"."shift_templates" to "admin";

grant delete on table "kalagadi"."shifts" to "admin";

grant insert on table "kalagadi"."shifts" to "admin";

grant select on table "kalagadi"."shifts" to "admin";

grant update on table "kalagadi"."shifts" to "admin";

grant delete on table "kalagadi"."users" to "admin";

grant insert on table "kalagadi"."users" to "admin";

grant select on table "kalagadi"."users" to "admin";

grant update on table "kalagadi"."users" to "admin";

grant delete on table "kalagadi"."workshop_jobs" to "admin";

grant insert on table "kalagadi"."workshop_jobs" to "admin";

grant select on table "kalagadi"."workshop_jobs" to "admin";

grant update on table "kalagadi"."workshop_jobs" to "admin";

grant delete on table "public"."asset_capabilities" to "admin";

grant insert on table "public"."asset_capabilities" to "admin";

grant select on table "public"."asset_capabilities" to "admin";

grant update on table "public"."asset_capabilities" to "admin";

grant delete on table "public"."asset_capabilities" to "anon";

grant insert on table "public"."asset_capabilities" to "anon";

grant references on table "public"."asset_capabilities" to "anon";

grant select on table "public"."asset_capabilities" to "anon";

grant trigger on table "public"."asset_capabilities" to "anon";

grant truncate on table "public"."asset_capabilities" to "anon";

grant update on table "public"."asset_capabilities" to "anon";

grant delete on table "public"."asset_capabilities" to "authenticated";

grant insert on table "public"."asset_capabilities" to "authenticated";

grant references on table "public"."asset_capabilities" to "authenticated";

grant select on table "public"."asset_capabilities" to "authenticated";

grant trigger on table "public"."asset_capabilities" to "authenticated";

grant truncate on table "public"."asset_capabilities" to "authenticated";

grant update on table "public"."asset_capabilities" to "authenticated";

grant delete on table "public"."asset_capabilities" to "service_role";

grant insert on table "public"."asset_capabilities" to "service_role";

grant references on table "public"."asset_capabilities" to "service_role";

grant select on table "public"."asset_capabilities" to "service_role";

grant trigger on table "public"."asset_capabilities" to "service_role";

grant truncate on table "public"."asset_capabilities" to "service_role";

grant update on table "public"."asset_capabilities" to "service_role";

grant delete on table "public"."assets" to "admin";

grant insert on table "public"."assets" to "admin";

grant select on table "public"."assets" to "admin";

grant update on table "public"."assets" to "admin";

grant delete on table "public"."assets" to "anon";

grant insert on table "public"."assets" to "anon";

grant references on table "public"."assets" to "anon";

grant select on table "public"."assets" to "anon";

grant trigger on table "public"."assets" to "anon";

grant truncate on table "public"."assets" to "anon";

grant update on table "public"."assets" to "anon";

grant delete on table "public"."assets" to "authenticated";

grant insert on table "public"."assets" to "authenticated";

grant references on table "public"."assets" to "authenticated";

grant select on table "public"."assets" to "authenticated";

grant trigger on table "public"."assets" to "authenticated";

grant truncate on table "public"."assets" to "authenticated";

grant update on table "public"."assets" to "authenticated";

grant delete on table "public"."assets" to "service_role";

grant insert on table "public"."assets" to "service_role";

grant references on table "public"."assets" to "service_role";

grant select on table "public"."assets" to "service_role";

grant trigger on table "public"."assets" to "service_role";

grant truncate on table "public"."assets" to "service_role";

grant update on table "public"."assets" to "service_role";

grant delete on table "public"."blocks" to "admin";

grant insert on table "public"."blocks" to "admin";

grant select on table "public"."blocks" to "admin";

grant update on table "public"."blocks" to "admin";

grant delete on table "public"."blocks" to "anon";

grant insert on table "public"."blocks" to "anon";

grant references on table "public"."blocks" to "anon";

grant select on table "public"."blocks" to "anon";

grant trigger on table "public"."blocks" to "anon";

grant truncate on table "public"."blocks" to "anon";

grant update on table "public"."blocks" to "anon";

grant delete on table "public"."blocks" to "authenticated";

grant insert on table "public"."blocks" to "authenticated";

grant references on table "public"."blocks" to "authenticated";

grant select on table "public"."blocks" to "authenticated";

grant trigger on table "public"."blocks" to "authenticated";

grant truncate on table "public"."blocks" to "authenticated";

grant update on table "public"."blocks" to "authenticated";

grant delete on table "public"."blocks" to "service_role";

grant insert on table "public"."blocks" to "service_role";

grant references on table "public"."blocks" to "service_role";

grant select on table "public"."blocks" to "service_role";

grant trigger on table "public"."blocks" to "service_role";

grant truncate on table "public"."blocks" to "service_role";

grant update on table "public"."blocks" to "service_role";

grant delete on table "public"."breakdown_events" to "admin";

grant insert on table "public"."breakdown_events" to "admin";

grant select on table "public"."breakdown_events" to "admin";

grant update on table "public"."breakdown_events" to "admin";

grant delete on table "public"."breakdown_events" to "anon";

grant insert on table "public"."breakdown_events" to "anon";

grant references on table "public"."breakdown_events" to "anon";

grant select on table "public"."breakdown_events" to "anon";

grant trigger on table "public"."breakdown_events" to "anon";

grant truncate on table "public"."breakdown_events" to "anon";

grant update on table "public"."breakdown_events" to "anon";

grant delete on table "public"."breakdown_events" to "authenticated";

grant insert on table "public"."breakdown_events" to "authenticated";

grant references on table "public"."breakdown_events" to "authenticated";

grant select on table "public"."breakdown_events" to "authenticated";

grant trigger on table "public"."breakdown_events" to "authenticated";

grant truncate on table "public"."breakdown_events" to "authenticated";

grant update on table "public"."breakdown_events" to "authenticated";

grant delete on table "public"."breakdown_events" to "service_role";

grant insert on table "public"."breakdown_events" to "service_role";

grant references on table "public"."breakdown_events" to "service_role";

grant select on table "public"."breakdown_events" to "service_role";

grant trigger on table "public"."breakdown_events" to "service_role";

grant truncate on table "public"."breakdown_events" to "service_role";

grant update on table "public"."breakdown_events" to "service_role";

grant delete on table "public"."breakdowns" to "admin";

grant insert on table "public"."breakdowns" to "admin";

grant select on table "public"."breakdowns" to "admin";

grant update on table "public"."breakdowns" to "admin";

grant delete on table "public"."breakdowns" to "anon";

grant insert on table "public"."breakdowns" to "anon";

grant references on table "public"."breakdowns" to "anon";

grant select on table "public"."breakdowns" to "anon";

grant trigger on table "public"."breakdowns" to "anon";

grant truncate on table "public"."breakdowns" to "anon";

grant update on table "public"."breakdowns" to "anon";

grant delete on table "public"."breakdowns" to "authenticated";

grant insert on table "public"."breakdowns" to "authenticated";

grant references on table "public"."breakdowns" to "authenticated";

grant select on table "public"."breakdowns" to "authenticated";

grant trigger on table "public"."breakdowns" to "authenticated";

grant truncate on table "public"."breakdowns" to "authenticated";

grant update on table "public"."breakdowns" to "authenticated";

grant delete on table "public"."breakdowns" to "service_role";

grant insert on table "public"."breakdowns" to "service_role";

grant references on table "public"."breakdowns" to "service_role";

grant select on table "public"."breakdowns" to "service_role";

grant trigger on table "public"."breakdowns" to "service_role";

grant truncate on table "public"."breakdowns" to "service_role";

grant update on table "public"."breakdowns" to "service_role";

grant delete on table "public"."daily_plan_machines" to "admin";

grant insert on table "public"."daily_plan_machines" to "admin";

grant select on table "public"."daily_plan_machines" to "admin";

grant update on table "public"."daily_plan_machines" to "admin";

grant delete on table "public"."daily_plan_machines" to "anon";

grant insert on table "public"."daily_plan_machines" to "anon";

grant references on table "public"."daily_plan_machines" to "anon";

grant select on table "public"."daily_plan_machines" to "anon";

grant trigger on table "public"."daily_plan_machines" to "anon";

grant truncate on table "public"."daily_plan_machines" to "anon";

grant update on table "public"."daily_plan_machines" to "anon";

grant delete on table "public"."daily_plan_machines" to "authenticated";

grant insert on table "public"."daily_plan_machines" to "authenticated";

grant references on table "public"."daily_plan_machines" to "authenticated";

grant select on table "public"."daily_plan_machines" to "authenticated";

grant trigger on table "public"."daily_plan_machines" to "authenticated";

grant truncate on table "public"."daily_plan_machines" to "authenticated";

grant update on table "public"."daily_plan_machines" to "authenticated";

grant delete on table "public"."daily_plan_machines" to "service_role";

grant insert on table "public"."daily_plan_machines" to "service_role";

grant references on table "public"."daily_plan_machines" to "service_role";

grant select on table "public"."daily_plan_machines" to "service_role";

grant trigger on table "public"."daily_plan_machines" to "service_role";

grant truncate on table "public"."daily_plan_machines" to "service_role";

grant update on table "public"."daily_plan_machines" to "service_role";

grant delete on table "public"."daily_plans" to "admin";

grant insert on table "public"."daily_plans" to "admin";

grant select on table "public"."daily_plans" to "admin";

grant update on table "public"."daily_plans" to "admin";

grant delete on table "public"."daily_plans" to "anon";

grant insert on table "public"."daily_plans" to "anon";

grant references on table "public"."daily_plans" to "anon";

grant select on table "public"."daily_plans" to "anon";

grant trigger on table "public"."daily_plans" to "anon";

grant truncate on table "public"."daily_plans" to "anon";

grant update on table "public"."daily_plans" to "anon";

grant delete on table "public"."daily_plans" to "authenticated";

grant insert on table "public"."daily_plans" to "authenticated";

grant references on table "public"."daily_plans" to "authenticated";

grant select on table "public"."daily_plans" to "authenticated";

grant trigger on table "public"."daily_plans" to "authenticated";

grant truncate on table "public"."daily_plans" to "authenticated";

grant update on table "public"."daily_plans" to "authenticated";

grant delete on table "public"."daily_plans" to "service_role";

grant insert on table "public"."daily_plans" to "service_role";

grant references on table "public"."daily_plans" to "service_role";

grant select on table "public"."daily_plans" to "service_role";

grant trigger on table "public"."daily_plans" to "service_role";

grant truncate on table "public"."daily_plans" to "service_role";

grant update on table "public"."daily_plans" to "service_role";

grant delete on table "public"."exceptions" to "admin";

grant insert on table "public"."exceptions" to "admin";

grant select on table "public"."exceptions" to "admin";

grant update on table "public"."exceptions" to "admin";

grant delete on table "public"."exceptions" to "anon";

grant insert on table "public"."exceptions" to "anon";

grant references on table "public"."exceptions" to "anon";

grant select on table "public"."exceptions" to "anon";

grant trigger on table "public"."exceptions" to "anon";

grant truncate on table "public"."exceptions" to "anon";

grant update on table "public"."exceptions" to "anon";

grant delete on table "public"."exceptions" to "authenticated";

grant insert on table "public"."exceptions" to "authenticated";

grant references on table "public"."exceptions" to "authenticated";

grant select on table "public"."exceptions" to "authenticated";

grant trigger on table "public"."exceptions" to "authenticated";

grant truncate on table "public"."exceptions" to "authenticated";

grant update on table "public"."exceptions" to "authenticated";

grant delete on table "public"."exceptions" to "service_role";

grant insert on table "public"."exceptions" to "service_role";

grant references on table "public"."exceptions" to "service_role";

grant select on table "public"."exceptions" to "service_role";

grant trigger on table "public"."exceptions" to "service_role";

grant truncate on table "public"."exceptions" to "service_role";

grant update on table "public"."exceptions" to "service_role";

grant delete on table "public"."haul_entries" to "admin";

grant insert on table "public"."haul_entries" to "admin";

grant select on table "public"."haul_entries" to "admin";

grant update on table "public"."haul_entries" to "admin";

grant delete on table "public"."haul_entries" to "anon";

grant insert on table "public"."haul_entries" to "anon";

grant references on table "public"."haul_entries" to "anon";

grant select on table "public"."haul_entries" to "anon";

grant trigger on table "public"."haul_entries" to "anon";

grant truncate on table "public"."haul_entries" to "anon";

grant update on table "public"."haul_entries" to "anon";

grant delete on table "public"."haul_entries" to "authenticated";

grant insert on table "public"."haul_entries" to "authenticated";

grant references on table "public"."haul_entries" to "authenticated";

grant select on table "public"."haul_entries" to "authenticated";

grant trigger on table "public"."haul_entries" to "authenticated";

grant truncate on table "public"."haul_entries" to "authenticated";

grant update on table "public"."haul_entries" to "authenticated";

grant delete on table "public"."haul_entries" to "service_role";

grant insert on table "public"."haul_entries" to "service_role";

grant references on table "public"."haul_entries" to "service_role";

grant select on table "public"."haul_entries" to "service_role";

grant trigger on table "public"."haul_entries" to "service_role";

grant truncate on table "public"."haul_entries" to "service_role";

grant update on table "public"."haul_entries" to "service_role";

grant delete on table "public"."machine_shift_status" to "admin";

grant insert on table "public"."machine_shift_status" to "admin";

grant select on table "public"."machine_shift_status" to "admin";

grant update on table "public"."machine_shift_status" to "admin";

grant delete on table "public"."machine_shift_status" to "anon";

grant insert on table "public"."machine_shift_status" to "anon";

grant references on table "public"."machine_shift_status" to "anon";

grant select on table "public"."machine_shift_status" to "anon";

grant trigger on table "public"."machine_shift_status" to "anon";

grant truncate on table "public"."machine_shift_status" to "anon";

grant update on table "public"."machine_shift_status" to "anon";

grant delete on table "public"."machine_shift_status" to "authenticated";

grant insert on table "public"."machine_shift_status" to "authenticated";

grant references on table "public"."machine_shift_status" to "authenticated";

grant select on table "public"."machine_shift_status" to "authenticated";

grant trigger on table "public"."machine_shift_status" to "authenticated";

grant truncate on table "public"."machine_shift_status" to "authenticated";

grant update on table "public"."machine_shift_status" to "authenticated";

grant delete on table "public"."machine_shift_status" to "service_role";

grant insert on table "public"."machine_shift_status" to "service_role";

grant references on table "public"."machine_shift_status" to "service_role";

grant select on table "public"."machine_shift_status" to "service_role";

grant trigger on table "public"."machine_shift_status" to "service_role";

grant truncate on table "public"."machine_shift_status" to "service_role";

grant update on table "public"."machine_shift_status" to "service_role";

grant delete on table "public"."machine_state" to "admin";

grant insert on table "public"."machine_state" to "admin";

grant select on table "public"."machine_state" to "admin";

grant update on table "public"."machine_state" to "admin";

grant delete on table "public"."machine_state" to "anon";

grant insert on table "public"."machine_state" to "anon";

grant references on table "public"."machine_state" to "anon";

grant select on table "public"."machine_state" to "anon";

grant trigger on table "public"."machine_state" to "anon";

grant truncate on table "public"."machine_state" to "anon";

grant update on table "public"."machine_state" to "anon";

grant delete on table "public"."machine_state" to "authenticated";

grant insert on table "public"."machine_state" to "authenticated";

grant references on table "public"."machine_state" to "authenticated";

grant select on table "public"."machine_state" to "authenticated";

grant trigger on table "public"."machine_state" to "authenticated";

grant truncate on table "public"."machine_state" to "authenticated";

grant update on table "public"."machine_state" to "authenticated";

grant delete on table "public"."machine_state" to "service_role";

grant insert on table "public"."machine_state" to "service_role";

grant references on table "public"."machine_state" to "service_role";

grant select on table "public"."machine_state" to "service_role";

grant trigger on table "public"."machine_state" to "service_role";

grant truncate on table "public"."machine_state" to "service_role";

grant update on table "public"."machine_state" to "service_role";

grant delete on table "public"."production_entries" to "admin";

grant insert on table "public"."production_entries" to "admin";

grant select on table "public"."production_entries" to "admin";

grant update on table "public"."production_entries" to "admin";

grant delete on table "public"."production_entries" to "anon";

grant insert on table "public"."production_entries" to "anon";

grant references on table "public"."production_entries" to "anon";

grant select on table "public"."production_entries" to "anon";

grant trigger on table "public"."production_entries" to "anon";

grant truncate on table "public"."production_entries" to "anon";

grant update on table "public"."production_entries" to "anon";

grant delete on table "public"."production_entries" to "authenticated";

grant insert on table "public"."production_entries" to "authenticated";

grant references on table "public"."production_entries" to "authenticated";

grant select on table "public"."production_entries" to "authenticated";

grant trigger on table "public"."production_entries" to "authenticated";

grant truncate on table "public"."production_entries" to "authenticated";

grant update on table "public"."production_entries" to "authenticated";

grant delete on table "public"."production_entries" to "service_role";

grant insert on table "public"."production_entries" to "service_role";

grant references on table "public"."production_entries" to "service_role";

grant select on table "public"."production_entries" to "service_role";

grant trigger on table "public"."production_entries" to "service_role";

grant truncate on table "public"."production_entries" to "service_role";

grant update on table "public"."production_entries" to "service_role";

grant delete on table "public"."production_points" to "admin";

grant insert on table "public"."production_points" to "admin";

grant select on table "public"."production_points" to "admin";

grant update on table "public"."production_points" to "admin";

grant delete on table "public"."production_points" to "anon";

grant insert on table "public"."production_points" to "anon";

grant references on table "public"."production_points" to "anon";

grant select on table "public"."production_points" to "anon";

grant trigger on table "public"."production_points" to "anon";

grant truncate on table "public"."production_points" to "anon";

grant update on table "public"."production_points" to "anon";

grant delete on table "public"."production_points" to "authenticated";

grant insert on table "public"."production_points" to "authenticated";

grant references on table "public"."production_points" to "authenticated";

grant select on table "public"."production_points" to "authenticated";

grant trigger on table "public"."production_points" to "authenticated";

grant truncate on table "public"."production_points" to "authenticated";

grant update on table "public"."production_points" to "authenticated";

grant delete on table "public"."production_points" to "service_role";

grant insert on table "public"."production_points" to "service_role";

grant references on table "public"."production_points" to "service_role";

grant select on table "public"."production_points" to "service_role";

grant trigger on table "public"."production_points" to "service_role";

grant truncate on table "public"."production_points" to "service_role";

grant update on table "public"."production_points" to "service_role";

grant delete on table "public"."shift_definitions" to "admin";

grant insert on table "public"."shift_definitions" to "admin";

grant select on table "public"."shift_definitions" to "admin";

grant update on table "public"."shift_definitions" to "admin";

grant delete on table "public"."shift_definitions" to "anon";

grant insert on table "public"."shift_definitions" to "anon";

grant references on table "public"."shift_definitions" to "anon";

grant select on table "public"."shift_definitions" to "anon";

grant trigger on table "public"."shift_definitions" to "anon";

grant truncate on table "public"."shift_definitions" to "anon";

grant update on table "public"."shift_definitions" to "anon";

grant delete on table "public"."shift_definitions" to "authenticated";

grant insert on table "public"."shift_definitions" to "authenticated";

grant references on table "public"."shift_definitions" to "authenticated";

grant select on table "public"."shift_definitions" to "authenticated";

grant trigger on table "public"."shift_definitions" to "authenticated";

grant truncate on table "public"."shift_definitions" to "authenticated";

grant update on table "public"."shift_definitions" to "authenticated";

grant delete on table "public"."shift_definitions" to "service_role";

grant insert on table "public"."shift_definitions" to "service_role";

grant references on table "public"."shift_definitions" to "service_role";

grant select on table "public"."shift_definitions" to "service_role";

grant trigger on table "public"."shift_definitions" to "service_role";

grant truncate on table "public"."shift_definitions" to "service_role";

grant update on table "public"."shift_definitions" to "service_role";

grant delete on table "public"."shift_plans" to "admin";

grant insert on table "public"."shift_plans" to "admin";

grant select on table "public"."shift_plans" to "admin";

grant update on table "public"."shift_plans" to "admin";

grant delete on table "public"."shift_plans" to "anon";

grant insert on table "public"."shift_plans" to "anon";

grant references on table "public"."shift_plans" to "anon";

grant select on table "public"."shift_plans" to "anon";

grant trigger on table "public"."shift_plans" to "anon";

grant truncate on table "public"."shift_plans" to "anon";

grant update on table "public"."shift_plans" to "anon";

grant delete on table "public"."shift_plans" to "authenticated";

grant insert on table "public"."shift_plans" to "authenticated";

grant references on table "public"."shift_plans" to "authenticated";

grant select on table "public"."shift_plans" to "authenticated";

grant trigger on table "public"."shift_plans" to "authenticated";

grant truncate on table "public"."shift_plans" to "authenticated";

grant update on table "public"."shift_plans" to "authenticated";

grant delete on table "public"."shift_plans" to "service_role";

grant insert on table "public"."shift_plans" to "service_role";

grant references on table "public"."shift_plans" to "service_role";

grant select on table "public"."shift_plans" to "service_role";

grant trigger on table "public"."shift_plans" to "service_role";

grant truncate on table "public"."shift_plans" to "service_role";

grant update on table "public"."shift_plans" to "service_role";

grant delete on table "public"."shift_templates" to "admin";

grant insert on table "public"."shift_templates" to "admin";

grant select on table "public"."shift_templates" to "admin";

grant update on table "public"."shift_templates" to "admin";

grant delete on table "public"."shift_templates" to "anon";

grant insert on table "public"."shift_templates" to "anon";

grant references on table "public"."shift_templates" to "anon";

grant select on table "public"."shift_templates" to "anon";

grant trigger on table "public"."shift_templates" to "anon";

grant truncate on table "public"."shift_templates" to "anon";

grant update on table "public"."shift_templates" to "anon";

grant delete on table "public"."shift_templates" to "authenticated";

grant insert on table "public"."shift_templates" to "authenticated";

grant references on table "public"."shift_templates" to "authenticated";

grant select on table "public"."shift_templates" to "authenticated";

grant trigger on table "public"."shift_templates" to "authenticated";

grant truncate on table "public"."shift_templates" to "authenticated";

grant update on table "public"."shift_templates" to "authenticated";

grant delete on table "public"."shift_templates" to "service_role";

grant insert on table "public"."shift_templates" to "service_role";

grant references on table "public"."shift_templates" to "service_role";

grant select on table "public"."shift_templates" to "service_role";

grant trigger on table "public"."shift_templates" to "service_role";

grant truncate on table "public"."shift_templates" to "service_role";

grant update on table "public"."shift_templates" to "service_role";

grant delete on table "public"."shifts" to "admin";

grant insert on table "public"."shifts" to "admin";

grant select on table "public"."shifts" to "admin";

grant update on table "public"."shifts" to "admin";

grant delete on table "public"."shifts" to "anon";

grant insert on table "public"."shifts" to "anon";

grant references on table "public"."shifts" to "anon";

grant select on table "public"."shifts" to "anon";

grant trigger on table "public"."shifts" to "anon";

grant truncate on table "public"."shifts" to "anon";

grant update on table "public"."shifts" to "anon";

grant delete on table "public"."shifts" to "authenticated";

grant insert on table "public"."shifts" to "authenticated";

grant references on table "public"."shifts" to "authenticated";

grant select on table "public"."shifts" to "authenticated";

grant trigger on table "public"."shifts" to "authenticated";

grant truncate on table "public"."shifts" to "authenticated";

grant update on table "public"."shifts" to "authenticated";

grant delete on table "public"."shifts" to "service_role";

grant insert on table "public"."shifts" to "service_role";

grant references on table "public"."shifts" to "service_role";

grant select on table "public"."shifts" to "service_role";

grant trigger on table "public"."shifts" to "service_role";

grant truncate on table "public"."shifts" to "service_role";

grant update on table "public"."shifts" to "service_role";

grant delete on table "public"."users" to "admin";

grant insert on table "public"."users" to "admin";

grant select on table "public"."users" to "admin";

grant update on table "public"."users" to "admin";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."workshop_jobs" to "admin";

grant insert on table "public"."workshop_jobs" to "admin";

grant select on table "public"."workshop_jobs" to "admin";

grant update on table "public"."workshop_jobs" to "admin";

grant delete on table "public"."workshop_jobs" to "anon";

grant insert on table "public"."workshop_jobs" to "anon";

grant references on table "public"."workshop_jobs" to "anon";

grant select on table "public"."workshop_jobs" to "anon";

grant trigger on table "public"."workshop_jobs" to "anon";

grant truncate on table "public"."workshop_jobs" to "anon";

grant update on table "public"."workshop_jobs" to "anon";

grant delete on table "public"."workshop_jobs" to "authenticated";

grant insert on table "public"."workshop_jobs" to "authenticated";

grant references on table "public"."workshop_jobs" to "authenticated";

grant select on table "public"."workshop_jobs" to "authenticated";

grant trigger on table "public"."workshop_jobs" to "authenticated";

grant truncate on table "public"."workshop_jobs" to "authenticated";

grant update on table "public"."workshop_jobs" to "authenticated";

grant delete on table "public"."workshop_jobs" to "service_role";

grant insert on table "public"."workshop_jobs" to "service_role";

grant references on table "public"."workshop_jobs" to "service_role";

grant select on table "public"."workshop_jobs" to "service_role";

grant trigger on table "public"."workshop_jobs" to "service_role";

grant truncate on table "public"."workshop_jobs" to "service_role";

grant update on table "public"."workshop_jobs" to "service_role";

grant delete on table "sileko"."asset_capabilities" to "admin";

grant insert on table "sileko"."asset_capabilities" to "admin";

grant select on table "sileko"."asset_capabilities" to "admin";

grant update on table "sileko"."asset_capabilities" to "admin";

grant select on table "sileko"."asset_capabilities" to "authenticated";

grant delete on table "sileko"."assets" to "admin";

grant insert on table "sileko"."assets" to "admin";

grant select on table "sileko"."assets" to "admin";

grant update on table "sileko"."assets" to "admin";

grant delete on table "sileko"."assets" to "authenticated";

grant insert on table "sileko"."assets" to "authenticated";

grant select on table "sileko"."assets" to "authenticated";

grant update on table "sileko"."assets" to "authenticated";

grant delete on table "sileko"."blocks" to "admin";

grant insert on table "sileko"."blocks" to "admin";

grant select on table "sileko"."blocks" to "admin";

grant update on table "sileko"."blocks" to "admin";

grant select on table "sileko"."blocks" to "authenticated";

grant delete on table "sileko"."breakdown_events" to "admin";

grant insert on table "sileko"."breakdown_events" to "admin";

grant select on table "sileko"."breakdown_events" to "admin";

grant update on table "sileko"."breakdown_events" to "admin";

grant insert on table "sileko"."breakdown_events" to "authenticated";

grant select on table "sileko"."breakdown_events" to "authenticated";

grant delete on table "sileko"."breakdowns" to "admin";

grant insert on table "sileko"."breakdowns" to "admin";

grant select on table "sileko"."breakdowns" to "admin";

grant update on table "sileko"."breakdowns" to "admin";

grant delete on table "sileko"."breakdowns" to "authenticated";

grant insert on table "sileko"."breakdowns" to "authenticated";

grant select on table "sileko"."breakdowns" to "authenticated";

grant update on table "sileko"."breakdowns" to "authenticated";

grant delete on table "sileko"."breakdowns" to "supervisor";

grant insert on table "sileko"."breakdowns" to "supervisor";

grant select on table "sileko"."breakdowns" to "supervisor";

grant update on table "sileko"."breakdowns" to "supervisor";

grant delete on table "sileko"."daily_plan_machines" to "admin";

grant insert on table "sileko"."daily_plan_machines" to "admin";

grant select on table "sileko"."daily_plan_machines" to "admin";

grant update on table "sileko"."daily_plan_machines" to "admin";

grant delete on table "sileko"."daily_plan_machines" to "authenticated";

grant insert on table "sileko"."daily_plan_machines" to "authenticated";

grant select on table "sileko"."daily_plan_machines" to "authenticated";

grant update on table "sileko"."daily_plan_machines" to "authenticated";

grant delete on table "sileko"."daily_plans" to "admin";

grant insert on table "sileko"."daily_plans" to "admin";

grant select on table "sileko"."daily_plans" to "admin";

grant update on table "sileko"."daily_plans" to "admin";

grant delete on table "sileko"."daily_plans" to "authenticated";

grant insert on table "sileko"."daily_plans" to "authenticated";

grant select on table "sileko"."daily_plans" to "authenticated";

grant update on table "sileko"."daily_plans" to "authenticated";

grant delete on table "sileko"."exceptions" to "admin";

grant insert on table "sileko"."exceptions" to "admin";

grant select on table "sileko"."exceptions" to "admin";

grant update on table "sileko"."exceptions" to "admin";

grant select on table "sileko"."exceptions" to "authenticated";

grant delete on table "sileko"."haul_entries" to "admin";

grant insert on table "sileko"."haul_entries" to "admin";

grant select on table "sileko"."haul_entries" to "admin";

grant update on table "sileko"."haul_entries" to "admin";

grant select on table "sileko"."haul_entries" to "authenticated";

grant delete on table "sileko"."machine_shift_status" to "admin";

grant insert on table "sileko"."machine_shift_status" to "admin";

grant select on table "sileko"."machine_shift_status" to "admin";

grant update on table "sileko"."machine_shift_status" to "admin";

grant select on table "sileko"."machine_shift_status" to "authenticated";

grant delete on table "sileko"."machine_state" to "admin";

grant insert on table "sileko"."machine_state" to "admin";

grant select on table "sileko"."machine_state" to "admin";

grant update on table "sileko"."machine_state" to "admin";

grant select on table "sileko"."machine_state" to "authenticated";

grant delete on table "sileko"."production_entries" to "admin";

grant insert on table "sileko"."production_entries" to "admin";

grant select on table "sileko"."production_entries" to "admin";

grant update on table "sileko"."production_entries" to "admin";

grant delete on table "sileko"."production_entries" to "authenticated";

grant insert on table "sileko"."production_entries" to "authenticated";

grant select on table "sileko"."production_entries" to "authenticated";

grant update on table "sileko"."production_entries" to "authenticated";

grant delete on table "sileko"."production_points" to "admin";

grant insert on table "sileko"."production_points" to "admin";

grant select on table "sileko"."production_points" to "admin";

grant update on table "sileko"."production_points" to "admin";

grant select on table "sileko"."production_points" to "authenticated";

grant delete on table "sileko"."shift_definitions" to "admin";

grant insert on table "sileko"."shift_definitions" to "admin";

grant select on table "sileko"."shift_definitions" to "admin";

grant update on table "sileko"."shift_definitions" to "admin";

grant select on table "sileko"."shift_definitions" to "authenticated";

grant delete on table "sileko"."shift_plans" to "admin";

grant insert on table "sileko"."shift_plans" to "admin";

grant select on table "sileko"."shift_plans" to "admin";

grant update on table "sileko"."shift_plans" to "admin";

grant delete on table "sileko"."shift_plans" to "authenticated";

grant insert on table "sileko"."shift_plans" to "authenticated";

grant select on table "sileko"."shift_plans" to "authenticated";

grant update on table "sileko"."shift_plans" to "authenticated";

grant delete on table "sileko"."shift_templates" to "admin";

grant insert on table "sileko"."shift_templates" to "admin";

grant select on table "sileko"."shift_templates" to "admin";

grant update on table "sileko"."shift_templates" to "admin";

grant select on table "sileko"."shift_templates" to "authenticated";

grant delete on table "sileko"."shifts" to "admin";

grant insert on table "sileko"."shifts" to "admin";

grant select on table "sileko"."shifts" to "admin";

grant update on table "sileko"."shifts" to "admin";

grant select on table "sileko"."shifts" to "authenticated";

grant delete on table "sileko"."users" to "admin";

grant insert on table "sileko"."users" to "admin";

grant select on table "sileko"."users" to "admin";

grant update on table "sileko"."users" to "admin";

grant select on table "sileko"."users" to "authenticated";

grant delete on table "sileko"."workshop_jobs" to "admin";

grant insert on table "sileko"."workshop_jobs" to "admin";

grant select on table "sileko"."workshop_jobs" to "admin";

grant update on table "sileko"."workshop_jobs" to "admin";

grant select on table "sileko"."workshop_jobs" to "authenticated";

grant delete on table "workshop"."assets" to "admin";

grant insert on table "workshop"."assets" to "admin";

grant select on table "workshop"."assets" to "admin";

grant update on table "workshop"."assets" to "admin";

grant delete on table "workshop"."assets" to "authenticated";

grant insert on table "workshop"."assets" to "authenticated";

grant select on table "workshop"."assets" to "authenticated";

grant update on table "workshop"."assets" to "authenticated";

grant delete on table "workshop"."breakdowns" to "admin";

grant insert on table "workshop"."breakdowns" to "admin";

grant select on table "workshop"."breakdowns" to "admin";

grant update on table "workshop"."breakdowns" to "admin";

grant delete on table "workshop"."breakdowns" to "authenticated";

grant insert on table "workshop"."breakdowns" to "authenticated";

grant select on table "workshop"."breakdowns" to "authenticated";

grant update on table "workshop"."breakdowns" to "authenticated";


  create policy "Full access to authenticated users"
  on "kalagadi"."asset_capabilities"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "admin_policy_all"
  on "kalagadi"."asset_capabilities"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Full access to authenticated users"
  on "kalagadi"."assets"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "admin_policy_all"
  on "kalagadi"."assets"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_supervisors_select_assets"
  on "kalagadi"."assets"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_update_assets"
  on "kalagadi"."assets"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."blocks"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."breakdown_events"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_admins_full"
  on "kalagadi"."breakdowns"
  as permissive
  for all
  to public
using (((auth.role() = 'admin'::text) OR (CURRENT_USER = 'admin_role'::name)))
with check (((auth.role() = 'admin'::text) OR (CURRENT_USER = 'admin_role'::name)));



  create policy "kalagadi_controllers_insert"
  on "kalagadi"."breakdowns"
  as permissive
  for insert
  to public
with check ((((auth.role() = 'controller'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())));



  create policy "kalagadi_controllers_select"
  on "kalagadi"."breakdowns"
  as permissive
  for select
  to public
using ((((auth.role() = 'controller'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())));



  create policy "kalagadi_supervisors_insert"
  on "kalagadi"."breakdowns"
  as permissive
  for insert
  to public
with check ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())));



  create policy "kalagadi_supervisors_select"
  on "kalagadi"."breakdowns"
  as permissive
  for select
  to public
using ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())));



  create policy "kalagadi_supervisors_update"
  on "kalagadi"."breakdowns"
  as permissive
  for update
  to public
using ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())))
with check ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'kalagadi'::text)))) AND (lower(site) = 'kalagadi'::text)) OR (reported_by = auth.uid())));



  create policy "admin_policy_all"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_allow_controllers_insert_daily_plan_machines"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = 'kalagadi'::text)));



  create policy "kalagadi_controllers_insert_daily_plan_machines"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_controllers_select_daily_plan_machines"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_insert_daily_plan_machines"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_select_daily_plan_machines"
  on "kalagadi"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."daily_plans"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_controllers_insert_daily_plans"
  on "kalagadi"."daily_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'kalagadi'::text)))));



  create policy "kalagadi_controllers_select_daily_plans"
  on "kalagadi"."daily_plans"
  as permissive
  for select
  to authenticated
using (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = 'kalagadi'::text)));



  create policy "kalagadi_supervisors_insert_daily_plans"
  on "kalagadi"."daily_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_select_daily_plans"
  on "kalagadi"."daily_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."exceptions"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."haul_entries"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."machine_shift_status"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."machine_state"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Admin can select all"
  on "kalagadi"."production_entries"
  as permissive
  for select
  to admin
using (true);



  create policy "admin_policy_all"
  on "kalagadi"."production_entries"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admins can select all"
  on "kalagadi"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))));



  create policy "all authenticated can select all"
  on "kalagadi"."production_entries"
  as permissive
  for select
  to authenticated
using (true);



  create policy "kalagadi_supervisors_insert_production_entries"
  on "kalagadi"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_prod_insert"
  on "kalagadi"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_prod_select"
  on "kalagadi"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_prod_update"
  on "kalagadi"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_select_production_entries"
  on "kalagadi"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_supervisors_update_production_entries"
  on "kalagadi"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."production_points"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."shift_definitions"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_supervisors_select_shift_definitions"
  on "kalagadi"."shift_definitions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."shift_plans"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "kalagadi_allow_controllers_insert_shift_plans"
  on "kalagadi"."shift_plans"
  as permissive
  for insert
  to authenticated
with check (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = 'kalagadi'::text)));



  create policy "kalagadi_controllers_insert_shift_plans"
  on "kalagadi"."shift_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "kalagadi_controllers_select_shift_plans"
  on "kalagadi"."shift_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'kalagadi'::text)))));



  create policy "admin_policy_all"
  on "kalagadi"."shift_templates"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."shifts"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."users"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "kalagadi"."workshop_jobs"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "public_supervisors_select_assets"
  on "public"."assets"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_update_assets"
  on "public"."assets"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_controllers_insert_daily_plan_machines"
  on "public"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))));



  create policy "public_controllers_select_daily_plan_machines"
  on "public"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))));



  create policy "public_controllers_insert_daily_plans"
  on "public"."daily_plans"
  as permissive
  for insert
  to authenticated
with check (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))));



  create policy "public_controllers_select_daily_plans"
  on "public"."daily_plans"
  as permissive
  for select
  to authenticated
using (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))));



  create policy "allow_supervisor_update_review"
  on "public"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND ((production_entries.site)::text = u.site)))))
with check ((auth.role() = 'authenticated'::text));



  create policy "public_supervisors_insert_production_entries"
  on "public"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_prod_insert"
  on "public"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_prod_select"
  on "public"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_prod_update"
  on "public"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_select_production_entries"
  on "public"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_supervisors_update_production_entries"
  on "public"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (current_setting('jwt.claims.site'::text, true) = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_controllers_insert_shift_plans"
  on "public"."shift_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "public_controllers_select_shift_plans"
  on "public"."shift_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = ANY (ARRAY['sileko'::text, 'kalagadi'::text, 'public'::text]))))));



  create policy "users_select_admins"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "users_select_all"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Full access to authenticated users"
  on "sileko"."asset_capabilities"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "admin_policy_all"
  on "sileko"."asset_capabilities"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Full access to authenticated users"
  on "sileko"."assets"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "admin_policy_all"
  on "sileko"."assets"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "sileko_supervisors_assets_select"
  on "sileko"."assets"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_assets_update"
  on "sileko"."assets"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_select_assets"
  on "sileko"."assets"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_update_assets"
  on "sileko"."assets"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "admin_policy_all"
  on "sileko"."blocks"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."breakdown_events"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "allow_controllers_insert_breakdown_events"
  on "sileko"."breakdown_events"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text)))));



  create policy "sileko_admins_full"
  on "sileko"."breakdowns"
  as permissive
  for all
  to public
using (((auth.role() = 'admin'::text) OR (CURRENT_USER = 'admin_role'::name)))
with check (((auth.role() = 'admin'::text) OR (CURRENT_USER = 'admin_role'::name)));



  create policy "sileko_allow_auth_inserts"
  on "sileko"."breakdowns"
  as permissive
  for insert
  to authenticated
with check (((lower(site) = 'sileko'::text) AND ((reported_by IS NULL) OR (reported_by = auth.uid()))));



  create policy "sileko_controllers_insert"
  on "sileko"."breakdowns"
  as permissive
  for insert
  to public
with check ((((auth.role() = 'controller'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())));



  create policy "sileko_controllers_select"
  on "sileko"."breakdowns"
  as permissive
  for select
  to public
using ((((auth.role() = 'controller'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())));



  create policy "sileko_supervisors_insert"
  on "sileko"."breakdowns"
  as permissive
  for insert
  to public
with check ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())));



  create policy "sileko_supervisors_select"
  on "sileko"."breakdowns"
  as permissive
  for select
  to public
using ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())));



  create policy "sileko_supervisors_update"
  on "sileko"."breakdowns"
  as permissive
  for update
  to public
using ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())))
with check ((((auth.role() = 'supervisor'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text) AND (lower(u.site) = 'sileko'::text)))) AND (lower(site) = 'sileko'::text)) OR (reported_by = auth.uid())));



  create policy "admin_policy_all"
  on "sileko"."daily_plan_machines"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "sileko_allow_controllers_insert_daily_plan_machines"
  on "sileko"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check (((auth.role() = 'controller'::text) AND (current_setting('jwt.claims.site'::text, true) = 'sileko'::text)));



  create policy "sileko_controllers_insert_daily_plan_machines"
  on "sileko"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_controllers_select_daily_plan_machines"
  on "sileko"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_dpm_insert"
  on "sileko"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_dpm_select"
  on "sileko"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_insert_daily_plan_machines"
  on "sileko"."daily_plan_machines"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_select_daily_plan_machines"
  on "sileko"."daily_plan_machines"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "admin_policy_all"
  on "sileko"."daily_plans"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "sileko_controllers_insert_daily_plans"
  on "sileko"."daily_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'sileko'::text)))));



  create policy "sileko_controllers_select_daily_plans"
  on "sileko"."daily_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'controller'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_daily_plans_insert"
  on "sileko"."daily_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_daily_plans_select"
  on "sileko"."daily_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_insert_daily_plans"
  on "sileko"."daily_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_select_daily_plans"
  on "sileko"."daily_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "admin_policy_all"
  on "sileko"."exceptions"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."haul_entries"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."machine_shift_status"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."machine_state"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Admin can select all"
  on "sileko"."production_entries"
  as permissive
  for select
  to admin
using (true);



  create policy "admin_policy_all"
  on "sileko"."production_entries"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admins can select all"
  on "sileko"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))));



  create policy "allow_controllers_insert_production_entries"
  on "sileko"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text)))));



  create policy "allow_insert_with_null_or_self"
  on "sileko"."production_entries"
  as permissive
  for insert
  to authenticated
with check (((lower((site)::text) = 'sileko'::text) AND ((submitted_by IS NULL) OR (submitted_by = auth.uid()) OR ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text)))) AND (submitted_by IS NULL)))));



  create policy "prod_entries_allow_insert_own"
  on "sileko"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((submitted_by = auth.uid()));



  create policy "prod_entries_allow_select_own"
  on "sileko"."production_entries"
  as permissive
  for select
  to authenticated
using ((submitted_by = auth.uid()));



  create policy "sileko_supervisors_insert_production_entries"
  on "sileko"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_prod_insert"
  on "sileko"."production_entries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_prod_select"
  on "sileko"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_prod_update"
  on "sileko"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_select_production_entries"
  on "sileko"."production_entries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_update_production_entries"
  on "sileko"."production_entries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "admin_policy_all"
  on "sileko"."production_points"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."shift_definitions"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "allow_authenticated_insert_shift_definitions"
  on "sileko"."shift_definitions"
  as permissive
  for insert
  to public
with check ((auth.uid() IS NOT NULL));



  create policy "allow_authenticated_select_shift_definitions"
  on "sileko"."shift_definitions"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "sileko_supervisors_select_shift_definitions"
  on "sileko"."shift_definitions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "sileko_supervisors_shift_defs_select"
  on "sileko"."shift_definitions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'sileko'::text)))));



  create policy "__debug_allow_myself_insert"
  on "sileko"."shift_plans"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = '1031b839-e5db-4ef6-9197-12afbdefb7da'::uuid));



  create policy "admin_policy_all"
  on "sileko"."shift_plans"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "sileko_controllers_insert_shift_plans"
  on "sileko"."shift_plans"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'sileko'::text)))));



  create policy "sileko_controllers_select_shift_plans"
  on "sileko"."shift_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'controller'::text) AND (lower(u.site) = 'sileko'::text)))));



  create policy "admin_policy_all"
  on "sileko"."shift_templates"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."shifts"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."users"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "sileko_users_select_admins"
  on "sileko"."users"
  as permissive
  for select
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "admin_policy_all"
  on "sileko"."workshop_jobs"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Allow read for all"
  on "workshop"."assets"
  as permissive
  for select
  to public
using (true);



  create policy "admin_policy_all"
  on "workshop"."assets"
  as permissive
  for all
  to authenticated
using ((current_setting('jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('jwt.claims.role'::text, true) = 'admin'::text));



  create policy "supervisors_update_workshop"
  on "workshop"."breakdowns"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (lower(u.role) = 'supervisor'::text)))));



  create policy "workshop_supervisors_insert_breakdowns"
  on "workshop"."breakdowns"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'supervisor'::text) AND (u.site = 'workshop'::text)))));



