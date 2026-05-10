-- ================================================================
-- RIDEFLOW DATABASE SCHEMA
-- Complete MySQL schema supporting all 7 modules
-- ================================================================

-- Using Aiven defaultdb, so no CREATE DATABASE needed.

-- ================================================================
-- 1. USERS TABLE - Base user table for admin, rider, driver
-- ================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Rider', 'Driver') NOT NULL,
    account_status ENUM('Active', 'Suspended', 'Banned') DEFAULT 'Active',
    profile_photo VARCHAR(500),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_account_status (account_status),
    INDEX idx_phone_number (phone_number),
    
    CHECK (role IN ('Admin', 'Rider', 'Driver')),
    CHECK (account_status IN ('Active', 'Suspended', 'Banned'))
);

-- ================================================================
-- 2. DRIVERS TABLE - Extended driver profile
-- ================================================================
CREATE TABLE drivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    cnic VARCHAR(50) NOT NULL UNIQUE,
    license_expiry DATE,
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    availability_status ENUM('Online', 'Offline', 'On Trip') DEFAULT 'Offline',
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    total_trips_completed INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification_status (verification_status),
    INDEX idx_availability_status (availability_status),
    INDEX idx_average_rating (average_rating),
    INDEX idx_is_flagged (is_flagged),
    
    CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    CHECK (availability_status IN ('Online', 'Offline', 'On Trip')),
    CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- ================================================================
-- 3. LOCATIONS TABLE - Geographic locations/addresses
-- ================================================================
CREATE TABLE locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    address VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    type ENUM('Residential', 'Commercial', 'Airport', 'Other') DEFAULT 'Other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_city (city),
    INDEX idx_area (area),
    INDEX idx_coordinates (latitude, longitude)
);

-- ================================================================
-- 4. VEHICLES TABLE - Driver vehicles with type classification
-- ================================================================
CREATE TABLE vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(50),
    license_plate VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL,
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    registration_number VARCHAR(50),
    insurance_expiry DATE,
    fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid') DEFAULT 'Petrol',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    INDEX idx_driver_id (driver_id),
    INDEX idx_vehicle_type (vehicle_type),
    INDEX idx_verification_status (verification_status),
    INDEX idx_license_plate (license_plate),
    
    CHECK (vehicle_type IN ('Economy', 'Premium', 'Bike')),
    CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    CHECK (fuel_type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid'))
);

-- ================================================================
-- 5. RIDES TABLE - Core ride requests and lifecycle
-- ================================================================
CREATE TABLE rides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location_id INT NOT NULL,
    dropoff_location_id INT NOT NULL,
    status ENUM('Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Requested',
    scheduled_time DATETIME,
    pickup_time DATETIME,
    dropoff_time DATETIME,
    distance_km DECIMAL(8, 2),
    duration_minutes INT,
    base_fare DECIMAL(10, 2),
    per_km_charge DECIMAL(8, 2),
    duration_charge DECIMAL(8, 2),
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    subtotal DECIMAL(10, 2),
    promo_discount DECIMAL(10, 2) DEFAULT 0.00,
    final_fare DECIMAL(10, 2),
    payment_method ENUM('Cash', 'Wallet', 'Card') DEFAULT 'Cash',
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    cancellation_reason VARCHAR(500),
    cancelled_by ENUM('Rider', 'Driver', 'Admin'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (pickup_location_id) REFERENCES locations(id),
    FOREIGN KEY (dropoff_location_id) REFERENCES locations(id),
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_payment_status (payment_status),
    
    CHECK (status IN ('Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled')),
    CHECK (payment_method IN ('Cash', 'Wallet', 'Card')),
    CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 5.0)
);

-- ================================================================
-- 6. PAYMENTS TABLE - Payment records with method/status tracking
-- ================================================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'Wallet', 'Card') NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    transaction_id VARCHAR(100),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    promo_code_id INT,
    promo_discount DECIMAL(10, 2) DEFAULT 0.00,
    refund_reason VARCHAR(500),
    refund_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
    -- promo_code_id FK added via ALTER TABLE after promo_codes is created
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_transaction_date (transaction_date),
    
    CHECK (payment_method IN ('Cash', 'Wallet', 'Card')),
    CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded'))
);

