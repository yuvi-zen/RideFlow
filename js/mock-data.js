/**
 * Mock-Data.js - Sample Data for RideFlow Frontend Testing
 * Contains mock data that mimics the MySQL database structure
 */

// ==================== USERS ====================
const mockUsers = [
    {
        id: 1,
        full_name: 'Ahmed Admin',
        email: 'admin@rideflow.com',
        phone_number: '03001234567',
        password: 'Admin@123',
        role: 'Admin',
        account_status: 'Active',
        registration_date: '2025-01-15T10:30:00Z'
    },
    {
        id: 2,
        full_name: 'Alaxandar',
        email: 'rider@rideflow.com',
        phone_number: '03009876543',
        password: 'Rider@123',
        role: 'Rider',
        account_status: 'Active',
        registration_date: '2025-02-01T08:15:00Z'
    },
    {
        id: 3,
        full_name: 'Aizen',
        email: 'driver@rideflow.com',
        phone_number: '03005555555',
        password: 'Driver@123',
        role: 'Driver',
        account_status: 'Active',
        registration_date: '2025-02-10T14:45:00Z'
    },
    {
        id: 4,
        full_name: 'Ali Khan',
        email: 'ali@example.com',
        phone_number: '03001111111',
        password: 'Ali@123',
        role: 'Rider',
        account_status: 'Active',
        registration_date: '2025-02-15T09:00:00Z'
    },
    {
        id: 5,
        full_name: 'Sara Driver',
        email: 'sara@example.com',
        phone_number: '03002222222',
        password: 'Sara@123',
        role: 'Driver',
        account_status: 'Active',
        registration_date: '2025-02-12T11:20:00Z'
    }
];

// ==================== DRIVERS ====================
const mockDrivers = [
    {
        id: 1,
        user_id: 3,
        license_number: 'LIC-20250001',
        cnic: '12345-6789012-3',
        profile_photo: 'https://via.placeholder.com/150?text=Driver1',
        verification_status: 'Verified',
        availability_status: 'Online',
        total_trips: 145,
        average_rating: 4.7,
        current_location: {
            address: 'F-10 Markaz, Islamabad',
            latitude: 33.6844,
            longitude: 73.0479
        },
        created_at: '2025-02-10T14:45:00Z'
    },
    {
        id: 2,
        user_id: 5,
        license_number: 'LIC-20250002',
        cnic: '12345-6789013-4',
        profile_photo: 'https://via.placeholder.com/150?text=Driver2',
        verification_status: 'Verified',
        availability_status: 'Offline',
        total_trips: 89,
        average_rating: 4.3,
        current_location: {
            address: 'Blue Area, Islamabad',
            latitude: 33.7190,
            longitude: 73.1719
        },
        created_at: '2025-02-12T11:20:00Z'
    },
    {
        id: 3,
        user_id: 6,
        license_number: 'LIC-20250003',
        cnic: '12345-6789014-5',
        profile_photo: 'https://via.placeholder.com/150?text=Driver3',
        verification_status: 'Pending',
        availability_status: 'Offline',
        total_trips: 0,
        average_rating: 0,
        current_location: {
            address: 'Jinnah Super Market, Islamabad',
            latitude: 33.6873,
            longitude: 73.1614
        },
        created_at: '2025-03-01T16:00:00Z'
    }
];

// ==================== LOCATIONS ====================
const mockLocations = [
    {
        id: 1,
        city: 'Islamabad',
        address: 'F-10 Markaz, Islamabad',
        latitude: 33.6844,
        longitude: 73.0479
    },
    {
        id: 2,
        city: 'Islamabad',
        address: 'Blue Area, Islamabad',
        latitude: 33.7190,
        longitude: 73.1719
    },
    {
        id: 3,
        city: 'Islamabad',
        address: 'Jinnah Super Market, Islamabad',
        latitude: 33.6873,
        longitude: 73.1614
    },
    {
        id: 4,
        city: 'Islamabad',
        address: 'G-9 Markaz, Islamabad',
        latitude: 33.6938,
        longitude: 73.0376
    },
    {
        id: 5,
        city: 'Islamabad',
        address: 'I-8 Markaz, Islamabad',
        latitude: 33.6666,
        longitude: 73.0711
    },
    {
        id: 6,
        city: 'Islamabad',
        address: 'F-6 (Super Market), Islamabad',
        latitude: 33.7291,
        longitude: 73.0946
    },
    {
        id: 7,
        city: 'Islamabad',
        address: 'F-8 Markaz, Islamabad',
        latitude: 33.7114,
        longitude: 73.0545
    },
    {
        id: 8,
        city: 'Islamabad',
        address: 'G-11 Markaz, Islamabad',
        latitude: 33.6750,
        longitude: 73.0170
    }
];

