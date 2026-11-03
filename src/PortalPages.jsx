import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext.jsx";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function getWhatsAppNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.startsWith("234")) return digits;
  return digits;
}

function PortalBrand() {
  return (
    <Link className="portal-brand" to="/" aria-label="QuickCrave home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path
            d="M21.5 4.5c1.8 7.1-3.1 8.3-3.1 13.1 0 2.2 1.1 3.6 2.8 4.5-.2-3.1 1.5-5.3 4.7-7.5 3.5 3.4 5.4 7.1 5.4 11.1 0 6-4.8 10-11.2 10S8.9 31.7 8.9 25.8c0-4.9 3.1-8.5 7.8-12.1-.7 5.2 1.7 6.7 3.5 7.1-1.6-5.6 4.1-8.8 1.3-16.3Z"
            fill="currentColor"
          />
          <path
            d="M20.1 29.7c1.8-2.1 1.8-4 1.6-5.3 2.8 1.8 4.1 3.8 4.1 6 0 2.6-2 4.3-4.7 4.3s-4.7-1.7-4.7-4.1c0-1.5.8-2.8 2.2-4 .1 1.5.5 2.4 1.5 3.1Z"
            fill="#FFF9F2"
          />
        </svg>
      </span>
      <span className="brand-name">Quick<span>Crave</span></span>
    </Link>
  );
}

