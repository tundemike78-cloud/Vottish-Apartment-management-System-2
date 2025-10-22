# Vottsh AMS - Apartment & Estate Management System

A comprehensive multi-tenant property management platform built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

### Core Functionality

- **Multi-Tenant Architecture**: Organizations with role-based access control (Owner, Staff, Vendor, Tenant, Security)
- **Property Management**: Manage multiple properties, units, and residents
- **Work Order System**: Full maintenance request workflow with SLA tracking
- **Vendor Marketplace**: Connect with service providers, request quotes, assign jobs
- **Visitor Access Codes**: Generate and validate time-boxed visitor passes
- **E-commerce Integration**: Order cooking gas cylinders with delivery tracking
- **Real-time Dashboards**: Role-specific views with analytics and KPIs
- **Audit Logging**: Complete activity tracking for compliance

### Security & Access Control

- Email/password authentication via Supabase Auth
- Row Level Security (RLS) on all database tables
- Multi-tenant data isolation
- Role-based permissions (RBAC)

### Business Features

- **Freemium Model**: Free tier with 1 property, paid premium plans
- SLA management with automatic escalations
- Vendor verification with document management
- Real-time notifications
- Comprehensive reporting

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Database**: PostgreSQL with PostGIS extension
- **State Management**: React Context API
- **Type Safety**: Full TypeScript coverage

## Prerequisites

- Node.js 18+ and npm
- Supabase account (database is already configured)

## Environment Setup

The `.env` file is already configured with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Installation & Running

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed Sample Data

Call the seed function to populate gas cylinder products:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/seed-database
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
npm run preview
```

## Getting Started

### First-Time Setup

1. **Sign Up**: Create an account at `/signup`
   - Enter your name, email, and password
   - Provide organization name
   - Add your first property details
   - **Note**: If you see "User already registered", use the login page instead

2. **Login**: Existing users can sign in at `/login`
   - Use your registered email and password
   - System will automatically redirect to dashboard

3. **Dashboard**: After signup/login, you'll land on the main dashboard
   - View work order statistics
   - Monitor SLA compliance
   - Track spending

### Common Issues

**"User already registered" error during signup**
- This means an account with this email already exists
- Click "Go to login page" or use the "Sign in" link
- Use your password to login

**"Invalid email or password" during login**
- Double-check your email and password
- Passwords are case-sensitive
- If you forgot your password, contact support (password reset coming soon)

### User Roles

#### Owner
- Full access to all features
- Manage organization and billing
- Add/remove properties
- Invite team members
- View analytics and reports

#### Staff
- Manage work orders
- Assign vendors
- Generate visitor passes
- Handle resident requests

#### Tenant
- Submit maintenance requests
- Track work order status
- Generate visitor passes (if enabled)
- Order gas cylinders

#### Vendor
- View assigned jobs
- Submit quotes
- Upload completion proof
- Manage profile and documents

#### Security
- Validate visitor access codes
- View visitor logs
- Monitor property access

## Key Features Guide

### Work Orders

1. Create a work order with title, description, category, and priority
2. System automatically calculates SLA due date:
   - Critical: 4 hours
   - High: 24 hours
   - Normal: 3 days
   - Low: 7 days
3. Assign to staff or vendor
4. Track through workflow: New → Triaged → Assigned → In Progress → Completed
5. Overdue items highlighted in red

### Visitor Passes

1. Navigate to Visitor Passes
2. Click "Generate Pass"
3. Select property and set validity window
4. System generates 4-digit code
5. Security validates codes at entry
6. Automatic expiry and usage tracking

### Gas Store

1. Browse available gas cylinder products
2. Add items to cart
3. Select delivery property
4. Checkout (mock payment in development)
5. Track order status through delivery

### Properties

1. Add properties with name, type, address
2. Track unit count
3. Associate work orders and visitors
4. View property-specific analytics

## Database Schema

### Core Tables

- `users` - User accounts and profiles
- `organizations` - Tenant organizations
- `org_members` - User-org relationships with roles
- `properties` - Buildings and estates
- `units` - Individual apartments/units
- `residents` - People living in units
- `vendors` - Service providers
- `work_orders` - Maintenance requests
- `work_order_messages` - Communication threads
- `quotes` - Vendor pricing proposals
- `visitor_passes` - Access codes
- `visitor_events` - Validation logs
- `products` - E-commerce catalog
- `orders` - Purchase orders
- `deliveries` - Delivery tracking
- `subscriptions` - Billing plans
- `vendor_reviews` - Ratings and feedback
- `audit_logs` - Activity tracking

### Security

All tables have Row Level Security (RLS) enabled with policies enforcing:
- Multi-tenant isolation by organization
- Role-based access control
- Owner verification for sensitive operations

## API Endpoints (Supabase Edge Functions)

### seed-database
- **Method**: POST
- **URL**: `/functions/v1/seed-database`
- **Auth**: Not required
- **Purpose**: Populate database with sample gas products

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navigation, sidebar, layout
│   └── ui/              # Reusable UI components
├── contexts/            # React contexts (Auth, Org)
├── lib/                 # Supabase client & types
├── pages/
│   ├── auth/            # Login, signup
│   ├── dashboard/       # Main dashboard
│   ├── properties/      # Property management
│   ├── work-orders/     # Work order system
│   ├── visitor-passes/  # Visitor access
│   └── gas-store/       # E-commerce
└── App.tsx              # Main app component
```

## Billing & Plans

### Free Tier
- 1 property
- 50 work orders/month
- Basic visitor codes
- No analytics export

### Premium ($19.99/month or $149/year)
- Unlimited properties
- Unlimited work orders
- Advanced analytics
- Vendor verification badges
- SLA management
- Priority support

## Future Enhancements

- Stripe payment integration
- SMS notifications
- Mobile apps (React Native)
- Document storage (S3)
- Advanced reporting & exports
- Bulk import/export
- Email templates
- Calendar integrations
- Vendor marketplace ratings
- Automated vendor dispatch
- IoT device integrations

## Support

For issues or questions:
1. Check this README
2. Review Supabase documentation
3. Check application logs in browser console

## License

Proprietary - All rights reserved

---

**Built with ❤️ using React, TypeScript, and Supabase**
