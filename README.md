# QuickCrave Developer Guide

QuickCrave is a web marketplace for neighborhood restaurants. Customers can discover approved restaurants and available dishes, submit order requests, and follow their status. Restaurant owners manage their menus and incoming requests. Administrators review restaurant applications.

This guide is the working reference for setting up, changing, testing, and deploying the project. It describes the behavior implemented in the repository; features marked **Coming soon** are not implemented.

## Project at a glance

- **Frontend:** React 19, JavaScript ES modules, React Router 7, and Vite 7.
- **Backend:** Supabase Auth, Postgres, Row Level Security (RLS), Storage, and one Edge Function.
- **Hosting:** Vercel. `vercel.json` rewrites application routes to `index.html` for client-side routing.
- **Currency and locale:** Nigerian Naira (`NGN`) and `en-NG`.
- **Package manager:** npm. `package-lock.json` is checked in; use `npm ci` for a clean dependency install.
- **Tests and linting:** No test or lint scripts are currently configured. `npm run build` is the available project-level validation.

## Quick start

### Requirements

- Node.js 20.19+ or 22.12+.
- npm.
- A Supabase project for authentication and live data. The UI can render without Supabase credentials, but data-backed features will not work.

### Install and configure

```sh
npm ci
```

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable (or legacy anon) key:

```text
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

These are browser-visible client settings. **Never** put a Supabase `service_role` key, database password, or other secret in a `VITE_*` variable, frontend source file, or Git commit. `.env*` files are ignored except `.env.example`.

Apply the database migrations in the order listed in [Database migrations](#database-migrations). Then start Vite:

```sh
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Restart the dev server after changing environment variables.

### Available npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production bundle in `dist/`. |
| `npm run preview` | Serve the built bundle locally for a production-like check. |

`dist/`, `node_modules/`, `.vite/`, and local `.env` files are ignored by Git.

## Repository map

```text
.
├── src/
│   ├── App.jsx                    Public landing page, menu feed, and route table
│   ├── PortalPages.jsx            Auth screens, guards, customer/restaurant/admin dashboards
│   ├── LoadingIndicator.jsx       Shared accessible spinner/status UI
│   ├── main.jsx                   React entry point, router/auth providers, global CSS
│   └── lib/
│       ├── AuthContext.jsx         Supabase session lifecycle and auth context
│       └── supabase.js             Supabase client configuration
├── supabase/
│   ├── functions/customer-signup/ Supabase Edge Function for customer signup
│   └── migrations/                Ordered SQL schema, policy, and function changes
├── styles.css                     Public-site styles
├── src/portal.css                 Account and dashboard styles
├── index.html                     Vite HTML entry
├── vite.config.js                 React plugin and production chunk configuration
└── vercel.json                    SPA route rewrite
```

The app is wrapped in `BrowserRouter` and `AuthProvider` in `src/main.jsx`. `src/lib/supabase.js` creates one Supabase client when both required environment variables are present, enabling persisted sessions, token refresh, and auth callback detection. `AuthProvider` exposes the current user/session, loading and configuration state, auth errors, and the client through `useAuth()`.

`src/App.jsx` owns the public landing page and its available-dish feed. `src/PortalPages.jsx` owns authentication, protected routes, and the three role-specific workspaces. Reusable account and dashboard components are in that file today; look for existing helpers and patterns there before introducing another abstraction or duplicating data-loading logic.

The public website imports `styles.css`; account and dashboard styles are imported from `src/portal.css` in `src/main.jsx`. Use the shared `LoadingIndicator` for waits and preserve accessible status/error messaging when adding asynchronous interactions.