-- ================================================================
-- 7. RATINGS TABLE - Mutual ratings after ride completion
-- ================================================================
CREATE TABLE ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    rated_by ENUM('Rider', 'Driver') NOT NULL,
    rated_user_id INT NOT NULL,
    score INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_ride_id (ride_id),
    INDEX idx_rated_user_id (rated_user_id),
    INDEX idx_created_at (created_at),
    
    CHECK (rated_by IN ('Rider', 'Driver')),
    CHECK (score >= 1 AND score <= 5)
);

-- ================================================================
-- 8. COMPLAINTS TABLE - Complaints filed by users
-- ================================================================
CREATE TABLE complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    filed_by INT NOT NULL,
    complaint_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Open', 'In Review', 'Resolved', 'Dismissed') DEFAULT 'Open',
    resolution_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (filed_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_ride_id (ride_id),
    INDEX idx_filed_by (filed_by),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at),
    
    CHECK (status IN ('Open', 'In Review', 'Resolved', 'Dismissed'))
);

-- ================================================================
-- 9. PROMO_CODES TABLE - Discount codes with expiry/usage limits
-- ================================================================
CREATE TABLE promo_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('Percent', 'Fixed') DEFAULT 'Percent',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_ride_fare DECIMAL(10, 2) DEFAULT 0.00,
    max_discount DECIMAL(10, 2),
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_uses INT,
    used_count INT DEFAULT 0,
    applicable_to ENUM('All', 'Rider', 'Driver') DEFAULT 'All',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_is_active (is_active),
    INDEX idx_expiry_date (expiry_date),
    
    CHECK (discount_type IN ('Percent', 'Fixed')),
    CHECK (applicable_to IN ('All', 'Rider', 'Driver'))
);

-- ================================================================
-- 10. FARE_RULES TABLE - Pricing rules by vehicle type
-- ================================================================
CREATE TABLE fare_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL UNIQUE,
    base_rate DECIMAL(10, 2) NOT NULL,
    per_km_rate DECIMAL(8, 2) NOT NULL,
    per_minute_rate DECIMAL(8, 2) NOT NULL,
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.5,
    is_peak_hour BOOLEAN DEFAULT FALSE,
    peak_hours_start TIME,
    peak_hours_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_vehicle_type (vehicle_type),
    
    CHECK (vehicle_type IN ('Economy', 'Premium', 'Bike')),
    CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 5.0)
);

-- ================================================================
-- 11. DRIVER_EARNINGS TABLE - Earnings ledger with commission tracking
-- ================================================================
CREATE TABLE driver_earnings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    ride_id INT NOT NULL,
    gross_fare DECIMAL(10, 2) NOT NULL,
    commission_percent DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_earning DECIMAL(10, 2) NOT NULL,
    payout_status ENUM('Pending', 'Processed', 'Cancelled') DEFAULT 'Pending',
    payout_date DATETIME,
    payout_method ENUM('Bank Transfer', 'Wallet', 'Check') DEFAULT 'Bank Transfer',
    bank_account VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    
    INDEX idx_driver_id (driver_id),
    INDEX idx_payout_status (payout_status),
    INDEX idx_created_at (created_at),
    
    CHECK (payout_status IN ('Pending', 'Processed', 'Cancelled')),
    CHECK (payout_method IN ('Bank Transfer', 'Wallet', 'Check'))
);

-- ================================================================
-- 12. WALLET_TRANSACTIONS TABLE - Rider wallet ledger
-- ================================================================
CREATE TABLE wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    type ENUM('TopUp', 'RidePayment', 'Refund', 'PromoCredit', 'Withdrawal') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    ride_id INT,
    promo_code_id INT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL,
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    
    CHECK (type IN ('TopUp', 'RidePayment', 'Refund', 'PromoCredit', 'Withdrawal'))
);

-- ================================================================
-- 13. RIDE_HISTORY TABLE - Archived completed/cancelled rides
-- ================================================================
CREATE TABLE ride_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location_id INT NOT NULL,
    dropoff_location_id INT NOT NULL,
    ride_status ENUM('Completed', 'Cancelled') NOT NULL,
    fare DECIMAL(10, 2),
    distance_km DECIMAL(8, 2),
    duration_minutes INT,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (pickup_location_id) REFERENCES locations(id),
    FOREIGN KEY (dropoff_location_id) REFERENCES locations(id),
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_archived_at (archived_at),
    
    CHECK (ride_status IN ('Completed', 'Cancelled'))
);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger: Update driver average rating when new rating added