function HomeLink({ label }) {
  return (
    <Link className="portal-home-link" to="/" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function PortalFrame({ children, audience = "customer" }) {
  const { user, supabase } = useAuth();
  const [signOutError, setSignOutError] = useState("");
  const isRestaurant = audience === "restaurant";
  const links = isRestaurant
    ? [
        ["/restaurant/dashboard", "Overview"],
        ["/restaurant/dashboard/orders", "Orders"],
        ["/restaurant/dashboard/menu", "Menu"],
        ["/restaurant/dashboard/settings", "Settings"],
      ]
    : audience === "admin"
      ? [["/admin/dashboard", "Restaurant review"]]
    : [
        ["/customer/dashboard", "Discover"],
        ["/customer/dashboard/orders", "Your orders"],
        ["/customer/dashboard/favorites", "Favorites"],
        ["/customer/dashboard/profile", "Profile"],
      ];

  return (
    <div className="portal-page" data-audience={audience}>
      <header className="portal-topbar">
        <PortalBrand />
        <div className="portal-topbar-right">
          <span className="portal-account-label">{isRestaurant ? "Restaurant workspace" : audience === "admin" ? "Administrator" : "Customer account"}</span>
          <span className="portal-user-email">{user?.email}</span>
          <button
            className="portal-signout"
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) setSignOutError(error.message);
            }}
          >
            Sign out
          </button>
          <HomeLink label="Visit homepage" />
        </div>
      </header>
      <div className="portal-layout">
        <aside className="portal-sidebar">
          <div className="portal-sidebar-heading">
            <span className="portal-avatar">{isRestaurant ? "R" : "Q"}</span>
            <div>
              <strong>{isRestaurant ? "Restaurant workspace" : audience === "admin" ? "QuickCrave admin" : "Customer workspace"}</strong>
              <span>{isRestaurant ? "Manage your business" : audience === "admin" ? "Manage the marketplace" : "Find your next favorite"}</span>
            </div>
          </div>
          <nav aria-label={`${audience} dashboard`}>
            <span className="portal-nav-caption">WORKSPACE</span>
            {links.map(([to, label]) => (
              <NavLink
                end={to.endsWith("/dashboard")}
                key={to}
                to={to}
                className={({ isActive }) => `portal-nav-link${isActive ? " is-active" : ""}`}
              >
                <span aria-hidden="true">{navIcon(label)}</span>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="portal-sidebar-footer">
            <span className="portal-footer-mark" aria-hidden="true">✦</span>
            <p>Good food starts close to home.</p>
            <Link to="/">Explore QuickCrave</Link>
          </div>
        </aside>
        <main className="portal-main">
          {signOutError && <p className="auth-error" role="alert">{signOutError}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}

function navIcon(label) {
  const icons = {
    "Restaurant review": "✓",
    Overview: "⌂",
    Orders: "▤",
    Menu: "☷",
    Settings: "⚙",
    Discover: "⌕",
    "Your orders": "▤",
    Favorites: "♡",
    Profile: "○",
  };
  return icons[label] ?? "•";
}

function ServiceStatus({ children = "Backend service is not configured. Changes cannot be saved yet." }) {
  return (
    <div className="service-status" role="status">
      <span aria-hidden="true">i</span>
      {children}
    </div>
  );
}

export function ProtectedRoute({ audience, children }) {
  const { configured, loading, user, supabase } = useAuth();
  const [access, setAccess] = useState({ checking: true, allowed: false, error: "" });

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      if (!configured || loading) return;
      if (!user) {
        setAccess({ checking: false, allowed: false, error: "" });
        return;
      }

      const request =
        audience === "restaurant"
          ? supabase
              .from("restaurant_members")
              .select("restaurant_id")
              .eq("user_id", user.id)
              .limit(1)
              .maybeSingle()
          : audience === "admin"
            ? supabase
                .from("admin_users")
                .select("user_id")
                .eq("user_id", user.id)
                .maybeSingle()
          : supabase
              .from("profiles")
              .select("account_type")
              .eq("id", user.id)
              .maybeSingle();
      const { data, error } = await request;
      if (!active) return;
      setAccess({
        checking: false,
        allowed:
          !error &&
          (audience === "restaurant"
            ? Boolean(data?.restaurant_id)
            : audience === "admin"
              ? Boolean(data?.user_id)
              : data?.account_type === "customer"),
        error: error?.message ?? "",
      });
    }

    checkAccess();
    return () => {
      active = false;
    };
  }, [audience, configured, loading, supabase, user]);

  if (!configured) {
    return (
      <main className="auth-page">
        <div className="auth-topbar"><PortalBrand /><HomeLink label="Homepage" /></div>
        <div className="backend-setup-message">
          <h1>Account services need setup</h1>
          <p>Configure the Supabase project URL and publishable key, then apply the database migration before using account pages.</p>
        </div>
      </main>
    );
  }
  if (loading || access.checking) return <div className="route-loading" role="status">Checking your account…</div>;
  if (!user) {
    return <Navigate to={`/${audience}/login`} replace state={{ from: window.location.pathname }} />;
  }
  if (access.error || !access.allowed) {
    return (
      <main className="auth-page">
        <div className="auth-topbar"><PortalBrand /><HomeLink label="Homepage" /></div>
        <div className="backend-setup-message">
          <h1>This account can’t open this workspace</h1>
          <p>{access.error || `This signed-in account does not have ${audience} access.`}</p>
          <Link className="hero-primary-button" to="/account">Choose account type <span aria-hidden="true">→</span></Link>
        </div>
      </main>
    );
  }
  return children;
}

export function AuthPage({ audience, mode }) {
  const isRestaurant = audience === "restaurant";
  const isAdmin = audience === "admin";
  const isSignup = mode === "signup";
  const { configured, supabase } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setNotice("");
    setErrorMessage("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (isSignup) {
        const fullName = String(formData.get("name") ?? "").trim();
        const phone = String(formData.get("phone") ?? "").trim();
        if (!isRestaurant) {
          const { error: signupError } = await supabase.functions.invoke("customer-signup", {
            body: { email, password, fullName, phone },
          });
          if (signupError) {
            let message = signupError.message;
            if (signupError.context instanceof Response) {
              const details = await signupError.context.json();
              if (details && typeof details.error === "string") message = details.error;
            }
            throw new Error(message);
          }
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          navigate("/customer/dashboard", { replace: true });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${audience}/login`,
            data: {
              account_type: audience,
              full_name: fullName,
              phone,
              restaurant_name: fullName,
              restaurant_location: String(formData.get("restaurant_location") ?? "").trim(),
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          navigate(isAdmin ? "/admin/dashboard" : `/${audience}/dashboard`, { replace: true });
        } else {
          setNotice("Check your email to confirm the account, then sign in to continue.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (isAdmin) {
          const { data: adminMembership, error: adminError } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();
          if (adminError) throw adminError;
          if (!adminMembership) {
            await supabase.auth.signOut();
            throw new Error("This account does not have QuickCrave administrator access.");
          }
        } else {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("account_type")
            .eq("id", data.user.id)
            .maybeSingle();
          if (profileError) throw profileError;
          if (profile?.account_type !== audience) {
            await supabase.auth.signOut();
            throw new Error(
              `This is not a ${isRestaurant ? "restaurant" : "customer"} account. Choose the correct sign-in page.`,
            );
          }
        }

        if (isRestaurant) {
          const { data: membership, error: membershipError } = await supabase
            .from("restaurant_members")
            .select("restaurant_id")
            .eq("user_id", data.user.id)
            .limit(1)
            .maybeSingle();
          if (membershipError) throw membershipError;
          if (!membership) {
            await supabase.auth.signOut();
            throw new Error("No restaurant workspace is linked to this account.");
          }
        }
        navigate(`/${audience}/dashboard`, { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || "We couldn’t complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <PortalBrand />
        <HomeLink label="Back to homepage" />
      </header>
      <div className="auth-layout">
        <section className="auth-story">
          <span className="auth-eyebrow">{isRestaurant ? "FOR RESTAURANTS" : isAdmin ? "QUICKCRAVE ADMIN" : "FOR FOOD LOVERS"}</span>
          <h1>{isRestaurant ? "Your kitchen’s next chapter starts here." : isAdmin ? "Marketplace administration." : "Good food is closer than you think."}</h1>
          <p>
            {isRestaurant
              ? "Build your restaurant presence, keep your menu current, and stay close to every order."
              : isAdmin
                ? "Review restaurant registrations and keep the QuickCrave marketplace trustworthy."
                : "Discover neighborhood kitchens, keep your favorites close, and make ordering feel easy."}
          </p>
          <div className="auth-story-note">
            <span aria-hidden="true">✦</span>
            <span>{isRestaurant ? "One workspace for your menu and team." : "A little local flavor goes a long way."}</span>
          </div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <p className="section-eyebrow">{isSignup ? "GET STARTED" : "WELCOME BACK"}</p>
            <h2 id="auth-title">
              {isSignup ? "Create your account" : "Sign in"}
            </h2>
            <p>{isRestaurant ? "Restaurant account" : isAdmin ? "Administrator access" : "Customer account"}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <label htmlFor="account-name">{isRestaurant ? "Restaurant name" : "Your name"}</label>
                <input
                  id="account-name"
                  name="name"
                  autoComplete={isRestaurant ? "organization" : "name"}
                  required
                />
              </>
            )}
            {isRestaurant && isSignup && (
              <>
                <label htmlFor="restaurant-phone">Restaurant phone</label>
                <input
                  id="restaurant-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                />
                <label htmlFor="restaurant-location">Neighborhood or city</label>
                <input
                  id="restaurant-location"
                  name="restaurant_location"
                  autoComplete="address-level2"
                  maxLength={120}
                  required
                />
              </>
            )}
            <label htmlFor="account-email">Email address</label>
            <input id="account-email" name="email" type="email" autoComplete="email" required />
            <label htmlFor="account-password">Password</label>
            <input
              id="account-password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
            {isRestaurant && isSignup && (
              <label className="auth-checkbox">
                <input type="checkbox" required />
                <span>I’m authorized to create an account for this restaurant.</span>
              </label>
            )}
            <button className="hero-primary-button auth-submit" type="submit" disabled={!configured || busy}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"} <span aria-hidden="true">→</span>
            </button>
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
            {!configured && <p className="auth-availability">Account access isn’t configured yet. Add the Supabase environment variables to enable this form.</p>}
          </form>
          {!isAdmin && (
            <p className="auth-switch">
              {isSignup ? "Already have an account?" : "New to QuickCrave?"}{" "}
              <Link to={`/${audience}/${isSignup ? "login" : "signup"}`}>
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          )}
          {isRestaurant && (
            <p className="auth-switch customer-switch">
              Looking for a meal? <Link to="/customer/login">Customer sign in</Link>
            </p>
          )}
        </section>
      </div>
      <p className="auth-footnote">
        Review QuickCrave’s privacy information before using an account.
      </p>
    </main>
  );
}

function DashboardHeader({ eyebrow, title, description, action }) {
  return (
    <div className="dashboard-heading">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function CustomerDashboard({ section = "discover" }) {
  const { supabase, user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [menuOffers, setMenuOffers] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(section === "discover");
  const [restaurantsError, setRestaurantsError] = useState("");
  const [orderCart, setOrderCart] = useState([]);
  const [cartRestaurantId, setCartRestaurantId] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(section === "orders");
  const [ordersError, setOrdersError] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [submittedLocation, setSubmittedLocation] = useState("");
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    delivery_address: "",
  });
  const [accountEmail, setAccountEmail] = useState(user.email ?? "");
  const [profileLoading, setProfileLoading] = useState(section === "profile");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailError, setEmailError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const sections = {
    discover: ["DISCOVER", "A taste of your neighborhood", "Find local kitchens and dishes worth coming back for."],
    orders: ["YOUR ORDERS", "Order history", "Keep track of your requests and order updates."],
    favorites: ["SAVED FOR LATER", "Your favorites", "The restaurants and dishes you want to remember."],
    profile: ["YOUR ACCOUNT", "Profile & preferences", "Keep your contact and delivery details up to date."],
  };
  const activeSection = sections[section] ? section : "discover";
  const title = sections[activeSection];

  useEffect(() => {
    let active = true;
    if (activeSection !== "discover") return undefined;

    async function loadRestaurants() {
      setRestaurantsLoading(true);
      setRestaurantsError("");
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, location, opening_hours")
        .eq("status", "approved")
        .order("name");
      if (!active) return;
      if (error) {
        setRestaurantsError(error.message);
      } else {
        setRestaurants(data ?? []);
        const { data: availableItems, error: menuError } = await supabase
          .from("menu_items")
          .select("id, name, description, category, price, restaurants!inner(id, name, location)")
          .eq("is_available", true)
          .eq("restaurants.status", "approved")
          .order("name");
        if (!active) return;
        if (menuError) {
          setRestaurantsError(menuError.message);
        } else {
          setMenuOffers(availableItems ?? []);
        }
      }
      setRestaurantsLoading(false);
    }

    loadRestaurants();
    return () => {
      active = false;
    };
  }, [activeSection, supabase]);

  useEffect(() => {
    let active = true;
    if (activeSection !== "profile" && activeSection !== "discover") return undefined;

    async function loadProfile() {
      if (activeSection === "profile") setProfileLoading(true);
      setProfileError("");
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, delivery_address")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setProfileError(error.message);
      } else if (data) {
        setProfile(data);
      }
      if (activeSection === "profile") setProfileLoading(false);
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [activeSection, supabase, user.id]);

  useEffect(() => {
    let active = true;
    if (activeSection !== "orders") return undefined;

    async function loadCustomerOrders() {
      setOrdersLoading(true);
      setOrdersError("");
      const { data: orders, error } = await supabase
        .from("order_requests")
        .select("id, restaurant_id, status, customer_name, customer_phone, delivery_address, customer_note, subtotal, created_at, restaurants(name)")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setOrdersError(error.message);
        setOrdersLoading(false);
        return;
      }

      const ids = (orders ?? []).map((order) => order.id);
      if (ids.length) {
        const { data: items, error: itemsError } = await supabase
          .from("order_request_items")
          .select("id, order_request_id, item_name, unit_price, quantity, line_total")
          .in("order_request_id", ids);
        if (!active) return;
        if (itemsError) {
          setOrdersError(itemsError.message);
          setOrdersLoading(false);
          return;
        }
        const itemsByOrder = new Map();
        for (const item of items ?? []) {
          const current = itemsByOrder.get(item.order_request_id) ?? [];
          current.push(item);
          itemsByOrder.set(item.order_request_id, current);
        }
        setCustomerOrders((orders ?? []).map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        })));
      } else {
        setCustomerOrders([]);
      }
      setOrdersLoading(false);
    }

    loadCustomerOrders();
    return () => {
      active = false;
    };
  }, [activeSection, supabase]);

  async function saveCustomerProfile(event) {
    event.preventDefault();
    setProfileStatus("");
    setProfileError("");
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user.id);
    if (error) {
      setProfileError(error.message);
      return;
    }
    setProfileStatus("Your contact details have been saved.");
  }

  async function updateAccountEmail(event) {
    event.preventDefault();
    setEmailStatus("");
    setEmailError("");
    const { error } = await supabase.auth.updateUser({ email: accountEmail.trim() });
    if (error) {
      setEmailError(error.message);
      return;
    }
    setEmailStatus("Confirm the email change using the link sent to your new address.");
  }

  async function updateAccountPassword(event) {
    event.preventDefault();
    setPasswordStatus("");
    setPasswordError("");
    if (newPassword !== passwordConfirmation) {
      setPasswordError("The password entries don’t match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordStatus("Your password has been updated.");
    setNewPassword("");
    setPasswordConfirmation("");
  }

  function addToOrder(item, restaurantId) {
    setOrderError("");
    setOrderStatus("");
    if (cartRestaurantId && cartRestaurantId !== restaurantId) {
      setOrderError("Order requests can include dishes from one restaurant at a time. Clear your current request to choose another restaurant.");
      return;
    }
    setCartRestaurantId(restaurantId);
    setOrderCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: Math.min(entry.quantity + 1, 20) } : entry,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  }

  function changeOrderQuantity(itemId, difference) {
    const selectedItem = orderCart.find((item) => item.id === itemId);
    if (selectedItem && selectedItem.quantity + difference <= 0 && orderCart.length === 1) {
      setCartRestaurantId("");
    }
    setOrderCart((current) => current
      .map((item) => item.id === itemId
        ? { ...item, quantity: item.quantity + difference }
        : item)
      .filter((item) => item.quantity > 0));
    setOrderError("");
  }

  function clearOrderCart() {
    setOrderCart([]);
    setCartRestaurantId("");
    setOrderError("");
    setOrderStatus("");
  }

  async function submitOrderRequest(event) {
    event.preventDefault();
    setOrderError("");
    setOrderStatus("");
    if (!orderCart.length || !cartRestaurantId) {
      setOrderError("Add at least one dish to your order request.");
      return;
    }
    setOrderSubmitting(true);
    const { data, error } = await supabase.rpc("create_order_request", {
      target_restaurant_id: cartRestaurantId,
      requested_items: orderCart.map((item) => ({ id: item.id, quantity: item.quantity })),
      delivery_address: profile.delivery_address,
      customer_phone: profile.phone,
      customer_note: orderNote,
    });
    setOrderSubmitting(false);
    if (error) {
      setOrderError(error.message);
      return;
    }
    clearOrderCart();
    setOrderNote("");
    setOrderStatus(`Order request ${String(data).slice(0, 8).toUpperCase()} was sent to the restaurant. They’ll contact you to confirm availability, payment, and delivery.`);
  }

  async function cancelCustomerOrder(orderId) {
    setOrdersError("");
    const { error } = await supabase.rpc("cancel_order_request", {
      target_order_id: orderId,
    });
    if (error) {
      setOrdersError(error.message);
      return;
    }
    setCustomerOrders((current) => current.map((order) =>
      order.id === orderId ? { ...order, status: "cancelled" } : order,
    ));
  }

  const visibleRestaurants = restaurants.filter((restaurant) => {
    if (!submittedLocation) return true;
    return restaurant.location
      .toLocaleLowerCase()
      .includes(submittedLocation.toLocaleLowerCase());
  });

  return (
    <PortalFrame>
      <DashboardHeader eyebrow={title[0]} title={title[1]} description={title[2]} />
      {activeSection === "discover" && (
        <>
          <section className="customer-welcome-panel">
            <div>
              <span className="portal-panel-kicker">MADE FOR YOUR NEIGHBORHOOD</span>
              <h2>Find something delicious nearby.</h2>
              <p>Local restaurants and their menus will show up here when they join QuickCrave.</p>
              <label className="location-search">
                <span aria-hidden="true">⌖</span>
                <input
                  aria-label="Your neighborhood or postcode"
                  placeholder="Filter by neighborhood or city"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                />
                <button type="button" onClick={() => setSubmittedLocation(locationQuery.trim())}>Find food</button>
              </label>
            </div>
            <span className="welcome-illustration" aria-hidden="true">✦</span>
          </section>
          <div className="dashboard-section-heading">
            <div><h2>Explore local favorites</h2><p>Restaurants serving your area will appear in this feed.</p></div>
            <span className="feed-filter">Near you <span aria-hidden="true">⌄</span></span>
          </div>
          {restaurantsLoading ? (
            <EmptyState icon="◷" title="Finding restaurants" text="Loading restaurants serving your area." />
          ) : restaurantsError ? (
            <p className="auth-error" role="alert">Couldn’t load restaurants: {restaurantsError}</p>
          ) : visibleRestaurants.length === 0 ? (
            <EmptyState
              icon="⌕"
              title={restaurants.length === 0 ? "No restaurants are listed yet" : "No restaurants found in that area"}
              text={restaurants.length === 0 ? "Check back as neighborhood restaurants join QuickCrave." : "Try another neighborhood or clear your search."}
            />
          ) : (
            <div className="restaurant-feed-grid">
              {visibleRestaurants.map((restaurant) => (
                <article className="restaurant-feed-card" key={restaurant.id}>
                  <span className="restaurant-feed-art" aria-hidden="true">✦</span>
                  <div>
                    <h3>{restaurant.name}</h3>
                    <p>{restaurant.location || "Neighborhood restaurant"}</p>
                    <small>{restaurant.opening_hours || "Hours available from restaurant"}</small>
                    <ul className="restaurant-menu-preview">
                      {menuOffers
                        .filter((item) => item.restaurants.id === restaurant.id)
                        .map((item) => (
                          <li key={item.id}>
                            <span><strong>{item.name}</strong><small>{item.description || item.category}</small></span>
                            <strong>{priceFormatter.format(Number(item.price))}</strong>
                            <span className="order-item-control">
                              {orderCart.some((selected) => selected.id === item.id) ? (
                                <>
                                  <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeOrderQuantity(item.id, -1)}>−</button>
                                  <span>{orderCart.find((selected) => selected.id === item.id)?.quantity}</span>
                                  <button type="button" aria-label={`Add one ${item.name}`} disabled={orderCart.find((selected) => selected.id === item.id)?.quantity >= 20} onClick={() => addToOrder(item, restaurant.id)}>+</button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={Boolean(cartRestaurantId && cartRestaurantId !== restaurant.id)}
                                  onClick={() => addToOrder(item, restaurant.id)}
                                >
                                  Add
                                </button>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                    {menuOffers.some((item) => item.restaurants.id === restaurant.id) && (
                      <p className="feed-order-note">Prices and availability are confirmed by the restaurant after you send a request.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {orderCart.length > 0 && (
            <form className="portal-card order-request-form" onSubmit={submitOrderRequest}>
              <div className="card-title-row">
                <div>
                  <h2>Send your order request</h2>
                  <p>{orderCart[0].restaurants.name} · Payment and delivery are arranged directly with the restaurant.</p>
                </div>
                <button className="menu-cancel-button" type="button" onClick={clearOrderCart}>Clear request</button>
              </div>
              <ul className="order-cart-list">
                {orderCart.map((item) => (
                  <li key={item.id}>
                    <span>{item.quantity} × {item.name}</span>
                    <strong>{priceFormatter.format(Number(item.price) * item.quantity)}</strong>
                  </li>
                ))}
                <li className="order-cart-total">
                  <span>Estimated subtotal</span>
                  <strong>{priceFormatter.format(orderCart.reduce((total, item) => total + Number(item.price) * item.quantity, 0))}</strong>
                </li>
              </ul>
              <div className="profile-fields">
                <label>Your name<input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} autoComplete="name" required maxLength={120} /></label>
                <label>Phone number<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} autoComplete="tel" required maxLength={40} /></label>
                <label className="profile-address-field">Delivery address<input value={profile.delivery_address} onChange={(event) => setProfile({ ...profile, delivery_address: event.target.value })} autoComplete="street-address" required maxLength={500} /></label>
                <label className="profile-address-field">Note for the restaurant<textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} maxLength={1000} rows={3} placeholder="Optional delivery or meal notes" /></label>
              </div>
              {orderError && <p className="auth-error" role="alert">{orderError}</p>}
              <button className="hero-primary-button profile-save" type="submit" disabled={orderSubmitting}>
                {orderSubmitting ? "Sending request…" : "Send order request"}
                <span aria-hidden="true">→</span>
              </button>
              <p className="order-request-disclaimer">This is a request, not a confirmed order. The restaurant will contact you about availability, final cost, payment, and delivery.</p>
            </form>
          )}
          {orderStatus && <p className="profile-status" role="status">{orderStatus}</p>}
          <div className="customer-shortcuts">
            <Link to="/customer/dashboard/orders"><span>▤</span><strong>Order history</strong><small>See updates from your restaurants</small></Link>
            <Link to="/customer/dashboard/favorites"><span>♡</span><strong>Your favorites</strong><small>Keep your go-to dishes close</small></Link>
          </div>
        </>
      )}
      {activeSection === "orders" && (
        ordersLoading ? (
          <EmptyState icon="◷" title="Loading your orders" text="Fetching your submitted order requests." />
        ) : ordersError ? (
          <p className="auth-error" role="alert">{ordersError}</p>
        ) : customerOrders.length === 0 ? (
          <EmptyState icon="▤" title="No orders yet" text="Your submitted order requests and restaurant updates will appear here." />
        ) : (
          <div className="order-request-list">
            {customerOrders.map((order) => (
              <article className="portal-card order-request-card" key={order.id}>
                <div className="card-title-row">
                  <div>
                    <h2>{order.restaurants?.name || "Restaurant order"}</h2>
                    <p>Request {order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                </div>
                <ul className="order-cart-list">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.quantity} × {item.item_name}</span>
                      <strong>{priceFormatter.format(Number(item.line_total))}</strong>
                    </li>
                  ))}
                  <li className="order-cart-total"><span>Estimated subtotal</span><strong>{priceFormatter.format(Number(order.subtotal))}</strong></li>
                </ul>
                <p className="order-delivery-summary">Delivery to: {order.delivery_address} · Contact: {order.customer_phone}</p>
                {order.customer_note && <p className="order-delivery-summary">Note: {order.customer_note}</p>}
                {order.status === "submitted" && (
                  <button className="secondary-button" type="button" onClick={() => cancelCustomerOrder(order.id)}>Cancel request</button>
                )}
              </article>
            ))}
          </div>
        )
      )}
      {activeSection === "favorites" && (
        <EmptyState icon="♡" title="Your saved places will live here" text="Save a restaurant or dish from your local feed to find it quickly next time." />
      )}
      {activeSection === "profile" && (
        <>
          <form className="portal-card profile-form" onSubmit={saveCustomerProfile}>
            <div className="card-title-row"><div><h2>Your contact details</h2><p>Use details the restaurant can use to confirm an order request.</p></div></div>
            {profileLoading && <p role="status">Loading your saved details…</p>}
            {profileError && <p className="auth-error" role="alert">{profileError}</p>}
            <div className="profile-fields">
              <label>Full name<input name="full_name" autoComplete="name" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
              <label>Phone number<input name="phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
              <label className="profile-address-field">Delivery address<input name="delivery_address" autoComplete="street-address" value={profile.delivery_address} onChange={(event) => setProfile({ ...profile, delivery_address: event.target.value })} /></label>
            </div>
            <button className="hero-primary-button profile-save" type="submit" disabled={profileLoading}>Save changes <span aria-hidden="true">→</span></button>
            {profileStatus && <p className="profile-status" role="status">{profileStatus}</p>}
          </form>
          <form className="portal-card account-security-card" onSubmit={updateAccountEmail}>
            <div className="card-title-row"><div><h2>Account email</h2><p>Changing your sign-in email requires confirmation.</p></div></div>
            <div className="account-email-row">
              <label>Email address<input type="email" autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} required /></label>
              <button className="secondary-button" type="submit" disabled={accountEmail.trim() === user.email}>Update email</button>
            </div>
            {emailError && <p className="auth-error" role="alert">{emailError}</p>}
            {emailStatus && <p className="profile-status" role="status">{emailStatus}</p>}
          </form>
          <form
            className="portal-card account-security-card"
            onSubmit={updateAccountPassword}
          >
            <div className="card-title-row"><div><h2>Change password</h2><p>Choose a password with at least 8 characters.</p></div></div>
            <div className="profile-fields">
              <label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required /></label>
            </div>
            <button className="secondary-button security-save" type="submit">Update password</button>
            {passwordError && <p className="auth-error" role="alert">{passwordError}</p>}
            {passwordStatus && <p className="profile-status" role="status">{passwordStatus}</p>}
          </form>
        </>
      )}
    </PortalFrame>
  );
}

function RestaurantDashboard({ section = "overview" }) {
  const { supabase, user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantRole, setRestaurantRole] = useState("");
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [restaurantOrders, setRestaurantOrders] = useState([]);
  const [orderInboxLoading, setOrderInboxLoading] = useState(section === "orders");
  const [orderInboxError, setOrderInboxError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [menuLoading, setMenuLoading] = useState(section === "menu");
  const [menuError, setMenuError] = useState("");
  const [dishName, setDishName] = useState("");
  const [dishDescription, setDishDescription] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCategory, setDishCategory] = useState("Main");
  const [dishImage, setDishImage] = useState(null);
  const [editingItemId, setEditingItemId] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    contact_email: "",
    phone: "",
    whatsapp: "",
    location: "",
    opening_hours: "",
  });

  useEffect(() => {
    let active = true;
    async function loadRestaurant() {
      setRestaurantLoading(true);
      setRestaurantError("");
      const { data: membership, error: membershipError } = await supabase
        .from("restaurant_members")
        .select("restaurant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (membershipError) {
        setRestaurantError(membershipError.message);
        setRestaurantLoading(false);
        return;
      }
      if (!membership) {
        setRestaurantError("No restaurant workspace is linked to this account.");
        setRestaurantLoading(false);
        return;
      }
      setRestaurantRole(membership.role);
      const { data: restaurantData, error: restaurantFetchError } = await supabase
        .from("restaurants")
        .select("id, name, location, opening_hours, status")
        .eq("id", membership.restaurant_id)
        .maybeSingle();
      if (!active) return;
      if (restaurantFetchError) {
        setRestaurantError(restaurantFetchError.message);
      } else {
        setRestaurant(restaurantData);
        if (restaurantData) {
          const { data: contacts, error: contactsError } = await supabase
            .from("restaurant_contacts")
            .select("contact_email, phone, whatsapp")
            .eq("restaurant_id", restaurantData.id)
            .maybeSingle();
          if (!active) return;
          if (contactsError) {
            setRestaurantError(contactsError.message);
            setRestaurantLoading(false);
            return;
          }
          setSettingsForm({
            name: restaurantData.name ?? "",
            contact_email: contacts?.contact_email ?? "",
            phone: contacts?.phone ?? "",
            whatsapp: contacts?.whatsapp ?? "",
            location: restaurantData.location ?? "",
            opening_hours: restaurantData.opening_hours ?? "",
          });
        }
      }
      setRestaurantLoading(false);
    }

    loadRestaurant();
    return () => {
      active = false;
    };
  }, [supabase, user.id]);

  useEffect(() => {
    let active = true;
    if (section !== "menu" || !restaurant?.id) return undefined;

    async function loadMenu() {
      setMenuLoading(true);
      setMenuError("");
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, category, price, is_available")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setMenuError(error.message);
      } else {
        setMenuItems(data ?? []);
      }
      setMenuLoading(false);
    }

    loadMenu();
    return () => {
      active = false;
    };
  }, [restaurant?.id, section, supabase]);

  useEffect(() => {
    let active = true;
    if (section !== "orders" || !restaurant?.id) return undefined;

    async function loadRestaurantOrders() {
      setOrderInboxLoading(true);
      setOrderInboxError("");
      const { data: orders, error } = await supabase
        .from("order_requests")
        .select("id, customer_name, customer_email, customer_phone, delivery_address, customer_note, subtotal, status, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setOrderInboxError(error.message);
        setOrderInboxLoading(false);
        return;
      }

      const ids = (orders ?? []).map((order) => order.id);
      if (ids.length) {
        const { data: items, error: itemsError } = await supabase
          .from("order_request_items")
          .select("id, order_request_id, item_name, unit_price, quantity, line_total")
          .in("order_request_id", ids);
        if (!active) return;
        if (itemsError) {
          setOrderInboxError(itemsError.message);
          setOrderInboxLoading(false);
          return;
        }
        const itemsByOrder = new Map();
        for (const item of items ?? []) {
          const current = itemsByOrder.get(item.order_request_id) ?? [];
          current.push(item);
          itemsByOrder.set(item.order_request_id, current);
        }
        setRestaurantOrders((orders ?? []).map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        })));
      } else {
        setRestaurantOrders([]);
      }
      setOrderInboxLoading(false);
    }

    loadRestaurantOrders();
    return () => {
      active = false;
    };
  }, [restaurant?.id, section, supabase]);

  async function addMenuItem(event) {
    event.preventDefault();
    setMenuError("");
    const itemFields = {
        name: dishName.trim(),
        description: dishDescription.trim(),
        category: dishCategory,
        price: Number(dishPrice),
    };

    if (editingItemId) {
      const currentItem = menuItems.find((item) => item.id === editingItemId);
      let nextImageUrl = currentItem?.image_url ?? "";
      let nextImagePath = "";
      if (dishImage) {
        const extension = dishImage.type === "image/png" ? "png" : dishImage.type === "image/webp" ? "webp" : "jpg";
        nextImagePath = `${restaurant.id}/${editingItemId}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("menu-images")
          .upload(nextImagePath, dishImage, { contentType: dishImage.type, upsert: false });
        if (uploadError) {
          setMenuError(`Couldn’t upload the dish photo: ${uploadError.message}`);
          return;
        }
        nextImageUrl = supabase.storage.from("menu-images").getPublicUrl(nextImagePath).data.publicUrl;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .update({ ...itemFields, image_url: nextImageUrl })
        .eq("id", editingItemId)
        .select("id, name, description, category, price, is_available, image_url")
        .single();
      if (error) {
        if (nextImagePath) {
          const { error: cleanupError } = await supabase.storage.from("menu-images").remove([nextImagePath]);
          setMenuError(cleanupError
            ? `${error.message} The uploaded photo also could not be removed: ${cleanupError.message}`
            : error.message);
        } else {
          setMenuError(error.message);
        }
        return;
      }
      setMenuItems((current) => current.map((item) => item.id === data.id ? data : item));
      const previousImagePath = currentItem?.image_url?.split("/storage/v1/object/public/menu-images/")[1];
      if (dishImage && previousImagePath) {
        const { error: cleanupError } = await supabase.storage.from("menu-images").remove([previousImagePath]);
        if (cleanupError) {
          setMenuError(`Menu changes were saved, but the previous photo could not be removed: ${cleanupError.message}`);
        }
      }
      resetMenuForm();
      return;
    }

    const itemId = crypto.randomUUID();
    let imageUrl = "";
    let imagePath = "";
    if (dishImage) {
      const extension = dishImage.type === "image/png" ? "png" : dishImage.type === "image/webp" ? "webp" : "jpg";
      imagePath = `${restaurant.id}/${itemId}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(imagePath, dishImage, { contentType: dishImage.type, upsert: false });
      if (uploadError) {
        setMenuError(`Couldn’t upload the dish photo: ${uploadError.message}`);
        return;
      }
      imageUrl = supabase.storage.from("menu-images").getPublicUrl(imagePath).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .insert({ id: itemId, restaurant_id: restaurant.id, ...itemFields, image_url: imageUrl })
      .select("id, name, description, category, price, is_available, image_url")
      .single();
    if (error) {
      if (imagePath) {
        const { error: cleanupError } = await supabase.storage.from("menu-images").remove([imagePath]);
        if (cleanupError) {
          setMenuError(`${error.message} The uploaded photo also could not be removed: ${cleanupError.message}`);
          return;
        }
      }
      setMenuError(error.message);
      return;
    }
    setMenuItems((current) => [data, ...current]);
    resetMenuForm();
  }

  function resetMenuForm() {
    setDishName("");
    setDishDescription("");
    setDishPrice("");
    setDishCategory("Main");
    setDishImage(null);
    setEditingItemId("");
    const imageInput = document.querySelector("#menu-image");
    if (imageInput) imageInput.value = "";
  }

  function beginEditMenuItem(item) {
    setEditingItemId(item.id);
    setDishName(item.name);
    setDishDescription(item.description ?? "");
    setDishPrice(String(item.price));
    setDishCategory(item.category ?? "Main");
    setDishImage(null);
  }

  async function updateMenuAvailability(item) {
    setMenuError("");
    const { data, error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id)
      .select("id, name, description, category, price, is_available")
      .single();
    if (error) {
      setMenuError(error.message);
      return;
    }
    setMenuItems((current) => current.map((entry) => entry.id === item.id ? data : entry));
  }

  async function deleteMenuItem(id) {
    setMenuError("");
    const item = menuItems.find((entry) => entry.id === id);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setMenuError(error.message);
      return;
    }
    setMenuItems((current) => current.filter((entry) => entry.id !== id));
    const imagePath = item?.image_url?.split("/storage/v1/object/public/menu-images/")[1];
    if (imagePath) {
      const { error: cleanupError } = await supabase.storage.from("menu-images").remove([imagePath]);
      if (cleanupError) {
        setMenuError(`Menu item was removed, but its photo could not be deleted: ${cleanupError.message}`);
      }
    }
  }

  async function saveRestaurantSettings(event) {
    event.preventDefault();
    setSettingsStatus("");
    setSettingsError("");
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        name: settingsForm.name,
        location: settingsForm.location,
        opening_hours: settingsForm.opening_hours,
      })
      .eq("id", restaurant.id)
      .select("id, name, location, opening_hours, status")
      .single();
    if (error) {
      setSettingsError(error.message);
      return;
    }
    setRestaurant(data);
    const { error: contactError } = await supabase
      .from("restaurant_contacts")
      .update({
        contact_email: settingsForm.contact_email,
        phone: settingsForm.phone,
        whatsapp: settingsForm.whatsapp,
      })
      .eq("restaurant_id", restaurant.id)
      .select("restaurant_id")
      .single();
    if (contactError) {
      setSettingsError(`Restaurant profile was saved, but contact details were not: ${contactError.message}`);
      return;
    }
    setSettingsStatus("Restaurant details have been saved.");
  }

  async function updateRestaurantOrder(orderId, status) {
    setUpdatingOrderId(orderId);
    setOrderInboxError("");
    const { error } = await supabase.rpc("update_order_request_status", {
      target_order_id: orderId,
      next_status: status,
    });
    if (error) {
      setOrderInboxError(error.message);
    } else {
      setRestaurantOrders((current) => current.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ));
    }
    setUpdatingOrderId("");
  }

  const headers = {
    overview: ["RESTAURANT WORKSPACE", "Good morning", "Here’s what’s happening with your restaurant today."],
    orders: ["ORDER MANAGEMENT", "Incoming orders", "Review customer requests and keep your team in sync."],
    menu: ["YOUR MENU", "Menu management", "Add dishes and keep your menu ready for customers."],
    settings: ["RESTAURANT PROFILE", "Business settings", "Manage your restaurant details and operating preferences."],
  };
  const activeSection = headers[section] ? section : "overview";
  const heading = headers[activeSection];

  return (
    <PortalFrame audience="restaurant">
      {restaurantLoading && <ServiceStatus>Loading your restaurant workspace…</ServiceStatus>}
      {restaurantError && <p className="auth-error" role="alert">{restaurantError}</p>}
      <DashboardHeader
        eyebrow={heading[0]}
        title={heading[1]}
        description={heading[2]}
        action={restaurant && <span className={`status-pill status-${restaurant.status}`}>{restaurant.status === "pending" ? "Pending review" : restaurant.status}</span>}
      />
      {activeSection === "overview" && (
        <>
          <section className="restaurant-setup-panel">
            <div className="setup-icon" aria-hidden="true">R</div>
            <div><span className="portal-panel-kicker">GET YOUR RESTAURANT READY</span><h2>{restaurant?.name || "Set up your restaurant workspace"}</h2><p>{restaurant?.status === "pending" ? "Your restaurant profile is awaiting review. You can prepare the menu while it is under review." : "Complete your profile and prepare your menu for review."}</p></div>
            <Link className="text-arrow-link" to="/restaurant/dashboard/settings">Review setup <span aria-hidden="true">→</span></Link>
          </section>
          <div className="restaurant-metrics">
            <MetricCard label="New orders" value="—" detail="Orders will appear here" icon="▤" />
            <MetricCard label="Menu items" value={String(menuItems.length)} detail="Manage your menu" icon="☷" />
            <MetricCard label="Restaurant status" value={restaurant?.status ?? "—"} detail={restaurant?.location || "Complete your profile"} icon="◷" />
          </div>
          <div className="dashboard-section-heading"><div><h2>Today’s activity</h2><p>Order requests and menu updates at a glance.</p></div><Link className="text-arrow-link" to="/restaurant/dashboard/orders">View orders <span aria-hidden="true">→</span></Link></div>
          <section className="portal-card restaurant-order-callout">
            <h2>Manage customer requests</h2>
            <p>Review incoming requests in your order inbox, then contact customers to confirm payment and delivery.</p>
            <Link className="hero-primary-button" to="/restaurant/dashboard/orders">Open order inbox <span aria-hidden="true">→</span></Link>
          </section>
        </>
      )}
      {activeSection === "orders" && (
        <section className="portal-card">
          <div className="card-title-row"><div><h2>Order inbox</h2><p>Requests submitted by customers. Confirm final price, payment, and delivery directly.</p></div><span className={`status-pill status-${restaurant?.status}`}>{restaurant?.status === "approved" ? "Accepting requests" : "Not public"}</span></div>
          {orderInboxError && <p className="auth-error" role="alert">{orderInboxError}</p>}
          {restaurant?.status !== "approved" ? (
            <EmptyState icon="◷" title="Your restaurant is not approved yet" text="You can review existing requests, but customers can only submit orders to approved restaurants." />
          ) : orderInboxLoading ? (
            <EmptyState icon="◷" title="Loading requests" text="Checking for customer orders." />
          ) : restaurantOrders.length === 0 ? (
            <EmptyState icon="▤" title="No order requests yet" text="Customer requests will show up here." />
          ) : (
            <div className="order-request-list">
              {restaurantOrders.map((order) => {
                const nextStatus = {
                  submitted: ["accepted", "rejected"],
                  accepted: ["preparing"],
                  preparing: ["ready"],
                  ready: ["completed"],
                }[order.status] ?? [];
                const whatsappNumber = getWhatsAppNumber(order.customer_phone);
                const whatsappMessage = encodeURIComponent(`Hi ${order.customer_name}, this is ${restaurant?.name} regarding your QuickCrave order request ${order.id.slice(0, 8).toUpperCase()}.`);
                return (
                  <article className="restaurant-order-card" key={order.id}>
                    <div className="card-title-row">
                      <div>
                        <h3>{order.customer_name} · {order.id.slice(0, 8).toUpperCase()}</h3>
                        <p>{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                    </div>
                    <ul className="order-cart-list">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <span>{item.quantity} × {item.item_name}</span>
                          <strong>{priceFormatter.format(Number(item.line_total))}</strong>
                        </li>
                      ))}
                      <li className="order-cart-total"><span>Estimated subtotal</span><strong>{priceFormatter.format(Number(order.subtotal))}</strong></li>
                    </ul>
                    <p className="order-delivery-summary"><strong>Delivery address:</strong> {order.delivery_address}</p>
                    <p className="order-delivery-summary"><strong>Customer phone:</strong> {order.customer_phone} · <a href={`mailto:${encodeURIComponent(order.customer_email)}`}>{order.customer_email}</a></p>
                    {order.customer_note && <p className="order-delivery-summary"><strong>Customer note:</strong> {order.customer_note}</p>}
                    <div className="admin-restaurant-actions">
                      {whatsappNumber && (
                        <a className="secondary-button" href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer">Contact on WhatsApp</a>
                      )}
                      {nextStatus.map((status) => (
                        <button
                          className={status === "rejected" ? "secondary-button" : "hero-primary-button"}
                          type="button"
                          key={status}
                          disabled={updatingOrderId === order.id}
                          onClick={() => updateRestaurantOrder(order.id, status)}
                        >
                          {updatingOrderId === order.id ? "Saving…" : status === "accepted" ? "Accept request" : status === "rejected" ? "Reject" : status === "preparing" ? "Start preparing" : status === "ready" ? "Mark ready" : "Mark completed"}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
      {activeSection === "menu" && (
        <>
          <section className="portal-card menu-editor-card">
            <div className="card-title-row"><div><h2>Add a menu item</h2><p>Add the dish details customers need to make a choice.</p></div></div>
            {restaurantRole !== "owner" && <p className="editor-warning">Only restaurant owners can edit the menu right now.</p>}
            <form className="menu-editor-form" onSubmit={addMenuItem}>
              <label>Dish name<input value={dishName} onChange={(event) => setDishName(event.target.value)} placeholder="e.g. House special" required /></label>
              <label>Description<input value={dishDescription} onChange={(event) => setDishDescription(event.target.value)} placeholder="A short description" /></label>
              <label>Category<select value={dishCategory} onChange={(event) => setDishCategory(event.target.value)}><option>Main</option><option>Starter</option><option>Dessert</option><option>Drinks</option><option>Side</option></select></label>
              <label>Price<input type="number" min="0.01" step="0.01" value={dishPrice} onChange={(event) => setDishPrice(event.target.value)} placeholder="0.00" required /></label>
              <label className="menu-image-field">Dish photo{editingItemId && " (optional replacement)"}<input id="menu-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  setMenuError("Choose an image smaller than 5 MB.");
                  event.target.value = "";
                  return;
                }
                setMenuError("");
                setDishImage(file);
              }} /></label>
              <button className="hero-primary-button" type="submit" disabled={restaurantRole !== "owner" || restaurantLoading}>{editingItemId ? "Save changes" : "Add item"} <span aria-hidden="true">{editingItemId ? "→" : "+"}</span></button>
              {editingItemId && <button className="menu-cancel-button" type="button" onClick={resetMenuForm}>Cancel</button>}
            </form>
            <p className="editor-warning">Photos: JPEG, PNG, or WebP up to 5 MB. Dietary and allergen information will be added in a later update.</p>
          </section>
          <section className="portal-card menu-list-card">
            <div className="card-title-row"><div><h2>Menu items</h2><p>{menuItems.length} {menuItems.length === 1 ? "item" : "items"}</p></div></div>
            {menuLoading ? (
              <p role="status">Loading your saved menu…</p>
            ) : menuError ? (
              <p className="auth-error" role="alert">{menuError}</p>
            ) : menuItems.length === 0 ? (
              <EmptyState icon="☷" title="Your menu is waiting" text="Add a dish above to start shaping your restaurant menu." />
            ) : (
              <ul className="editable-menu-list">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.image_url && <img className="menu-item-thumbnail" src={item.image_url} alt="" />}<strong>{item.name}</strong><small>{item.category}{item.description ? ` · ${item.description}` : ""}</small></span>
                    <strong>{priceFormatter.format(Number(item.price))}</strong>
                    <span className="menu-item-actions">
                      <button type="button" disabled={restaurantRole !== "owner"} onClick={() => updateMenuAvailability(item)}>{item.is_available ? "Available" : "Unavailable"}</button>
                      <button type="button" disabled={restaurantRole !== "owner"} onClick={() => beginEditMenuItem(item)}>Edit</button>
                      <button type="button" disabled={restaurantRole !== "owner"} onClick={() => deleteMenuItem(item.id)}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {activeSection === "settings" && (
        <form
          className="portal-card profile-form"
          onSubmit={saveRestaurantSettings}
        >
          <div className="card-title-row"><div><h2>Restaurant details</h2><p>Keep your public profile and contact channels current.</p></div></div>
          {restaurantLoading && <p role="status">Loading restaurant details…</p>}
          {settingsError && <p className="auth-error" role="alert">{settingsError}</p>}
          {restaurant?.status !== "approved" && <p className="editor-warning">Your restaurant is not public until QuickCrave approves its profile.</p>}
          <div className="profile-fields">
            <label>Restaurant name<input name="name" value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} required /></label>
            <label>Contact email<input name="contact_email" type="email" value={settingsForm.contact_email} onChange={(event) => setSettingsForm({ ...settingsForm, contact_email: event.target.value })} required /></label>
            <label>Phone number<input name="phone" type="tel" value={settingsForm.phone} onChange={(event) => setSettingsForm({ ...settingsForm, phone: event.target.value })} /></label>
            <label>WhatsApp number<input name="whatsapp" type="tel" value={settingsForm.whatsapp} onChange={(event) => setSettingsForm({ ...settingsForm, whatsapp: event.target.value })} /></label>
            <label>Neighborhood or city<input name="location" value={settingsForm.location} onChange={(event) => setSettingsForm({ ...settingsForm, location: event.target.value })} required /></label>
            <label>Opening hours<input name="opening_hours" value={settingsForm.opening_hours} onChange={(event) => setSettingsForm({ ...settingsForm, opening_hours: event.target.value })} /></label>
          </div>
          <button className="hero-primary-button profile-save" type="submit" disabled={restaurantLoading || restaurantRole !== "owner"}>Save changes <span aria-hidden="true">→</span></button>
          {settingsStatus && <p className="profile-status" role="status">{settingsStatus}</p>}
          <div className="settings-checklist"><span>○ Staff access and invitations</span><span>○ Email &amp; WhatsApp notifications</span></div>
        </form>
      )}
    </PortalFrame>
  );
}

function MetricCard({ label, value, detail, icon }) {
  return (
    <article className="metric-card">
      <span className="metric-icon" aria-hidden="true">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AdminDashboard() {
  const { supabase } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadRestaurants() {
      setLoading(true);
      setError("");
      const { data, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("id, name, location, opening_hours, status, created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (restaurantsError) {
        setError(restaurantsError.message);
        setLoading(false);
        return;
      }

      const restaurantIds = (data ?? []).map((restaurant) => restaurant.id);
      if (restaurantIds.length) {
        const { data: contacts, error: contactsError } = await supabase
          .from("restaurant_contacts")
          .select("restaurant_id, contact_email, phone, whatsapp")
          .in("restaurant_id", restaurantIds);
        if (!active) return;
        if (contactsError) {
          setError(contactsError.message);
          setLoading(false);
          return;
        }
        const contactsByRestaurant = new Map(
          (contacts ?? []).map((contact) => [contact.restaurant_id, contact]),
        );
        setRestaurants((data ?? []).map((restaurant) => ({
          ...restaurant,
          contacts: contactsByRestaurant.get(restaurant.id),
        })));
      } else {
        setRestaurants([]);
      }
      setLoading(false);
    }

    loadRestaurants();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function updateRestaurantStatus(restaurant, status) {
    setUpdatingId(restaurant.id);
    setError("");
    setStatusMessage("");
    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update({ status })
      .eq("id", restaurant.id)
      .select("id, status")
      .single();
    if (updateError) {
      setError(updateError.message);
    } else {
      setRestaurants((current) => current.map((item) =>
        item.id === data.id ? { ...item, status: data.status } : item,
      ));
      setStatusMessage(`${restaurant.name} is now ${status}.`);
    }
    setUpdatingId("");
  }

  const visibleRestaurants = filter === "all"
    ? restaurants
    : restaurants.filter((restaurant) => restaurant.status === filter);
  const pendingCount = restaurants.filter((restaurant) => restaurant.status === "pending").length;

  return (
    <PortalFrame audience="admin">
      <DashboardHeader
        eyebrow="MARKETPLACE ADMINISTRATION"
        title="Restaurant review"
        description="Review restaurant registrations and manage their marketplace approval."
        action={<span className="status-pill">{pendingCount} pending</span>}
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {statusMessage && <p className="profile-status" role="status">{statusMessage}</p>}
      <section className="portal-card admin-review-card">
        <div className="card-title-row">
          <div><h2>Restaurant applications</h2><p>Confirm the business details before making a restaurant public.</p></div>
          <label className="admin-filter">
            <span className="visually-hidden">Filter restaurants</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="all">All restaurants</option>
            </select>
          </label>
        </div>
        {loading ? (
          <p role="status">Loading restaurant applications…</p>
        ) : visibleRestaurants.length === 0 ? (
          <EmptyState
            icon="✓"
            title={filter === "pending" ? "No applications awaiting review" : "No restaurants in this list"}
            text={filter === "pending" ? "New restaurant registrations will appear here." : "Choose another status filter to review restaurants."}
          />
        ) : (
          <ul className="admin-restaurant-list">
            {visibleRestaurants.map((restaurant) => (
              <li key={restaurant.id}>
                <div className="admin-restaurant-details">
                  <div className="admin-restaurant-title">
                    <h3>{restaurant.name}</h3>
                    <span className={`status-pill status-${restaurant.status}`}>{restaurant.status}</span>
                  </div>
                  <p>{restaurant.location || "Location not provided"}{restaurant.opening_hours ? ` · ${restaurant.opening_hours}` : ""}</p>
                  <p>
                    {restaurant.contacts?.contact_email || "No contact email"}
                    {restaurant.contacts?.phone ? ` · ${restaurant.contacts.phone}` : ""}
                    {restaurant.contacts?.whatsapp ? ` · WhatsApp ${restaurant.contacts.whatsapp}` : ""}
                  </p>
                  <small>Submitted {new Date(restaurant.created_at).toLocaleDateString()}</small>
                </div>
                <div className="admin-restaurant-actions">
                  {restaurant.status !== "approved" && (
                    <button
                      className="hero-primary-button"
                      type="button"
                      disabled={updatingId === restaurant.id}
                      onClick={() => updateRestaurantStatus(restaurant, "approved")}
                    >
                      {updatingId === restaurant.id ? "Saving…" : "Approve"}
                    </button>
                  )}
                  {restaurant.status === "pending" && (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={updatingId === restaurant.id}
                      onClick={() => updateRestaurantStatus(restaurant, "rejected")}
                    >
                      Reject
                    </button>
                  )}
                  {restaurant.status === "approved" && (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={updatingId === restaurant.id}
                      onClick={() => updateRestaurantStatus(restaurant, "suspended")}
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalFrame>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <section className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

export function CustomerDashboardPage() {
  const { pathname } = useLocation();
  const section = pathname.split("/").at(-1);
  return (
    <ProtectedRoute audience="customer">
      <CustomerDashboard section={section === "dashboard" ? "discover" : section} />
    </ProtectedRoute>
  );
}

export function RestaurantDashboardPage() {
  const { pathname } = useLocation();
  const section = pathname.split("/").at(-1);
  return (
    <ProtectedRoute audience="restaurant">
      <RestaurantDashboard section={section === "dashboard" ? "overview" : section} />
    </ProtectedRoute>
  );
}

export function AdminDashboardPage() {
  return (
    <ProtectedRoute audience="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}

export function AccountChoicePage() {
  return (
    <main className="account-choice-page">
      <header className="auth-topbar"><PortalBrand /><HomeLink label="Back to homepage" /></header>
      <div className="account-choice-content">
        <p className="section-eyebrow">WELCOME TO QUICKCRAVE</p>
        <h1>How would you like to use QuickCrave?</h1>
        <p>Choose the account that fits you. You can always come back to this page.</p>
        <div className="account-choice-grid">
          <article><span className="choice-icon">♡</span><h2>Find food nearby</h2><p>Discover local restaurants, save dishes, and keep up with your orders.</p><div><Link className="hero-primary-button" to="/customer/signup">Create customer account <span aria-hidden="true">→</span></Link><Link className="choice-secondary" to="/customer/login">Customer sign in</Link></div></article>
          <article><span className="choice-icon restaurant-choice">⌂</span><h2>Run a restaurant</h2><p>Set up your restaurant, manage your menu, and coordinate incoming requests.</p><div><Link className="hero-primary-button" to="/restaurant/signup">Register restaurant <span aria-hidden="true">→</span></Link><Link className="choice-secondary" to="/restaurant/login">Restaurant sign in</Link></div></article>
        </div>
      </div>
    </main>
  );
}
