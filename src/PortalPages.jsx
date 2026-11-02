import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext.jsx";

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
    : [
        ["/customer/dashboard", "Discover"],
        ["/customer/dashboard/orders", "Your orders"],
        ["/customer/dashboard/favorites", "Favorites"],
        ["/customer/dashboard/profile", "Profile"],
      ];

  return (
    <div className="portal-page">
      <header className="portal-topbar">
        <PortalBrand />
        <div className="portal-topbar-right">
          <span className="portal-account-label">{isRestaurant ? "Restaurant workspace" : "Customer account"}</span>
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
              <strong>{isRestaurant ? "Restaurant account" : "Welcome to QuickCrave"}</strong>
              <span>{isRestaurant ? "Manage your business" : "Find your next favorite"}</span>
            </div>
          </div>
          <nav aria-label={`${audience} dashboard`}>
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
            <p>Need help?</p>
            <a href="mailto:hello@quickcrave.example">Contact QuickCrave</a>
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${audience}/login`,
            data: {
              account_type: audience,
              full_name: String(formData.get("name") ?? "").trim(),
              phone: String(formData.get("phone") ?? "").trim(),
              restaurant_name: isRestaurant
                ? String(formData.get("name") ?? "").trim()
                : "",
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          navigate(`/${audience}/dashboard`, { replace: true });
        } else {
          setNotice("Check your email to confirm the account, then sign in to continue.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

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
          <span className="auth-eyebrow">{isRestaurant ? "FOR RESTAURANTS" : "FOR FOOD LOVERS"}</span>
          <h1>{isRestaurant ? "Your kitchen’s next chapter starts here." : "Good food is closer than you think."}</h1>
          <p>
            {isRestaurant
              ? "Build your restaurant presence, keep your menu current, and stay close to every order."
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
            <p>
              {isRestaurant
                ? "Restaurant account"
                : "Customer account"}
            </p>
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
          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to QuickCrave?"}{" "}
            <Link to={`/${audience}/${isSignup ? "login" : "signup"}`}>
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
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
    if (activeSection !== "profile") return undefined;

    async function loadProfile() {
      setProfileLoading(true);
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
      setProfileLoading(false);
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [activeSection, supabase, user.id]);

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
                            <strong>${Number(item.price).toFixed(2)}</strong>
                          </li>
                        ))}
                    </ul>
                    <p className="feed-order-note">Order requests will be enabled soon.</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="customer-shortcuts">
            <Link to="/customer/dashboard/orders"><span>▤</span><strong>Order history</strong><small>See updates from your restaurants</small></Link>
            <Link to="/customer/dashboard/favorites"><span>♡</span><strong>Your favorites</strong><small>Keep your go-to dishes close</small></Link>
          </div>
        </>
      )}
      {activeSection === "orders" && (
        <EmptyState icon="▤" title="No orders yet" text="When you place an order request with a restaurant, its status and updates will appear here." />
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
          <EmptyState icon="◷" title="Order requests aren’t enabled yet" text="Once customer ordering is connected, new requests will appear here." />
        </>
      )}
      {activeSection === "orders" && (
        <section className="portal-card">
          <div className="card-title-row"><div><h2>Order inbox</h2><p>New requests, accepted orders, and recent activity.</p></div><span className="status-pill">{restaurant?.status === "approved" ? "Ready for orders" : "Pending review"}</span></div>
          <EmptyState icon="▤" title="Order requests aren’t enabled yet" text={restaurant?.status === "approved" ? "Customer orders will appear here after order placement is connected." : "Your restaurant must be approved before it can receive customer requests."} />
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
                    <strong>${Number(item.price).toFixed(2)}</strong>
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