CREATE TRIGGER update_driver_average_rating
AFTER INSERT ON ratings
FOR EACH ROW
BEGIN
    DECLARE driver_user_id INT;
    DECLARE avg_rating DECIMAL(3, 2);
    
    -- Get driver ID from the rated user if they're a driver
    SELECT id INTO driver_user_id FROM drivers 
    WHERE user_id = NEW.rated_user_id;
    
    IF driver_user_id IS NOT NULL THEN
        -- Calculate new average rating
        SELECT ROUND(AVG(score), 2) INTO avg_rating 
        FROM ratings 
        WHERE rated_user_id = NEW.rated_user_id AND rated_by = 'Rider';
        
        -- Update driver average rating
        UPDATE drivers SET average_rating = COALESCE(avg_rating, 0) 
        WHERE id = driver_user_id;
        
        -- Flag driver if rating drops below 3.5
        IF avg_rating < 3.5 THEN
            UPDATE drivers SET is_flagged = TRUE, flagged_reason = 'Low average rating' 
            WHERE id = driver_user_id;
        END IF;
    END IF;
END;


-- Trigger: Archive completed ride to ride_history

CREATE TRIGGER archive_completed_ride
AFTER UPDATE ON rides
FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        INSERT INTO ride_history (
            ride_id, rider_id, driver_id, vehicle_id, 
            pickup_location_id, dropoff_location_id, 
            ride_status, fare, distance_km, duration_minutes
        ) VALUES (
            NEW.id, NEW.rider_id, NEW.driver_id, NEW.vehicle_id,
            NEW.pickup_location_id, NEW.dropoff_location_id,
            'Completed', NEW.final_fare, NEW.distance_km, NEW.duration_minutes
        );
    ELSEIF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
        INSERT INTO ride_history (
            ride_id, rider_id, driver_id, vehicle_id,
            pickup_location_id, dropoff_location_id,
            ride_status, fare, distance_km, duration_minutes
        ) VALUES (
            NEW.id, NEW.rider_id, NEW.driver_id, NEW.vehicle_id,
            NEW.pickup_location_id, NEW.dropoff_location_id,
            'Cancelled', NEW.final_fare, NEW.distance_km, NEW.duration_minutes
        );
    END IF;
END;


-- ================================================================
-- STORED PROCEDURES
-- ================================================================

-- Stored Procedure: Calculate fare with surge pricing

CREATE PROCEDURE calculate_fare(
    IN p_vehicle_type VARCHAR(50),
    IN p_distance_km DECIMAL(8, 2),
    IN p_duration_minutes INT,
    IN p_surge_multiplier DECIMAL(3, 2),
    OUT p_base_fare DECIMAL(10, 2),
    OUT p_per_km_charge DECIMAL(8, 2),
    OUT p_duration_charge DECIMAL(8, 2),
    OUT p_subtotal DECIMAL(10, 2),
    OUT p_final_fare DECIMAL(10, 2)
)
BEGIN
    DECLARE v_base_rate DECIMAL(10, 2);
    DECLARE v_per_km_rate DECIMAL(8, 2);
    DECLARE v_per_minute_rate DECIMAL(8, 2);
    
    -- Get fare rules for vehicle type
    SELECT base_rate, per_km_rate, per_minute_rate INTO v_base_rate, v_per_km_rate, v_per_minute_rate
    FROM fare_rules
    WHERE vehicle_type = p_vehicle_type;
    
    -- Calculate components
    SET p_base_fare = v_base_rate;
    SET p_per_km_charge = (p_distance_km * v_per_km_rate);
    SET p_duration_charge = (p_duration_minutes * v_per_minute_rate);
    
    -- Subtotal before surge
    SET p_subtotal = (p_base_fare + p_per_km_charge + p_duration_charge);
    
    -- Apply surge multiplier
    SET p_final_fare = ROUND(p_subtotal * COALESCE(p_surge_multiplier, 1.0), 2);
END;


-- Stored Procedure: Get available drivers near a location

