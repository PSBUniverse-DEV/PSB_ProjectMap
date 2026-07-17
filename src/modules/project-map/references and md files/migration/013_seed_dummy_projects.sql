-- ====================================================
-- Migration 013: Seed Dummy Project Data
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 013: Seed Dummy Project Data';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/3: Seed origin addresses
-- ====================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '[STEP 1/3] Seeding origin addresses...';

    INSERT INTO public.proj_s_origin_addresses (origin_name, origin_code, formatted_address, address_line_1, city, state, state_code, postal_code, country, latitude, longitude, is_default, is_active)
    VALUES ('Atlanta HQ', 'ATL-HQ', '123 Peachtree St NE, Atlanta, GA 30303', '123 Peachtree St NE', 'Atlanta', 'Georgia', 'GA', '30303', 'USA', 33.7545, -84.3880, true, true)
    ON CONFLICT (origin_name) DO UPDATE SET
        origin_code = EXCLUDED.origin_code,
        formatted_address = EXCLUDED.formatted_address,
        address_line_1 = EXCLUDED.address_line_1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        state_code = EXCLUDED.state_code,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active;
    RAISE NOTICE '• Atlanta HQ: INSERTED or UPDATED';

    INSERT INTO public.proj_s_origin_addresses (origin_name, origin_code, formatted_address, address_line_1, city, state, state_code, postal_code, country, latitude, longitude, is_default, is_active)
    VALUES ('Tampa Warehouse', 'TPA-WH', '456 Industrial Blvd, Tampa, FL 33610', '456 Industrial Blvd', 'Tampa', 'Florida', 'FL', '33610', 'USA', 27.9942, -82.4458, false, true)
    ON CONFLICT (origin_name) DO UPDATE SET
        origin_code = EXCLUDED.origin_code,
        formatted_address = EXCLUDED.formatted_address,
        address_line_1 = EXCLUDED.address_line_1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        state_code = EXCLUDED.state_code,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active;
    RAISE NOTICE '• Tampa Warehouse: INSERTED or UPDATED';

    INSERT INTO public.proj_s_origin_addresses (origin_name, origin_code, formatted_address, address_line_1, city, state, state_code, postal_code, country, latitude, longitude, is_default, is_active)
    VALUES ('Dallas Service Center', 'DAL-SC', '789 Commerce St, Dallas, TX 75201', '789 Commerce St', 'Dallas', 'Texas', 'TX', '75201', 'USA', 32.7767, -96.7970, false, true)
    ON CONFLICT (origin_name) DO UPDATE SET
        origin_code = EXCLUDED.origin_code,
        formatted_address = EXCLUDED.formatted_address,
        address_line_1 = EXCLUDED.address_line_1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        state_code = EXCLUDED.state_code,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active;
    RAISE NOTICE '• Dallas Service Center: INSERTED or UPDATED';

    INSERT INTO public.proj_s_origin_addresses (origin_name, origin_code, formatted_address, address_line_1, city, state, state_code, postal_code, country, latitude, longitude, is_default, is_active)
    VALUES ('Phoenix Depot', 'PHX-DP', '321 Grand Ave, Phoenix, AZ 85001', '321 Grand Ave', 'Phoenix', 'Arizona', 'AZ', '85001', 'USA', 33.4484, -112.0740, false, true)
    ON CONFLICT (origin_name) DO UPDATE SET
        origin_code = EXCLUDED.origin_code,
        formatted_address = EXCLUDED.formatted_address,
        address_line_1 = EXCLUDED.address_line_1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        state_code = EXCLUDED.state_code,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active;
    RAISE NOTICE '• Phoenix Depot: INSERTED or UPDATED';

    RAISE NOTICE '✔ Origin addresses seeded.';
END $$;