## Routes and roles

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page and available dishes from approved restaurants. |
| `/account` | Public | Choose customer or restaurant account access. |
| `/customer/login`, `/customer/signup` | Public | Customer authentication and signup. |
| `/customer/forgot-password`, `/customer/reset-password` | Public/Auth | Request a reset email and set a new password. |
| `/restaurant/login`, `/restaurant/signup` | Public | Restaurant owner authentication and registration. |
| `/restaurant/forgot-password`, `/restaurant/reset-password` | Public/Auth | Restaurant password recovery. |
| `/admin/login` | Public/Auth | Administrator sign-in; there is no public admin signup. |
| `/admin/forgot-password`, `/admin/reset-password` | Public/Auth | Administrator password recovery. |
| `/admin/dashboard` | Admin | Review, approve, reject, or suspend restaurants. |
| `/customer/dashboard` | Customer | Discover restaurants, browse homepage-style dish cards, and create an order request. |
| `/customer/dashboard/orders` | Customer | Review order history and its request-status timeline; cancel a still-submitted request. |
| `/customer/dashboard/favorites` | Customer | Favorites destination; the dashboard currently shows a placeholder. |
| `/customer/dashboard/profile` | Customer | Update contact details and account credentials. |
| `/restaurant/dashboard` | Restaurant member | Workspace overview and requests requiring attention. |
| `/restaurant/dashboard/orders` | Restaurant member | View requests and progress them through allowed statuses. |
| `/restaurant/dashboard/menu` | Restaurant member | View the menu in the shared dish-card layout; owners can add, edit, remove, and set availability. |
| `/restaurant/dashboard/settings` | Restaurant member | View restaurant details; owners can update public and contact details. |

`ProtectedRoute` checks Supabase-backed membership or profile/admin records before rendering a dashboard. A hidden link or client-side route is not an authorization boundary: database RLS and server-side checks must enforce access.

## Supabase setup

### Database migrations

Run each SQL file once in this order using the Supabase SQL Editor (or a linked Supabase CLI workflow if one is configured for the environment):

1. [`20261102090000_initial_marketplace.sql`](./supabase/migrations/20261102090000_initial_marketplace.sql) — profiles, restaurants, contacts, membership, menu items, RLS, triggers, and the public `menu-images` Storage bucket and policies.
2. [`20261103000000_admin_dashboard_and_signup_controls.sql`](./supabase/migrations/20261103000000_admin_dashboard_and_signup_controls.sql) — private administrator access, restaurant approval policies, new-user handling, and the customer-signup rate limiter.
3. [`20261103010000_order_requests.sql`](./supabase/migrations/20261103010000_order_requests.sql) — order requests/items, participant read policies, and restricted create/update/cancel RPC functions.
4. [`20261104120000_order_item_images_and_admin_menu_preview.sql`](./supabase/migrations/20261104120000_order_item_images_and_admin_menu_preview.sql) — order-item image URL snapshots, existing-order backfill, snapshot trigger, and admin menu read policy.

The final migration is required for the `order_request_items.image_url` column and to save menu image URLs with new order items. If the restaurant order screen reports `column order_request_items.image_url does not exist`, the deployed Supabase database is missing that migration. Apply it in the SQL Editor, then reload the application. The frontend has a compatibility fallback that can display current menu photos where possible, but it cannot preserve historical photo URLs until the migration is applied.

After applying migrations, verify that each SQL operation completed successfully before testing the related feature. Keep migrations additive and safe to apply to an existing database; do not edit an already-applied migration to change production schema. Add a new migration for future schema changes and update this guide's migration list.

### Data model

| Table | Responsibility |
| --- | --- |
| `profiles` | Account type and customer name, phone, and delivery address. |
| `restaurants` | Public profile, owner, location/hours, and moderation status (`pending`, `approved`, `rejected`, `suspended`). |
| `restaurant_contacts` | Restaurant email, phone, and WhatsApp contact details. |
| `restaurant_members` | User-to-restaurant membership and `owner`/`staff` role. Staff invitations and team management are not implemented. |
| `menu_items` | Dish name, description, category, price, availability, restaurant, and public image URL. |
| `admin_users` | Private allowlist of administrator user IDs. |
| `customer_signup_rate_limits` | Server-side rate-limit counters used by the signup function. |
| `order_requests` | Customer/restaurant relationship, copied customer details, subtotal, timestamps, and current status. |
| `order_request_items` | Copied dish name and price, quantity, and generated line total; image URL snapshot is added by migration 4. |

Order totals and allowed status transitions are validated in Postgres RPC functions, not trusted from the browser. Order status flow is `submitted` → `accepted` → `preparing` → `ready` → `completed`; a restaurant can reject a submitted request, and the customer can cancel a submitted request.

### Row Level Security and trust boundaries

