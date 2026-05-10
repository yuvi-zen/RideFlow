# RideFlow Frontend

A professional, responsive ride-hailing platform frontend built with vanilla HTML/CSS/JavaScript.

## Project Structure

```
RideFlow-Frontend/
├── index.html                 # Main entry point
├── css/
│   ├── global.css            # Global styles, variables, layout
│   ├── components.css        # Reusable component styles
│   └── pages.css             # Page-specific styles
├── js/
│   ├── app.js                # Main application logic & router
│   ├── mock-data.js          # Mock/dummy data for testing
│   ├── components/
│   │   ├── navbar.js         # Navigation component
│   │   ├── sidebar.js        # Sidebar for dashboards
│   │   ├── table.js          # Reusable table component
│   │   ├── card.js           # Card component
│   │   ├── modal.js          # Modal dialog component
│   │   ├── toast.js          # Notification toasts
│   │   └── form.js           # Form validation utilities
│   ├── pages/
│   │   ├── landing.js        # Landing page
│   │   ├── auth.js           # Login/Register pages
│   │   ├── admin-dashboard.js # Admin dashboard
│   │   ├── rider-dashboard.js # Rider dashboard
│   │   └── driver-dashboard.js # Driver dashboard
│   └── utils/
│       ├── api.js            # API calls (mock initially)
│       ├── storage.js        # LocalStorage utilities
│       └── helpers.js        # Helper functions
├── templates/                # HTML templates for pages
│   ├── landing.html
│   ├── login.html
│   ├── register.html
│   ├── admin-dashboard.html
│   ├── rider-dashboard.html
│   └── driver-dashboard.html
└── assets/
    ├── images/
    └── icons/
```

## Features

- ✅ Responsive design (desktop/laptop first, mobile support)
- ✅ Component-based modular architecture
- ✅ Mock data for testing
- ✅ Form validation
- ✅ Dashboard layouts for Admin, Rider, Driver
- ✅ Modern UI with professional styling
- ✅ Easy API integration points
- ✅ LocalStorage for session management

## Getting Started

1. Open `index.html` in a browser
2. Navigate through the app using the UI
3. Mock data is loaded automatically for testing
4. Connect to real MySQL APIs by updating `js/utils/api.js`

## Technologies Used

- HTML5
- CSS3 (Grid, Flexbox, CSS Variables)
- Vanilla JavaScript (ES6+)
- LocalStorage for session persistence
