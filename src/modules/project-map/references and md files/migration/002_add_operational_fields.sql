-- Migration: Add operational fields (Update 1)
-- Description: Adds lookup tables, datetime fields, mileage, and arrival times
-- Date: 2026-01-23

-- ============================================
-- 1. CREATE LOOKUP TABLES
-- ============================================

-- Building Categories
CREATE TABLE IF NOT EXISTS proj_s_building_categories (
  id SERIAL PRIMARY KEY,
  building_category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Permit Status
CREATE TABLE IF NOT EXISTS proj_s_permit_status (
  id SERIAL PRIMARY KEY,
  status_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Welcome Call Status
CREATE TABLE IF NOT EXISTS proj_s_welcome_call_status (
  id SERIAL PRIMARY KEY,
  status_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. SEED LOOKUP TABLES
-- ============================================

-- Seed Building Categories
INSERT INTO proj_s_building_categories (building_category_name, description, display_order, is_active) VALUES
  ('Garage', 'Garage structure', 1, true),
  ('Commercial', 'Commercial building', 2, true),
  ('Barn', 'Barn structure', 3, true),
  ('Storage', 'Storage building', 4, true),
  ('Lean-To', 'Lean-to structure', 5, true),
  ('Carport', 'Carport structure', 6, true),
  ('Agricultural', 'Agricultural building', 7, true),
  ('Residential', 'Residential structure', 8, true),
  ('Workshop', 'Workshop building', 9, true)
ON CONFLICT (building_category_name) DO NOTHING;

-- Seed Permit Status
INSERT INTO proj_s_permit_status (status_name, description, display_order, is_active) VALUES
  ('Pending', 'Permit application pending', 1, true),
  ('Submitted', 'Permit application submitted', 2, true),
  ('Approved', 'Permit approved', 3, true),
  ('Rejected', 'Permit rejected', 4, true),
  ('Not Required', 'Permit not required for this project', 5, true)
ON CONFLICT (status_name) DO NOTHING;

-- Seed Welcome Call Status
INSERT INTO proj_s_welcome_call_status (status_name, description, display_order, is_active) VALUES
  ('Pending', 'Welcome call not yet made', 1, true),
  ('Attempted', 'Welcome call attempted, no answer', 2, true),
  ('Completed', 'Welcome call completed', 3, true),
  ('Needs Callback', 'Welcome call requires callback', 4, true),
  ('Not Required', 'Welcome call not required', 5, true)
ON CONFLICT (status_name) DO NOTHING;

-- ============================================
-- 3. RENAME EXISTING DATE COLUMNS
-- ============================================

-- Rename order_received_date to order_received_at and change to datetime
ALTER TABLE proj_t_projects 
  ALTER COLUMN order_received_date TYPE TIMESTAMP USING order_received_date::timestamp;
ALTER TABLE proj_t_projects 
  ALTER COLUMN order_received_date SET DEFAULT NOW();
ALTER TABLE proj_t_projects 
  RENAME COLUMN order_received_date TO order_received_at;

-- Rename scheduled_project_date to scheduled_project_start and change to datetime
ALTER TABLE proj_t_projects 
  ALTER COLUMN scheduled_project_date TYPE TIMESTAMP USING scheduled_project_date::timestamp;
ALTER TABLE proj_t_projects 
  RENAME COLUMN scheduled_project_date TO scheduled_project_start;

-- Rename install_date to install_start and change to datetime
ALTER TABLE proj_t_projects 
  ALTER COLUMN install_date TYPE TIMESTAMP USING install_date::timestamp;
ALTER TABLE proj_t_projects 
  RENAME COLUMN install_date TO install_start;

-- ============================================
-- 4. ADD NEW COLUMNS TO proj_t_projects
-- ============================================

-- Add foreign keys for lookup tables
ALTER TABLE proj_t_projects 
  ADD COLUMN IF NOT EXISTS building_category_id INTEGER REFERENCES proj_s_building_categories(id),
  ADD COLUMN IF NOT EXISTS permit_status_id INTEGER REFERENCES proj_s_permit_status(id),
  ADD COLUMN IF NOT EXISTS welcome_call_status_id INTEGER REFERENCES proj_s_welcome_call_status(id),
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS scheduled_project_end TIMESTAMP,
  ADD COLUMN IF NOT EXISTS install_end TIMESTAMP;

-- ============================================
-- 5. ADD COLUMNS TO proj_t_runs
-- ============================================

ALTER TABLE proj_t_runs 
  ADD COLUMN IF NOT EXISTS estimated_mileage NUMERIC(10, 2);

-- ============================================
-- 6. ADD COLUMNS TO proj_t_run_projects
-- ============================================

ALTER TABLE proj_t_run_projects 
  ADD COLUMN IF NOT EXISTS arrival_datetime TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 7. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_building_category 
  ON proj_t_projects(building_category_id);

CREATE INDEX IF NOT EXISTS idx_projects_permit_status 
  ON proj_t_projects(permit_status_id);

CREATE INDEX IF NOT EXISTS idx_projects_welcome_call_status 
  ON proj_t_projects(welcome_call_status_id);

CREATE INDEX IF NOT EXISTS idx_run_projects_arrival 
  ON proj_t_run_projects(arrival_datetime);

-- ============================================
-- 8. LOG COMPLETION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 002_add_operational_fields completed successfully';
  RAISE NOTICE 'Created lookup tables: proj_s_building_categories, proj_s_permit_status, proj_s_welcome_call_status';
  RAISE NOTICE 'Renamed date columns to datetime: order_received_at, scheduled_project_start, install_start';
  RAISE NOTICE 'Added new columns to proj_t_projects: building_category_id, permit_status_id, welcome_call_status_id, invoice_number, scheduled_project_end, install_end';
  RAISE NOTICE 'Added estimated_mileage to proj_t_runs';
  RAISE NOTICE 'Added arrival_datetime, notes to proj_t_run_projects';
END $$;