CREATE PROCEDURE get_available_drivers(
    IN p_latitude DECIMAL(10, 8),
    IN p_longitude DECIMAL(11, 8),
    IN p_max_distance_km INT,
    IN p_vehicle_type VARCHAR(50)
)
BEGIN
    SELECT 
        d.id,
        u.full_name,
        u.email,
        d.average_rating,
        d.current_location_lat,
        d.current_location_lng,
        (
            6371 * acos(
                cos(radians(p_latitude)) * cos(radians(d.current_location_lat)) * 
                cos(radians(d.current_location_lng) - radians(p_longitude)) + 
                sin(radians(p_latitude)) * sin(radians(d.current_location_lat))
            )
        ) AS distance_km
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    JOIN vehicles v ON d.id = v.driver_id
    WHERE d.availability_status = 'Online'
    AND d.verification_status = 'Verified'
    AND v.verification_status = 'Verified'
    AND v.vehicle_type = p_vehicle_type
    AND d.is_flagged = FALSE
    AND (
        6371 * acos(
            cos(radians(p_latitude)) * cos(radians(d.current_location_lat)) * 
            cos(radians(d.current_location_lng) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * sin(radians(d.current_location_lat))
        )
    ) <= p_max_distance_km
    ORDER BY d.average_rating DESC, distance_km ASC
    LIMIT 10;
END;


-- Stored Procedure: Process driver payout

CREATE PROCEDURE process_driver_payout(
    IN p_driver_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE,
    OUT p_total_earnings DECIMAL(12, 2),
    OUT p_payout_count INT
)
BEGIN
    UPDATE driver_earnings
    SET payout_status = 'Processed',
        payout_date = NOW()
    WHERE driver_id = p_driver_id
    AND payout_status = 'Pending'
    AND created_at BETWEEN p_from_date AND p_to_date;
    
    SELECT 
        SUM(net_earning),
        COUNT(*) INTO p_total_earnings, p_payout_count
    FROM driver_earnings
    WHERE driver_id = p_driver_id
    AND payout_status = 'Processed'
    AND payout_date BETWEEN p_from_date AND p_to_date;
END;


-- Add deferred FK for payments → promo_codes
ALTER TABLE payments
    ADD CONSTRAINT fk_payments_promo_code
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;

-- Stored Procedure: Get rider wallet balance

CREATE PROCEDURE get_rider_wallet_balance(
    IN p_rider_id INT,
    OUT p_balance DECIMAL(10, 2)
)
BEGIN
    SELECT COALESCE(SUM(
        CASE
            WHEN type IN ('TopUp', 'Refund', 'PromoCredit') THEN amount
            WHEN type IN ('RidePayment', 'Withdrawal') THEN -amount
        END
    ), 0) INTO p_balance
    FROM wallet_transactions
    WHERE rider_id = p_rider_id;
END;


-- Stored Procedure: Get driver dashboard stats

CREATE PROCEDURE get_driver_dashboard_stats(
    IN p_driver_id INT,
    IN p_period_start DATE,
    IN p_period_end DATE
)
BEGIN
    SELECT
        COUNT(*) AS total_trips,
        COALESCE(SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed_trips,
        COALESCE(SUM(CASE WHEN r.status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_trips,
        COALESCE(SUM(de.net_earning), 0) AS total_earnings,
        COALESCE(AVG(CASE WHEN r.status = 'Completed' THEN r.final_fare END), 0) AS avg_fare,
        d.average_rating,
        d.total_trips_completed
    FROM drivers d
    LEFT JOIN rides r ON r.driver_id = d.id AND r.created_at BETWEEN p_period_start AND p_period_end
    LEFT JOIN driver_earnings de ON de.ride_id = r.id
    WHERE d.id = p_driver_id
    GROUP BY d.id;
END;


-- Stored Procedure: Get admin platform overview

CREATE PROCEDURE get_admin_platform_overview(
    OUT p_total_users INT,
    OUT p_total_drivers INT,
    OUT p_total_rides INT,
    OUT p_total_revenue DECIMAL(12, 2),
    OUT p_active_complaints INT
)
BEGIN
    SELECT COUNT(*) INTO p_total_users FROM users;
    SELECT COUNT(*) INTO p_total_drivers FROM drivers;
    SELECT COUNT(*) INTO p_total_rides FROM rides;
    SELECT COALESCE(SUM(final_fare), 0) INTO p_total_revenue FROM rides WHERE status = 'Completed';
    SELECT COUNT(*) INTO p_active_complaints FROM complaints WHERE status IN ('Open', 'In Review');
END;


-- Trigger: Update driver trip count on ride completion

CREATE TRIGGER update_driver_trip_count
AFTER UPDATE ON rides
FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        UPDATE drivers
        SET total_trips_completed = total_trips_completed + 1,
            availability_status = 'Online'
        WHERE id = NEW.driver_id;
    ELSEIF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' AND NEW.cancelled_by = 'Driver' THEN
        UPDATE drivers
        SET availability_status = 'Online'
        WHERE id = NEW.driver_id;
    END IF;
END;


-- Trigger: Set driver to On Trip when ride is accepted

CREATE TRIGGER set_driver_on_trip
AFTER UPDATE ON rides
FOR EACH ROW
BEGIN
    IF NEW.status IN ('Accepted', 'Driver En Route', 'In Progress') AND OLD.status = 'Requested' THEN
        UPDATE drivers SET availability_status = 'On Trip' WHERE id = NEW.driver_id;
    END IF;
END;


-- Trigger: Create driver_earnings row on ride completion

CREATE TRIGGER create_driver_earning
AFTER UPDATE ON rides
FOR EACH ROW
BEGIN
    DECLARE v_commission_pct DECIMAL(5,2) DEFAULT 20.00;
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        INSERT INTO driver_earnings (driver_id, ride_id, gross_fare, commission_percent, commission_amount, net_earning)
        VALUES (
            NEW.driver_id,
            NEW.id,
            NEW.final_fare,
            v_commission_pct,
            ROUND(NEW.final_fare * v_commission_pct / 100, 2),
            ROUND(NEW.final_fare * (100 - v_commission_pct) / 100, 2)
        );
    END IF;
END;


-- ================================================================
-- INITIAL DATA (Optional demo data)
-- ================================================================

-- Insert demo locations (8 Islamabad zones)
INSERT INTO locations (city, area, address, latitude, longitude, type) VALUES
('Islamabad', 'F-10', 'F-10 Markaz, Islamabad', 33.6844, 73.0479, 'Commercial'),
('Islamabad', 'Blue Area', 'Blue Area, Islamabad', 33.7190, 73.1719, 'Commercial'),
('Islamabad', 'Jinnah', 'Jinnah Super Market, Islamabad', 33.6873, 73.1614, 'Residential'),
('Islamabad', 'G-9', 'G-9 Markaz, Islamabad', 33.6938, 73.0376, 'Commercial'),
('Islamabad', 'I-8', 'I-8 Markaz, Islamabad', 33.6666, 73.0711, 'Residential'),
('Islamabad', 'F-6', 'F-6 (Super Market), Islamabad', 33.7291, 73.0946, 'Commercial'),
('Islamabad', 'F-8', 'F-8 Markaz, Islamabad', 33.7114, 73.0545, 'Residential'),
('Islamabad', 'G-11', 'G-11 Markaz, Islamabad', 33.6750, 73.0170, 'Residential');

-- Insert demo fare rules
INSERT INTO fare_rules (vehicle_type, base_rate, per_km_rate, per_minute_rate, surge_multiplier, peak_hours_start, peak_hours_end) VALUES
('Economy', 50, 20, 5, 1.5, '08:00', '10:00'),
('Premium', 100, 35, 8, 1.8, '08:00', '10:00'),
('Bike', 30, 15, 3, 1.2, '08:00', '10:00');

-- Insert demo promo codes
INSERT INTO promo_codes (code, discount_type, discount_value, expiry_date, is_active, max_uses, used_count) VALUES
('FIRST10', 'Percent', 10, '2025-12-31', TRUE, 100, 5),
('SAVE20', 'Percent', 20, '2025-06-30', TRUE, 50, 3),
('WELCOME100', 'Fixed', 100, '2025-12-31', TRUE, 200, 12);

-- ================================================================
-- SUMMARY
-- ================================================================
-- Created 13 main tables:
-- 1. users - Base user table
-- 2. drivers - Driver profile
-- 3. locations - Geographic locations
-- 4. vehicles - Driver vehicles
-- 5. rides - Core ride lifecycle
-- 6. payments - Payment tracking
-- 7. ratings - User ratings
-- 8. complaints - Complaint management
-- 9. promo_codes - Discount codes
-- 10. fare_rules - Pricing rules
-- 11. driver_earnings - Earnings tracking
-- 12. wallet_transactions - Rider wallet ledger
-- 13. ride_history - Archived rides
--
-- Added:
-- - Primary and foreign keys
-- - Unique constraints (email, license_plate, code)
-- - Check constraints for enums
-- - Indexes for query performance
-- - 5 triggers (rating updates, ride archiving, driver trip count, driver on-trip status, driver earnings auto-create)
-- - 6 stored procedures (fare calc, driver search, payout, wallet balance, driver stats, admin overview)