- Public visitors can read approved restaurant profiles and available dishes for approved restaurants.
- Restaurant members can access their restaurant workspace; owner-only database policies protect menu and settings mutations.
- Customers can read their own profile and orders. A restaurant's members can read that restaurant's orders.
- Restaurant contact information is not part of the public profile.
- Admin access is determined by the private `admin_users` table and `is_admin()` database function. Do not grant admin access from browser code.
- The `menu-images` bucket is public for image delivery. Upload, update, and delete policies require an authenticated restaurant owner and a restaurant-scoped storage path.
- The public Supabase key is expected in the frontend; RLS is mandatory. Never weaken policies to make a frontend query work.

When adding or changing data operations, update the applicable migration, check both authenticated and anonymous behavior, and use the minimum required grants/policies. Treat client-side form validation as UX only; validate important input and permissions in the database or trusted server function as well.

## Images and menu photos

Image binaries are stored in the public Supabase Storage bucket `menu-images`; Postgres stores their public URL. The restaurant menu form accepts JPEG, PNG, or WebP up to 5 MB. New object paths are scoped under the restaurant UUID. Menu items hold their current `image_url`, and migration 4 copies that URL to an order item when an order is created so history can retain the original photo URL.

Photo troubleshooting:

1. Confirm migration 1 created the `menu-images` bucket and its policies.
2. In the restaurant dashboard, edit the existing dish, choose a photo, and save it. A menu item without a photo will correctly show a placeholder.
3. Confirm the menu item's `image_url` is populated and the corresponding public Storage URL loads.
4. If order history shows an `image_url` column error, apply migration 4. The fallback can use the current `menu_items.image_url`, but historical snapshots require the migration.
5. If uploads fail, check the signed-in user is the restaurant owner, the object path starts with the restaurant UUID, and file type/size are allowed.

Do not store image file bytes in Postgres or put private access tokens in image URLs.

## Authentication and account provisioning

### Supabase Auth settings

In Supabase **Authentication → URL Configuration**:

- Set the Site URL to the deployed Vercel URL.
- Add the customer and restaurant login URLs (the email-confirmation callbacks) and the customer, restaurant, and admin reset-password URLs to Redirect URLs. Also add their corresponding local URLs (normally `http://localhost:5173/customer/login`, `http://localhost:5173/restaurant/login`, and `http://localhost:5173/<audience>/reset-password`) when testing locally.
- Keep email confirmation enabled for both customer and restaurant signup. Password reset uses Supabase Auth email delivery; the built-in provider may have delivery limits, and production-scale sending can require custom SMTP.

### Customer signup Edge Function

Customer signup calls `customer-signup`; the function validates the request and allowed origin, rate-limits attempts through a database RPC, and uses Supabase Auth to send an email confirmation before the customer can sign in. Restaurant signup uses Supabase Auth and a database trigger to create its pending restaurant workspace.

Deploy with the Supabase CLI:

```sh
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy customer-signup --no-verify-jwt
```

In **Supabase → Edge Functions → Secrets**, configure `APP_ALLOWED_ORIGINS` as a comma-separated list of exact origins, without paths, for example:

```text
https://your-production-domain.vercel.app,http://localhost:5173
```

Include each Vercel preview/custom origin that should be allowed. The function uses Supabase's `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment values for Auth, plus the server-side `SUPABASE_SERVICE_ROLE_KEY` for signup rate limiting. Never copy the service-role key into this repository or Vercel frontend environment variables. Redeploy the function after changing its code.

### Provisioning an administrator

