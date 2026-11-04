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

4. Run these files in the Supabase SQL Editor in order:
   - `supabase/migrations/20261102090000_initial_marketplace.sql`
   - `supabase/migrations/20261103000000_admin_dashboard_and_signup_controls.sql`
   - `supabase/migrations/20261103010000_order_requests.sql`
   - `supabase/migrations/20261104120000_order_item_images_and_admin_menu_preview.sql`
5. In **Authentication → URL Configuration**, set your Site URL to your production Vercel URL and add the reset pages to the Redirect URLs allowlist. Add the full URLs for your app, such as `https://your-project.vercel.app/customer/reset-password`, `https://your-project.vercel.app/restaurant/reset-password`, and `https://your-project.vercel.app/admin/reset-password`. For local testing, add the same paths on `http://localhost:5173`.

   Keep email confirmation enabled: restaurant owners still need to confirm their email; customer signup is confirmed by the server-side function. Password reset links use Supabase Auth email and are subject to Supabase's default email delivery limits and settings; sending reliably to all customers may require configuring custom SMTP.
6. Restart Vite after changing environment variables.

## Customer signup function

Customer accounts are created as email-confirmed users through a Supabase Edge Function; restaurant registration continues to use Supabase's normal email confirmation. The function uses the Supabase service-role key only inside Supabase and rate-limits attempts. Never put a service-role key in Vercel's `VITE_*` variables or browser code.

Install and authenticate the Supabase CLI, link the project, then deploy the public signup function:

```sh
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy customer-signup --no-verify-jwt
```

In **Supabase → Edge Functions → Secrets**, set `APP_ALLOWED_ORIGINS` to a comma-separated list of exact trusted origins, for example:

```text
https://quick-crave-ten.vercel.app,http://localhost:5173
```

Add any Vercel preview/custom domains you use. The function must be redeployed after code changes. It relies on Supabase's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` function secrets; do not expose them to the client.

## Features coming soon

These features are not available yet and are marked **Coming soon** in the relevant dashboard:

- Dietary and allergen information for menu items.
- Staff invitations and team roles.
- Delivery workflows beyond the current order-request status tracking.
- Automatic email and WhatsApp order notifications. Automatic email notifications will need a verified sending domain and an email provider; WhatsApp automation will need a supported messaging integration. Restaurant members can still contact customers through the existing WhatsApp link.

## Administrator access

There is no public admin signup. First create a normal QuickCrave account with the email you want to use as an administrator. After applying the admin migration, run this once in the Supabase SQL Editor, replacing the email:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing
returning user_id;
```

Confirm the query returns a user ID, then sign in at `/admin/login`. The admin dashboard can review, approve, reject, and suspend restaurant listings. Admin access is controlled by the private `admin_users` table and RLS; never grant it from client code.

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
| `/customer/forgot-password` and `/customer/reset-password` | Request a password reset email and set a new password. |
| `/restaurant/login` and `/restaurant/signup` | Restaurant owner authentication and pending restaurant registration. |
| `/restaurant/forgot-password` and `/restaurant/reset-password` | Request a password reset email and set a new password. |
| `/admin/login` | Private administrator sign-in; there is no public admin registration. |
| `/admin/forgot-password` and `/admin/reset-password` | Request a password reset email and set a new password. |
| `/admin/dashboard` | Review restaurant applications and manage approval status. |
| `/customer/dashboard` | Approved restaurant discovery feed. |
| `/customer/dashboard/orders` | Submit order requests and track their restaurant status. |
| `/customer/dashboard/profile` | Edit customer name, phone, and delivery address. |
| `/restaurant/dashboard` | Restaurant workspace and approval status. |
| `/restaurant/dashboard/menu` | Add, edit, remove, and mark menu items available/unavailable; upload menu photos. |
| `/restaurant/dashboard/settings` | Edit restaurant contact details, location, and hours. |

## Database and access controls

The migrations use RLS so users can only read/update their own profile, restaurant members can access their restaurant workspace, and only restaurant owners can change restaurant settings or menus. Restaurant email, phone, and WhatsApp details are stored separately from the public restaurant profile and are readable only by restaurant members and administrators. New restaurants start as `pending`; owners cannot change the approval status. Only approved restaurants and available menu items are returned to public visitors. Menu photos are restricted by file type and size and owner-scoped for uploads.

Restaurant registration creates a pending restaurant profile and owner membership through a database trigger. Review and approval are available only in the private admin dashboard and are not exposed to restaurant accounts. Order requests snapshot customer contact, delivery, item, and price details; only the customer and that restaurant's members can read them. The database validates menu availability and calculates prices, and status changes use restricted RPC functions.

## Current scope

Supabase configuration and all four migrations are required for account, profile, restaurant, menu, and order data. Customer signup requires deploying the `customer-signup` Edge Function and configuring its allowed origins. Password recovery uses Supabase Auth email and the reset redirect URLs must be allowlisted in Supabase Authentication settings. Apply the latest migration to save menu image URLs with order items and allow administrators to preview restaurant menus.

Restaurant approval, account onboarding, order requests, and password recovery are implemented. Customers can request items from one approved restaurant at a time; requests are not paid online or automatically confirmed. Restaurant members can update request status and contact customers directly, including by opening a prefilled WhatsApp message. Dietary and allergen fields, staff invitations and roles, delivery workflows, and automatic email and WhatsApp notifications are coming soon. Configure and apply all four database migrations before using order requests.
