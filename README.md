# QuickCrave

QuickCrave is a React and JavaScript frontend for a neighborhood restaurant marketplace. It has separate customer and restaurant account flows, protected workspaces, public approved menus, restaurant onboarding, and menu management.

## Technology

- React 19 and JavaScript (ES modules; no TypeScript)
- React Router for public, customer, and restaurant routes
- Supabase Auth, Postgres, Row Level Security, and Storage
- Vite for development and production builds

## Set up Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy the project URL and the publishable key (or legacy anon key). Never use a `service_role` or secret key in this frontend.
3. Copy `.env.example` to `.env.local` and fill in those two values:

   ```text
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

4. Run `supabase/migrations/20261102090000_initial_marketplace.sql` in the Supabase SQL Editor. It creates profiles, restaurant and membership records, private restaurant contact records, menu items, signup provisioning, RLS policies, and the menu image bucket.
5. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and allow the customer and restaurant login URLs as redirects. Configure email confirmation and production URLs before deployment.
6. Restart Vite after changing environment variables.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Production build and preview:

```sh
npm run build
npm run preview
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page and approved available restaurant menu items. |
| `/account` | Choose customer or restaurant access. |
| `/customer/login` and `/customer/signup` | Customer authentication. |
| `/restaurant/login` and `/restaurant/signup` | Restaurant owner authentication and pending restaurant registration. |
| `/customer/dashboard` | Approved restaurant discovery feed. |
| `/customer/dashboard/profile` | Edit customer name, phone, and delivery address. |
| `/restaurant/dashboard` | Restaurant workspace and approval status. |
| `/restaurant/dashboard/menu` | Add, edit, remove, and mark menu items available/unavailable; upload menu photos. |
| `/restaurant/dashboard/settings` | Edit restaurant contact details, location, and hours. |

## Database and access controls

The migration uses RLS so users can only read/update their own profile, restaurant members can access their restaurant workspace, and only restaurant owners can change restaurant settings or menus. Restaurant email, phone, and WhatsApp details are stored separately from the public restaurant profile and are readable only by restaurant members. New restaurants start as `pending`; owners cannot change the approval status. Only approved restaurants and available menu items are returned to public visitors. Menu photos are restricted by file type and size and owner-scoped for uploads.

Restaurant registration creates a pending restaurant profile and owner membership through a database trigger. Review and approval are administrative operations and are not exposed to restaurant accounts.

## Current scope

Supabase configuration is required for account, profile, restaurant, and menu data. Without it, account forms are disabled and dashboard routes explain how to configure the service. Customer profile updates and restaurant profiles/menu items are persisted once Supabase is configured.

Order-request storage, customer order placement/status, staff invitations and roles, password recovery, email/WhatsApp notifications, delivery workflows, menu dietary/allergen fields, and production administrator tooling are not implemented yet. Do not accept real orders until those flows and their operational policies are in place.