There is no public admin signup. Create and confirm a normal account for the person who will administer the marketplace. After migrations 1 and 2 have been applied, run this statement in the Supabase SQL Editor, replacing the email:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing
returning user_id;
```

Verify that it returns the intended user ID. To revoke access, delete that user's row from `public.admin_users` using a trusted administrative database session.

## Main user workflows

### Restaurant onboarding and menu

1. A restaurant owner signs up and confirms their email.
2. The database creates their profile, pending restaurant, contacts, and owner membership.
3. An administrator reviews and approves the restaurant.
4. The owner maintains menu items and uploads photos from the restaurant dashboard.
5. Only available menu items from approved restaurants are public.

### Customer order request

1. A customer selects dishes from one restaurant and submits their contact/delivery details.
2. The `create_order_request` RPC verifies the customer, restaurant status, selected available dishes, quantities, and prices, then creates the request and item snapshots.
3. Restaurant members move a request through permitted statuses with `update_order_request_status`.
4. The customer may cancel only while the request is still submitted using `cancel_order_request`.
5. The request is not an online payment or confirmed delivery. The restaurant contacts the customer directly to confirm availability, payment, and delivery.

The customer and restaurant dashboards display menu items using the same image-forward dish-card layout as the public homepage. Customer order history shows each request's progress as a vertical status list. Dashboard users can switch between light and dark themes from the sidebar.

### Favorites

Public landing-page favorites are persisted in browser `localStorage` under `quickcrave:favorites`. This is device/browser-local, not a server-side user preference. The customer dashboard Favorites destination is currently a placeholder.

## Deployment

### Vercel frontend

1. Connect the Git repository to Vercel and use the detected Vite build settings (`npm run build`, output directory `dist`).
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment variables for the required deployment environments.
3. Deploy. `vercel.json` rewrites app routes to `index.html`, so direct navigation to dashboard and password routes reaches the React Router app.
4. Add the deployed URL to Supabase Auth Redirect URLs and the customer-signup function's `APP_ALLOWED_ORIGINS`.
5. Apply database migrations and deploy the Edge Function separately; deploying the frontend does not update Supabase.

Keep Supabase schema/function changes and frontend releases coordinated. A frontend query that selects a new column will fail until the database migration has been applied.

## Day-to-day development

- Keep changes focused and follow existing JSX, JavaScript, and CSS conventions.
- Keep asynchronous UI states visible, provide actionable errors, and reset busy states in `finally`.
- Use semantic controls and status/error roles; respect reduced-motion preferences for animations.
- Preserve `LoadingIndicator` and existing skeleton patterns for data waits.
- Avoid adding dependencies unless existing APIs cannot meet the need; update `package.json` and `package-lock.json` together.
- For database behavior, make a new migration and document required deployment order. Do not rely on manual schema edits that are absent from migrations.
- Do not commit `.env.local`, credentials, generated `dist/`, or unrelated editor settings.

### Before opening a change

Run:

```sh
npm run build
git diff --check
git status --short
```

There is currently no automated unit, integration, or browser-test command in `package.json`. For user-facing changes, also manually verify the affected route and role with a Supabase project that has all migrations applied. For database changes, test relevant RLS access with the intended user roles and an anonymous visitor.

## Troubleshooting

| Symptom | Likely cause and next step |
| --- | --- |
| Dashboard says Supabase is not configured | Check both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart Vite or redeploy Vercel. |
| `column order_request_items.image_url does not exist` | Apply migration 4 in Supabase; refresh the dashboard. |
| Customer signup is unavailable or returns origin errors | Verify the Edge Function is deployed, its server secrets exist, and `APP_ALLOWED_ORIGINS` exactly matches the request's scheme/host/port. |
| Restaurant account cannot open its dashboard | Confirm email, successful restaurant registration, `restaurant_members` row, correct Supabase project, and applied migrations. |
| Admin cannot open review dashboard | Confirm the account exists and the correct `user_id` is present in `admin_users`; apply migration 2. |
| Restaurant does not appear publicly | It must be `approved`, and its menu item must be available. Check the `restaurants`/`menu_items` rows and RLS policies. |
| Dish image is missing | Check the `menu_items.image_url`, Storage object, public URL, bucket, and image policies. Upload or replace it from the owner dashboard if needed. |
| Browser refresh on a nested URL returns a 404 | Confirm the Vercel deployment includes `vercel.json` SPA rewrite. |
| Password reset link returns to the wrong host or fails | Add the full reset URL to Supabase Auth Redirect URLs and verify Site URL and deployment environment. |
| Order submission fails although the UI form is valid | Read the database RPC error. Check customer profile name/address/phone, restaurant approval, item availability, quantity limits, and migration state. |

Do not suppress Supabase errors to make a screen appear successful. Fix the underlying schema, authorization, configuration, or data issue and retain clear user-facing error feedback.

## Current product scope

Implemented: customer and restaurant authentication, password recovery, restaurant review, menu management and photos, restaurant/customer dashboards, order requests and status tracking, and direct WhatsApp contact links for restaurant staff.

Coming soon: dietary/allergen information, staff invitations and team-role management, delivery workflows, automated email notifications, and automated WhatsApp notifications. Automated email needs a verified sending domain/provider; WhatsApp automation needs a supported messaging integration.
