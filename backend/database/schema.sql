-- ================================================================
-- RIDEFLOW DATABASE SCHEMA
-- Complete MySQL schema supporting all 7 modules
-- ================================================================

-- ================================================================
-- 1. USERS TABLE
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
    INDEX idx_role (role)
);

-- ================================================================
-- 2. DRIVERS TABLE
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 3. LOCATIONS TABLE
-- ================================================================
CREATE TABLE locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    address VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    type ENUM('Residential', 'Commercial', 'Airport', 'Other') DEFAULT 'Other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 4. VEHICLES TABLE
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- ================================================================
-- 5. RIDES TABLE
-- ================================================================
CREATE TABLE rides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location_id INT NOT NULL,
    dropoff_location_id INT NOT NULL,
    status ENUM('Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Requested',
    pickup_time DATETIME,
    dropoff_time DATETIME,
    distance_km DECIMAL(8, 2),
    subtotal DECIMAL(10, 2),
    final_fare DECIMAL(10, 2),
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (pickup_location_id) REFERENCES locations(id),
    FOREIGN KEY (dropoff_location_id) REFERENCES locations(id)
);

-- ================================================================
-- 6. PAYMENTS TABLE
-- ================================================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'Wallet', 'Card') NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    promo_code_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 7. RATINGS TABLE
-- ================================================================
CREATE TABLE ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    rated_by ENUM('Rider', 'Driver') NOT NULL,
    rated_user_id INT NOT NULL,
    score INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 8. COMPLAINTS TABLE
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
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (filed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 9. PROMO_CODES TABLE
-- ================================================================
CREATE TABLE promo_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('Percent', 'Fixed') DEFAULT 'Percent',
    discount_value DECIMAL(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    used_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 10. FARE_RULES TABLE
-- ================================================================
CREATE TABLE fare_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL UNIQUE,
    base_rate DECIMAL(10, 2) NOT NULL,
    per_km_rate DECIMAL(8, 2) NOT NULL,
    per_minute_rate DECIMAL(8, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 11. DRIVER_EARNINGS TABLE
-- ================================================================
CREATE TABLE driver_earnings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    ride_id INT NOT NULL,
    gross_fare DECIMAL(10, 2) NOT NULL,
    commission_percent DECIMAL(5, 2) NOT NULL,
    net_earning DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- ================================================================
-- 12. WALLET_TRANSACTIONS TABLE
-- ================================================================
CREATE TABLE wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    type ENUM('TopUp', 'RidePayment', 'Refund', 'PromoCredit', 'Withdrawal') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 13. RIDE_HISTORY TABLE
-- ================================================================
CREATE TABLE ride_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    driver_id INT,
    ride_status ENUM('Completed', 'Cancelled') NOT NULL,
    fare DECIMAL(10, 2),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- ================================================================
-- TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS update_driver_average_rating;
CREATE TRIGGER update_driver_average_rating
AFTER INSERT ON ratings
FOR EACH ROW
BEGIN
    DECLARE driver_user_id INT;
    DECLARE avg_rating DECIMAL(3, 2);
    SELECT id INTO driver_user_id FROM drivers WHERE user_id = NEW.rated_user_id;
    IF driver_user_id IS NOT NULL THEN
        SELECT ROUND(AVG(score), 2) INTO avg_rating FROM ratings WHERE rated_user_id = NEW.rated_user_id AND rated_by = 'Rider';
        UPDATE drivers SET average_rating = COALESCE(avg_rating, 0) WHERE id = driver_user_id;
        IF avg_rating < 3.5 THEN
            UPDATE drivers SET is_flagged = TRUE, flagged_reason = 'Low average rating' WHERE id = driver_user_id;
        END IF;
    END IF;
END;

DROP TRIGGER IF EXISTS archive_completed_ride;
CREATE TRIGGER archive_completed_ride
AFTER UPDATE ON rides
FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        INSERT INTO ride_history (ride_id, rider_id, driver_id, ride_status, fare)
        VALUES (NEW.id, NEW.rider_id, NEW.driver_id, 'Completed', NEW.final_fare);
    ELSEIF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
        INSERT INTO ride_history (ride_id, rider_id, driver_id, ride_status, fare)
        VALUES (NEW.id, NEW.rider_id, NEW.driver_id, 'Cancelled', NEW.final_fare);
    END IF;
END;

DROP TRIGGER IF EXISTS sync_ride_completion_on_payment;
CREATE TRIGGER sync_ride_completion_on_payment
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'Paid' AND OLD.payment_status != 'Paid' THEN
        UPDATE rides SET status = 'Completed' WHERE id = NEW.ride_id;
    END IF;
END;

DROP TRIGGER IF EXISTS increment_promo_usage;
CREATE TRIGGER increment_promo_usage
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.promo_code_id IS NOT NULL AND OLD.promo_code_id IS NULL THEN
        UPDATE promo_codes SET used_count = used_count + 1 WHERE id = NEW.promo_code_id;
    END IF;
END;

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW ActiveRidesView AS
SELECT r.id AS ride_id, r.status, u_rider.full_name AS rider_name, u_driver.full_name AS driver_name
FROM rides r
JOIN users u_rider ON r.rider_id = u_rider.id
LEFT JOIN drivers d ON r.driver_id = d.id
LEFT JOIN users u_driver ON d.user_id = u_driver.id
WHERE r.status IN ('Accepted', 'Driver En Route', 'In Progress');

CREATE OR REPLACE VIEW TopDriversView AS
SELECT d.id AS driver_id, u.full_name, d.average_rating
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE d.average_rating > 4.5;

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

DROP PROCEDURE IF EXISTS calculate_fare;
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
    SELECT base_rate, per_km_rate, per_minute_rate INTO v_base_rate, v_per_km_rate, v_per_minute_rate
    FROM fare_rules WHERE vehicle_type = p_vehicle_type;
    SET p_base_fare = v_base_rate;
    SET p_per_km_charge = (p_distance_km * v_per_km_rate);
    SET p_duration_charge = (p_duration_minutes * v_per_minute_rate);
    SET p_subtotal = (p_base_fare + p_per_km_charge + p_duration_charge);
    SET p_final_fare = ROUND(p_subtotal * COALESCE(p_surge_multiplier, 1.0), 2);
END;

DROP PROCEDURE IF EXISTS get_revenue_by_city;
CREATE PROCEDURE get_revenue_by_city()
BEGIN
    SELECT l.city, SUM(r.final_fare) AS total_revenue
    FROM rides r JOIN locations l ON r.pickup_location_id = l.id
    WHERE r.status = 'Completed' GROUP BY l.city;
END;

DROP PROCEDURE IF EXISTS get_low_rated_drivers;
CREATE PROCEDURE get_low_rated_drivers()
BEGIN
    SELECT u.full_name, AVG(rt.score) AS avg_score
    FROM users u JOIN ratings rt ON u.id = rt.rated_user_id
    GROUP BY u.id, u.full_name HAVING AVG(rt.score) < 3.5;
END;

DROP PROCEDURE IF EXISTS get_inactive_riders;
CREATE PROCEDURE get_inactive_riders()
BEGIN
    SELECT u.full_name, u.email FROM users u
    LEFT JOIN rides r ON u.id = r.rider_id
    WHERE u.role = 'Rider' AND r.id IS NULL;
END;

-- ================================================================
-- EVENTS
-- ================================================================

SET GLOBAL event_scheduler = ON;
DROP EVENT IF EXISTS daily_promo_expiry;
CREATE EVENT daily_promo_expiry
ON SCHEDULE EVERY 1 DAY
DO
  UPDATE promo_codes SET is_active = FALSE WHERE expiry_date < CURRENT_DATE;

-- ================================================================
-- INITIAL DATA
-- ================================================================
INSERT INTO fare_rules (vehicle_type, base_rate, per_km_rate, per_minute_rate) VALUES
('Economy', 50, 20, 5), ('Premium', 100, 35, 8), ('Bike', 30, 15, 3);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_rider ON rides(rider_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_payments_ride ON payments(ride_id);
CREATE INDEX idx_locations_city ON locations(city);