// ==================== VEHICLES ====================
const mockVehicles = [
    {
        id: 1,
        driver_id: 1,
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        color: 'Silver',
        license_plate: 'ABC-123',
        vehicle_type: 'Economy',
        verification_status: 'Verified',
        created_at: '2025-02-10T14:45:00Z'
    },
    {
        id: 2,
        driver_id: 1,
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        color: 'Black',
        license_plate: 'XYZ-789',
        vehicle_type: 'Premium',
        verification_status: 'Verified',
        created_at: '2025-02-11T10:20:00Z'
    },
    {
        id: 3,
        driver_id: 2,
        make: 'Suzuki',
        model: 'Alto',
        year: 2021,
        color: 'White',
        license_plate: 'DEF-456',
        vehicle_type: 'Economy',
        verification_status: 'Verified',
        created_at: '2025-02-12T11:20:00Z'
    },
    {
        id: 4,
        driver_id: 3,
        make: 'Toyota',
        model: 'Prius',
        year: 2024,
        color: 'Red',
        license_plate: 'GHI-789',
        vehicle_type: 'Economy',
        verification_status: 'Pending',
        created_at: '2025-03-01T16:00:00Z'
    }
];

// ==================== DEMAND ZONES ====================
const mockDemandZones = [
    {
        id: 1,
        label: 'Blue Area',
        demand_level: 'High',
        score: 92,
        trend: 'Rising',
        center: { latitude: 33.7190, longitude: 73.1719 }
    },
    {
        id: 2,
        label: 'F-10 Markaz',
        demand_level: 'Medium',
        score: 78,
        trend: 'Stable',
        center: { latitude: 33.6844, longitude: 73.0479 }
    },
    {
        id: 3,
        label: 'Jinnah Super Market',
        demand_level: 'Moderate',
        score: 65,
        trend: 'Increasing',
        center: { latitude: 33.6873, longitude: 73.1614 }
    }
];

// ==================== RIDES ====================
const mockRides = [
    {
        id: 1,
        rider_id: 2,
        driver_id: 1,
        vehicle_id: 1,
        pickup_location_id: 1,
        dropoff_location_id: 2,
        status: 'Completed',
        fare: 450,
        distance: 8.5,
        duration: 15,
        scheduled_time: null,
        created_at: '2025-03-02T10:00:00Z',
        completed_at: '2025-03-02T10:20:00Z'
    },
    {
        id: 2,
        rider_id: 4,
        driver_id: 1,
        vehicle_id: 1,
        pickup_location_id: 2,
        dropoff_location_id: 3,
        status: 'Completed',
        fare: 350,
        distance: 6.2,
        duration: 12,
        scheduled_time: null,
        created_at: '2025-03-02T11:30:00Z',
        completed_at: '2025-03-02T11:45:00Z'
    },
    {
        id: 3,
        rider_id: 2,
        driver_id: null,
        vehicle_id: null,
        pickup_location_id: 1,
        dropoff_location_id: 4,
        status: 'Requested',
        fare: null,
        distance: null,
        duration: null,
        scheduled_time: null,
        created_at: '2025-03-02T14:00:00Z'
    },
    {
        id: 4,
        rider_id: 4,
        driver_id: 2,
        vehicle_id: 3,
        pickup_location_id: 3,
        dropoff_location_id: 5,
        status: 'In Progress',
        fare: 520,
        distance: 12.3,
        duration: 8,
        scheduled_time: null,
        created_at: '2025-03-02T15:15:00Z'
    }
];

// ==================== PAYMENTS ====================
const mockPayments = [
    {
        id: 1,
        ride_id: 1,
        rider_id: 2,
        amount: 450,
        payment_method: 'Card',
        payment_status: 'Paid',
        transaction_date: '2025-03-02T10:20:00Z',
        promo_id: null
    },
    {
        id: 2,
        ride_id: 2,
        rider_id: 4,
        amount: 315,
        payment_method: 'Wallet',
        payment_status: 'Paid',
        transaction_date: '2025-03-02T11:45:00Z',
        promo_id: 1
    }
];