-- ====================================================
-- STEP 2/3: Seed dummy projects
-- ====================================================
DO $$
DECLARE
    v_status_id INTEGER;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '[STEP 2/3] Seeding dummy projects...';

    -- ================================================
    -- Fully Installed projects (status_id = 9)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Fully Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Acme Solar Solutions', '1500 Main St, Austin, TX 78701', '1500 Main St', 'Austin', 'Texas', 'TX', '78701', 'USA', 30.2672, -97.7431, 30.2675, -97.7435, 'address', true, v_status_id, 'SunPower Dealer', '2025-11-01', '2025-12-15', '2026-01-10', 28500.00, 1, 1);
    RAISE NOTICE '• Acme Solar Solutions (Austin, TX) — Fully Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Green Energy Homes', '850 Oak Ave, Orlando, FL 32801', '850 Oak Ave', 'Orlando', 'Florida', 'FL', '32801', 'USA', 28.5383, -81.3792, 28.5386, -81.3796, 'address', true, v_status_id, 'Tesla Solar Partner', '2025-10-15', '2025-11-20', '2025-12-05', 42000.00, 1, 1);
    RAISE NOTICE '• Green Energy Homes (Orlando, FL) — Fully Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Bright Future Solar', '2000 River Rd, Atlanta, GA 30301', '2000 River Rd', 'Atlanta', 'Georgia', 'GA', '30301', 'USA', 33.7490, -84.3880, 33.7493, -84.3884, 'address', true, v_status_id, 'ADT Solar', '2025-09-20', '2025-10-25', '2025-11-15', 31500.00, 1, 1);
    RAISE NOTICE '• Bright Future Solar (Atlanta, GA) — Fully Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Pacific Ridge Energy', '500 Beach Blvd, San Diego, CA 92101', '500 Beach Blvd', 'San Diego', 'California', 'CA', '92101', 'USA', 32.7157, -117.1611, 32.7160, -117.1615, 'address', true, v_status_id, 'Momentum Solar', '2025-08-10', '2025-09-15', '2025-10-01', 52000.00, 1, 1);
    RAISE NOTICE '• Pacific Ridge Energy (San Diego, CA) — Fully Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Mountain View Solar', '1200 Pine St, Denver, CO 80201', '1200 Pine St', 'Denver', 'Colorado', 'CO', '80201', 'USA', 39.7392, -104.9903, 39.7395, -104.9907, 'address', true, v_status_id, 'Sunrun', '2025-07-05', '2025-08-10', '2025-09-01', 38000.00, 1, 1);
    RAISE NOTICE '• Mountain View Solar (Denver, CO) — Fully Installed';

    -- ================================================
    -- Confirmed Install Date projects (status_id = 6)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Confirmed Install Date';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Desert Sun Energy', '750 Cactus Way, Phoenix, AZ 85001', '750 Cactus Way', 'Phoenix', 'Arizona', 'AZ', '85001', 'USA', 33.4484, -112.0740, 33.4487, -112.0744, 'address', true, v_status_id, 'SunPower Dealer', '2026-01-10', '2026-02-20', '2026-03-15', 45000.00, 1, 1);
    RAISE NOTICE '• Desert Sun Energy (Phoenix, AZ) — Confirmed Install Date';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Coastal Solar Group', '300 Ocean Dr, Miami, FL 33101', '300 Ocean Dr', 'Miami', 'Florida', 'FL', '33101', 'USA', 25.7617, -80.1918, 25.7620, -80.1922, 'address', true, v_status_id, 'Tesla Solar Partner', '2026-01-05', '2026-02-10', '2026-03-01', 36000.00, 1, 1);
    RAISE NOTICE '• Coastal Solar Group (Miami, FL) — Confirmed Install Date';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Lone Star Renewables', '1800 Elm St, Dallas, TX 75201', '1800 Elm St', 'Dallas', 'Texas', 'TX', '75201', 'USA', 32.7767, -96.7970, 32.7770, -96.7974, 'address', true, v_status_id, 'ADT Solar', '2025-12-20', '2026-01-25', '2026-02-10', 29500.00, 1, 1);
    RAISE NOTICE '• Lone Star Renewables (Dallas, TX) — Confirmed Install Date';

    -- ================================================
    -- Ready for Install projects (status_id = 5)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Ready for Install';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, project_subtotal, created_by, updated_by)
    VALUES ('Windy City Solar', '900 Michigan Ave, Chicago, IL 60601', '900 Michigan Ave', 'Chicago', 'Illinois', 'IL', '60601', 'USA', 41.8781, -87.6298, 41.8784, -87.6302, 'address', true, v_status_id, 'Momentum Solar', '2026-01-15', '2026-03-01', 33000.00, 1, 1);
    RAISE NOTICE '• Windy City Solar (Chicago, IL) — Ready for Install';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, project_subtotal, created_by, updated_by)
    VALUES ('Music City Energy', '400 Broadway, Nashville, TN 37201', '400 Broadway', 'Nashville', 'Tennessee', 'TN', '37201', 'USA', 36.1627, -86.7816, 36.1630, -86.7820, 'address', true, v_status_id, 'Sunrun', '2026-01-20', '2026-03-10', 27500.00, 1, 1);
    RAISE NOTICE '• Music City Energy (Nashville, TN) — Ready for Install';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, project_subtotal, created_by, updated_by)
    VALUES ('Empire State Solar', '600 Park Ave, New York, NY 10001', '600 Park Ave', 'New York', 'New York', 'NY', '10001', 'USA', 40.7614, -73.9776, 40.7617, -73.9780, 'address', true, v_status_id, 'SunPower Dealer', '2026-01-25', '2026-03-20', 48000.00, 1, 1);
    RAISE NOTICE '• Empire State Solar (New York, NY) — Ready for Install';

    -- ================================================
    -- Pending Permits projects (status_id = 3)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Pending Permits';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Cascadia Green Energy', '2500 1st Ave, Seattle, WA 98101', '2500 1st Ave', 'Seattle', 'Washington', 'WA', '98101', 'USA', 47.6062, -122.3321, 47.6065, -122.3325, 'address', true, v_status_id, 'Tesla Solar Partner', '2026-02-01', 41000.00, 1, 1);
    RAISE NOTICE '• Cascadia Green Energy (Seattle, WA) — Pending Permits';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Beaver State Solar', '1500 Hawthorne Blvd, Portland, OR 97201', '1500 Hawthorne Blvd', 'Portland', 'Oregon', 'OR', '97201', 'USA', 45.5152, -122.6784, 45.5155, -122.6788, 'address', true, v_status_id, 'ADT Solar', '2026-02-05', 32000.00, 1, 1);
    RAISE NOTICE '• Beaver State Solar (Portland, OR) — Pending Permits';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Aloha Energy Solutions', '100 King St, Honolulu, HI 96801', '100 King St', 'Honolulu', 'Hawaii', 'HI', '96801', 'USA', 21.3069, -157.8583, 21.3072, -157.8587, 'address', true, v_status_id, 'Momentum Solar', '2026-02-10', 55000.00, 1, 1);
    RAISE NOTICE '• Aloha Energy Solutions (Honolulu, HI) — Pending Permits';

    -- ================================================
    -- Pending Site Readiness projects (status_id = 4)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Pending Site Readiness';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Great Lakes Solar', '800 Lake Dr, Detroit, MI 48201', '800 Lake Dr', 'Detroit', 'Michigan', 'MI', '48201', 'USA', 42.3314, -83.0458, 42.3317, -83.0462, 'address', false, v_status_id, 'Sunrun', '2026-02-15', 28000.00, 1, 1);
    RAISE NOTICE '• Great Lakes Solar (Detroit, MI) — Pending Site Readiness';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Show Me Solar', '3500 Main St, Kansas City, MO 64101', '3500 Main St', 'Kansas City', 'Missouri', 'MO', '64101', 'USA', 39.0997, -94.5786, 39.1000, -94.5790, 'address', false, v_status_id, 'SunPower Dealer', '2026-02-20', 22500.00, 1, 1);
    RAISE NOTICE '• Show Me Solar (Kansas City, MO) — Pending Site Readiness';

    -- ================================================
    -- New Dealer Order projects (status_id = 1)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'New Dealer Order';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Pelican State Solar', '200 Canal St, New Orleans, LA 70101', '200 Canal St', 'New Orleans', 'Louisiana', 'LA', '70101', 'USA', 29.9511, -90.0715, 29.9514, -90.0719, 'address', false, v_status_id, 'Tesla Solar Partner', '2026-03-01', 34000.00, 1, 1);
    RAISE NOTICE '• Pelican State Solar (New Orleans, LA) — New Dealer Order';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Old Dominion Energy', '700 Main St, Richmond, VA 23201', '700 Main St', 'Richmond', 'Virginia', 'VA', '23201', 'USA', 37.5407, -77.4360, 37.5410, -77.4364, 'address', false, v_status_id, 'ADT Solar', '2026-03-05', 31000.00, 1, 1);
    RAISE NOTICE '• Old Dominion Energy (Richmond, VA) — New Dealer Order';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Sooner Solar Power', '1200 Classen Blvd, Oklahoma City, OK 73101', '1200 Classen Blvd', 'Oklahoma City', 'Oklahoma', 'OK', '73101', 'USA', 35.4676, -97.5164, 35.4679, -97.5168, 'address', false, v_status_id, 'Momentum Solar', '2026-03-08', 26000.00, 1, 1);
    RAISE NOTICE '• Sooner Solar Power (Oklahoma City, OK) — New Dealer Order';

    -- ================================================
    -- Welcome Email / Call projects (status_id = 2)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Welcome Email / Call';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('First State Solar', '500 Market St, Wilmington, DE 19801', '500 Market St', 'Wilmington', 'Delaware', 'DE', '19801', 'USA', 39.7447, -75.5484, 39.7450, -75.5488, 'address', false, v_status_id, 'Sunrun', '2026-03-10', 19500.00, 1, 1);
    RAISE NOTICE '• First State Solar (Wilmington, DE) — Welcome Email / Call';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Centennial Solar Group', '600 16th St, Denver, CO 80202', '600 16th St', 'Denver', 'Colorado', 'CO', '80202', 'USA', 39.7420, -104.9910, 39.7423, -104.9914, 'address', false, v_status_id, 'SunPower Dealer', '2026-03-12', 37000.00, 1, 1);
    RAISE NOTICE '• Centennial Solar Group (Denver, CO) — Welcome Email / Call';

    -- ================================================
    -- Currently Being Installed projects (status_id = 7)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Currently Being Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Bay State Solar', '250 Beacon St, Boston, MA 02101', '250 Beacon St', 'Boston', 'Massachusetts', 'MA', '02101', 'USA', 42.3601, -71.0589, 42.3604, -71.0593, 'address', true, v_status_id, 'Tesla Solar Partner', '2025-12-01', '2026-01-15', '2026-02-20', 44000.00, 1, 1);
    RAISE NOTICE '• Bay State Solar (Boston, MA) — Currently Being Installed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Garden State Energy', '900 Broad St, Newark, NJ 07101', '900 Broad St', 'Newark', 'New Jersey', 'NJ', '07101', 'USA', 40.7357, -74.1724, 40.7360, -74.1728, 'address', true, v_status_id, 'ADT Solar', '2025-12-15', '2026-01-20', '2026-02-25', 35000.00, 1, 1);
    RAISE NOTICE '• Garden State Energy (Newark, NJ) — Currently Being Installed';

    -- ================================================
    -- Pending Payment projects (status_id = 8)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Pending Payment';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Yellowhammer Solar', '400 20th St, Birmingham, AL 35201', '400 20th St', 'Birmingham', 'Alabama', 'AL', '35201', 'USA', 33.5207, -86.8025, 33.5210, -86.8029, 'address', true, v_status_id, 'Momentum Solar', '2025-11-20', '2025-12-20', '2026-01-15', 23000.00, 1, 1);
    RAISE NOTICE '• Yellowhammer Solar (Birmingham, AL) — Pending Payment';

    -- ================================================
    -- Completed projects (status_id = 12)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Completed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Tar Heel Solar', '300 Hillsborough St, Raleigh, NC 27601', '300 Hillsborough St', 'Raleigh', 'North Carolina', 'NC', '27601', 'USA', 35.7796, -78.6382, 35.7799, -78.6386, 'address', true, v_status_id, 'Sunrun', '2025-06-01', '2025-07-10', '2025-08-01', 39000.00, 1, 1);
    RAISE NOTICE '• Tar Heel Solar (Raleigh, NC) — Completed';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Palmetto State Solar', '700 Gervais St, Columbia, SC 29201', '700 Gervais St', 'Columbia', 'South Carolina', 'SC', '29201', 'USA', 34.0007, -81.0348, 34.0010, -81.0352, 'address', true, v_status_id, 'SunPower Dealer', '2025-05-15', '2025-06-20', '2025-07-10', 27000.00, 1, 1);
    RAISE NOTICE '• Palmetto State Solar (Columbia, SC) — Completed';

    -- ================================================
    -- Repairs projects (status_id = 10)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Repairs';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, project_subtotal, created_by, updated_by)
    VALUES ('Volunteer Solar', '500 Church St, Memphis, TN 38101', '500 Church St', 'Memphis', 'Tennessee', 'TN', '38101', 'USA', 35.1495, -90.0490, 35.1498, -90.0494, 'address', true, v_status_id, 'Tesla Solar Partner', '2026-02-25', 18000.00, 1, 1);
    RAISE NOTICE '• Volunteer Solar (Memphis, TN) — Repairs';

    -- ================================================
    -- Collections projects (status_id = 11)
    -- ================================================
    SELECT status_id INTO v_status_id FROM proj_s_project_status WHERE status_name = 'Collections';

    INSERT INTO public.proj_t_projects (client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, location_source, location_confirmed, status_id, dealer, order_received_date, scheduled_project_date, install_date, project_subtotal, created_by, updated_by)
    VALUES ('Silver State Solar', '1000 Virginia St, Reno, NV 89501', '1000 Virginia St', 'Reno', 'Nevada', 'NV', '89501', 'USA', 39.5296, -119.8138, 39.5299, -119.8142, 'address', true, v_status_id, 'ADT Solar', '2025-10-01', '2025-11-05', '2025-12-01', 33000.00, 1, 1);
    RAISE NOTICE '• Silver State Solar (Reno, NV) — Collections';

    RAISE NOTICE '✔ Dummy projects seeded successfully.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '013' AS migration,
    'Seed Dummy Project Data' AS name,
    0 AS tables_created,
    0 AS tables_updated,
    0 AS columns_added,
    0 AS columns_skipped,
    0 AS indexes_created,
    4 AS origins_inserted,
    0 AS origins_updated,
    28 AS projects_inserted,
    0 AS projects_updated,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;