// ==================== RATINGS ====================
const mockRatings = [
    {
        id: 1,
        ride_id: 1,
        rated_by: 'Rider',
        rated_user_id: 3,
        score: 5,
        comment: 'Great driver, very professional!',
        created_at: '2025-03-02T10:25:00Z'
    },
    {
        id: 2,
        ride_id: 1,
        rated_by: 'Driver',
        rated_user_id: 2,
        score: 4,
        comment: 'Good rider, was on time',
        created_at: '2025-03-02T10:26:00Z'
    },
    {
        id: 3,
        ride_id: 2,
        rated_by: 'Rider',
        rated_user_id: 3,
        score: 5,
        comment: 'Excellent service!',
        created_at: '2025-03-02T11:50:00Z'
    }
];

// ==================== COMPLAINTS ====================
const mockComplaints = [
    {
        id: 1,
        ride_id: 1,
        filed_by: 2,
        complaint_type: 'Rude Behavior',
        description: 'Driver was rude during the ride',
        status: 'Open',
        submitted_at: '2025-03-02T10:30:00Z',
        resolved_at: null
    },
    {
        id: 2,
        ride_id: 2,
        filed_by: 1,
        complaint_type: 'Wrong Route',
        description: 'Driver took a longer route',
        status: 'In Review',
        submitted_at: '2025-03-01T16:00:00Z',
        resolved_at: null
    }
];

// ==================== PROMO CODES ====================
const mockPromoCodes = [
    {
        id: 1,
        code: 'FIRST10',
        discount_percent: 10,
        expiry_date: '2025-12-31',
        is_active: true,
        max_uses: 100,
        used_count: 5
    },
    {
        id: 2,
        code: 'SAVE20',
        discount_percent: 20,
        expiry_date: '2025-06-30',
        is_active: true,
        max_uses: 50,
        used_count: 3
    },
    {
        id: 3,
        code: 'EXPIRED5',
        discount_percent: 5,
        expiry_date: '2025-01-01',
        is_active: false,
        max_uses: 200,
        used_count: 150
    }
];

// ==================== FARE RULES ====================
const mockFareRules = [
    {
        id: 1,
        vehicle_type: 'Economy',
        base_rate: 50,
        per_km_rate: 20,
        per_minute_rate: 5,
        surge_multiplier: 1.5,
        is_peak_hour: false
    },
    {
        id: 2,
        vehicle_type: 'Premium',
        base_rate: 100,
        per_km_rate: 35,
        per_minute_rate: 8,
        surge_multiplier: 1.8,
        is_peak_hour: false
    },
    {
        id: 3,
        vehicle_type: 'Bike',
        base_rate: 30,
        per_km_rate: 15,
        per_minute_rate: 3,
        surge_multiplier: 1.2,
        is_peak_hour: false
    }
];

// ==================== DRIVER EARNINGS ====================
const mockDriverEarnings = [
    {
        id: 1,
        driver_id: 1,
        ride_id: 1,
        gross_fare: 450,
        commission_percent: 20,
        commission_amount: 90,
        net_earning: 360,
        payout_status: 'Pending',
        created_at: '2025-03-02T10:20:00Z'
    },
    {
        id: 2,
        driver_id: 1,
        ride_id: 2,
        gross_fare: 350,
        commission_percent: 20,
        commission_amount: 70,
        net_earning: 280,
        payout_status: 'Pending',
        created_at: '2025-03-02T11:45:00Z'
    }
];

// ==================== RIDE HISTORY ====================
const mockRideHistory = [
    {
        id: 1,
        ride_id: 1,
        rider_id: 2,
        driver_id: 1,
        vehicle_id: 1,
        pickup_location_id: 1,
        dropoff_location_id: 2,
        ride_status: 'Completed',
        fare: 450,
        archived_at: '2025-03-02T10:20:00Z'
    }
];

// Export all mock data globally
window.mockUsers = mockUsers;
window.mockDrivers = mockDrivers;
window.mockLocations = mockLocations;
window.mockVehicles = mockVehicles;
window.mockRides = mockRides;
window.mockPayments = mockPayments;
window.mockRatings = mockRatings;
window.mockComplaints = mockComplaints;
window.mockPromoCodes = mockPromoCodes;
window.mockFareRules = mockFareRules;
window.mockDriverEarnings = mockDriverEarnings;
window.mockRideHistory = mockRideHistory;
window.mockDemandZones = mockDemandZones;
