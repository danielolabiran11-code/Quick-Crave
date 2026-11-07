import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import LoadingIndicator from "./LoadingIndicator.jsx";
import { ThemeToggle } from "./ThemeContext.jsx";
import {
  AccountChoicePage,
  AdminDashboardPage,
  AuthPage,
  CustomerDashboardPage,
  RestaurantDashboardPage,
} from "./PortalPages.jsx";

const favoriteStorageKey = "quickcrave:favorites";
const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function getSavedFavorites() {
  try {
    const storedFavorites = window.localStorage.getItem(favoriteStorageKey);
    if (storedFavorites === null) return [];

    const ids = JSON.parse(storedFavorites);
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw new TypeError("Saved favorites must be an array of dish IDs.");
    }

    return [...new Set(ids)];
  } catch (error) {
    console.error("Could not load saved QuickCrave favorites.", error);
    return [];
  }
}

function Brand({ footer = false }) {
  return (
    <a
      className={`brand${footer ? " footer-logo" : ""}`}
      href="#home"
      aria-label="QuickCrave home"
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path
            d="m20 3 4.6 12.4L37 20l-12.4 4.6L20 37l-4.6-12.4L3 20l12.4-4.6L20 3Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="brand-name">
        Quick<span>Crave</span>
      </span>
    </a>
  );
}

function DishCard({ dish, favorite, onToggleFavorite }) {
  return (
    <article className="dish-card" data-category={dish.category}>
      <a
        className="dish-image"
        href="#menu"
        aria-label={`View ${dish.name}`}
      >
        {dish.image ? (
          <img src={dish.image} alt={dish.imageAlt || dish.name} loading="lazy" />
        ) : (
          <span className="dish-image-placeholder" aria-hidden="true">✦</span>
        )}
      </a>
      <button
        className={`dish-favorite${favorite ? " is-favorite" : ""}`}
        type="button"
        onClick={() => onToggleFavorite(dish)}
        aria-label={`${favorite ? "Remove" : "Add"} ${dish.name} ${favorite ? "from" : "to"} favorites`}
        aria-pressed={favorite}
      >
        {favorite ? "♥" : "♡"}
      </button>
      <div className="dish-details">
        <div className="dish-title-row">
          <h3>{dish.name}</h3>
        </div>
        <p className="dish-restaurant">
          {dish.category} <span aria-hidden="true">·</span> {dish.restaurant}
        </p>
        {dish.description && <p className="dish-description">{dish.description}</p>}
        <div className="dish-meta">
          <span>Available now</span>
          <span className="dish-price">{currency.format(dish.price)}</span>
        </div>
        <Link className="dish-add-button" to="/customer/login">
          Sign in to order <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function LandingPage() {
  const [favorites, setFavorites] = useState(getSavedFavorites);
  const [category, setCategory] = useState("all");
  const [dishes, setDishes] = useState([]);
  const [menuLoading, setMenuLoading] = useState(isSupabaseConfigured);
  const [menuError, setMenuError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("#home");
  const [toast, setToast] = useState("");
  const [currentYear] = useState(() => new Date().getFullYear());
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return undefined;

    async function loadMenu() {
      setMenuLoading(true);
      setMenuError("");
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, category, price, image_url, restaurants!inner(id, name, location)")
        .eq("is_available", true)
        .order("name");
      if (!active) return;
      if (error) {
        setMenuError(error.message);
      } else {
        const publicDishes = (data ?? []).map((item) => ({
            ...item,
            restaurant: item.restaurants.name,
            cuisine: item.restaurants.location || item.category,
            category: item.category || "Other",
            image: item.image_url,
          }));
        setDishes(publicDishes);
        const availableIds = new Set(publicDishes.map((item) => item.id));
        setFavorites((current) => current.filter((id) => availableIds.has(id)));
      }
      setMenuLoading(false);
    }

    loadMenu();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
    } catch (error) {
      console.error("Could not save QuickCrave favorites.", error);
      setToast("Your favorites could not be saved on this device.");
    }
  }, [favorites]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  function showToast(message) {
    setToast(message);
    window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), 2400);
  }

  function toggleFavorite(dish) {
    const isFavorite = favorites.includes(dish.id);
    setFavorites((current) =>
      isFavorite
        ? current.filter((id) => id !== dish.id)
        : [...current, dish.id],
    );
    showToast(
      `${dish.name} ${isFavorite ? "removed from" : "added to"} your favorites.`,
    );
  }

  const menuCategories = [
    { id: "all", label: "Everything" },
    ...[...new Set(dishes.map((dish) => dish.category))].map((item) => ({
      id: item,
      label: item,
    })),
  ];
  const visibleDishes = category === "all"
    ? dishes
    : dishes.filter((dish) => dish.category === category);
  const favoriteDishes = favorites
    .map((id) => dishes.find((dish) => dish.id === id))
    .filter(Boolean);

  return (
    <>
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="navigation-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div
            className={`navigation-menu${menuOpen ? " is-open" : ""}`}
            id="navigation-menu"
          >
            <ul className="navigation-links">
              {[
                ["#home", "Home"],
                ["#menu", "Explore"],
                ["#favorites", "Favorites"],
                ["#how-it-works", "How it works"],
                ["#about", "Our story"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    className={`navigation-link${activeLink === href ? " is-active" : ""}${href === "#favorites" ? " favorites-navigation-link" : ""}`}
                    href={href}
                    onClick={() => {
                      setActiveLink(href);
                      setMenuOpen(false);
                    }}
                  >
                    {label}
                    {href === "#favorites" && (
                    <span id="favorites-count" aria-live="polite">{favorites.length}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
            <ThemeToggle />
            <Link className="navigation-account-link" to="/customer/login">Sign in</Link>
            <Link className="navigation-join-link" to="/account">Join QuickCrave</Link>
          </div>
        </nav>
      </header>

      <main id="home">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="hero-eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Good finds, in one place
            </p>
            <h1 id="hero-title">
              Good finds.
              <br />
              <span>All in</span> one place.
            </h1>
            <p className="hero-description">
              Explore useful finds from trusted local sellers, all in one place.
            </p>
            <div className="hero-actions">
              <a className="hero-primary-button" href="#menu">
                Find your next favorite <span aria-hidden="true">→</span>
              </a>
              <a className="hero-secondary-link" href="#how-it-works">
                How it works <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-proof">
              <p>
                <strong>More to enjoy, all in one place</strong>
                <br />
                A simpler way to discover what fits your everyday routine.
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-wash" aria-hidden="true" />
            <div className="visual-note note-top" aria-hidden="true">
              <span className="note-icon">✦</span>
              <span>Find your next<br /><strong>favorite thing</strong></span>
            </div>
            <div className="meal-art">
              <img
                className="hero-food-photo"
                src="https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=88"
                alt="A selection of parcels prepared for online orders"
                fetchPriority="high"
              />
            </div>
            <div className="visual-note note-bottom" aria-hidden="true">
              <span className="delivery-icon">↗</span>
              <span>Good finds<br /><strong>closer than you think</strong></span>
            </div>
            <span className="hero-spark" aria-hidden="true">✦</span>
          </div>
        </section>

        <section className="explore-section" id="menu" aria-labelledby="menu-title">
          <div className="explore-container">
            <div className="explore-heading">
              <div>
                <p className="section-eyebrow">The good stuff, gathered</p>
                <h2 id="menu-title">Find what fits <span>your day.</span></h2>
                <p className="section-description">
                  Browse useful finds from sellers around you.
                </p>
              </div>
              <a className="explore-all-link" href="#menu">
                Explore everything <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="menu-filters" role="group" aria-label="Filter products by category">
              {menuCategories.map((item) => (
                <button
                  className={`menu-filter${category === item.id ? " is-selected" : ""}`}
                  type="button"
                  key={item.id}
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="menu-disclaimer">
              Listings are provided by approved local sellers. Availability is confirmed when you order.
            </p>
            <div className="dish-grid" id="dish-grid" aria-live="polite">
              {menuLoading ? (
                <p className="public-menu-state">
                  <LoadingIndicator label="Loading products" centered />
                </p>
              ) : menuError ? (
                <p className="public-menu-state" role="alert">Couldn’t load listings: {menuError}</p>
              ) : visibleDishes.length === 0 ? (
                <p className="public-menu-state">
                  {dishes.length === 0
                    ? "Listings will appear here as local sellers join QuickCrave."
                    : "There are no available listings in this category yet."}
                </p>
              ) : visibleDishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  favorite={favorites.includes(dish.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            <section className="favorites-section" id="favorites" aria-labelledby="favorites-title">
              <div className="favorites-heading">
                <div>
                  <p className="section-eyebrow">Keep your good finds close</p>
                  <h2 id="favorites-title">Your <span>favorites</span></h2>
                  <p className="section-description">The things you love, all in one place.</p>
                </div>
                <a className="explore-all-link" href="#menu">
                  Browse listings <span aria-hidden="true">↗</span>
                </a>
              </div>
              {favoriteDishes.length === 0 ? (
                <p className="favorites-empty" role="status">
                  No favorites yet. Tap the heart on any listing to save it here.
                </p>
              ) : (
                <div className="dish-grid favorites-grid" aria-live="polite">
                  {favoriteDishes.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      favorite
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="ordering-section" id="how-it-works" aria-labelledby="ordering-title">
          <div className="ordering-container">
            <div className="ordering-intro">
              <p className="section-eyebrow">A better way to find your next favorite</p>
              <h2 id="ordering-title">Discover it. Request it. <span>Enjoy it.</span></h2>
              <p className="section-description">
                Find something that suits your day and connect directly with its seller.
              </p>
              <a className="hero-primary-button" href="#menu">
                Start exploring <span aria-hidden="true">→</span>
              </a>
            </div>
            <ol className="ordering-steps">
              <li><span className="step-number">01</span><div><h3>Explore the collection</h3><p>Browse offerings from trusted local sellers.</p></div></li>
              <li><span className="step-number">02</span><div><h3>Send a request</h3><p>Choose what you want and share your delivery details.</p></div></li>
              <li><span className="step-number">03</span><div><h3>Confirm the details</h3><p>Your seller confirms availability, payment, and delivery directly with you.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="story-section" id="about" aria-labelledby="story-title">
          <div className="story-container">
            <div className="story-visual">
              <div className="story-photo">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=85"
                  alt="A customer completing a purchase at a local shop"
                  loading="lazy"
                />
                <span className="story-photo-label"><span aria-hidden="true">✦</span> A little inspiration from local shops</span>
              </div>
              <div className="story-note">
                <span className="story-note-icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none">
                    <path d="M5 14.5 16 5l11 9.5V27H5V14.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 27v-8h8v8M10 14h.01M16 14h.01M22 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <span><strong>Good finds.</strong><br />Good days.</span>
              </div>
              <span className="story-sparkle sparkle-one" aria-hidden="true">✳</span>
              <span className="story-sparkle sparkle-two" aria-hidden="true">✦</span>
            </div>
            <div className="story-copy">
              <p className="section-eyebrow">A little about us</p>
              <h2 id="story-title">A little more of what <span>you love.</span></h2>
              <p className="story-lead">
                Everyone has different needs. We make it easier to find local
                favorites and useful discoveries in one place.
              </p>
              <p className="story-description">
                QuickCrave brings local offerings together so you can explore
                at your own pace, find something that fits, and connect with the
                people who provide it.
              </p>
              <a className="story-link" href="#menu">
                Explore the collection <span aria-hidden="true">→</span>
              </a>
              <div className="story-values">
                <div><span className="value-mark" aria-hidden="true">01</span><strong>Local at heart</strong><p>Discover what is available nearby.</p></div>
                <div><span className="value-mark" aria-hidden="true">02</span><strong>Room to explore</strong><p>More ways to find what suits you.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="partner-section" id="partners" aria-labelledby="partner-title">
          <div className="partner-container">
            <div className="partner-copy">
              <p className="section-eyebrow">For local businesses</p>
              <h2 id="partner-title">Bring your offerings to <span>more people.</span></h2>
              <p>Connect with people looking for useful discoveries nearby. Tell us about your business and our partnerships team will be in touch.</p>
              <ul className="partner-benefits">
                <li><span aria-hidden="true">✓</span> Reach new nearby customers</li>
                <li><span aria-hidden="true">✓</span> Keep your business and offerings front and center</li>
                <li><span aria-hidden="true">✓</span> Grow at a pace that works for you</li>
              </ul>
              <p className="partner-disclaimer">Business onboarding is currently available through our existing seller account flow.</p>
            </div>
            <div className="partner-form partner-register-card" id="partner-form">
              <h3>Let's get to know your business</h3>
              <p>Create a seller account to set up your business and manage your listings.</p>
              <Link className="hero-primary-button" to="/restaurant/signup">
                Register your business <span aria-hidden="true">→</span>
              </Link>
              <Link className="partner-login-link" to="/restaurant/login">Already registered? Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Brand footer />
            <p>Good finds from good neighbors.<br />More of what you love, in one place.</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <div className="footer-link-group"><h2>Explore</h2><a href="#menu">Browse listings</a><a href="#how-it-works">How it works</a></div>
            <div className="footer-link-group"><h2>Be part of it</h2><a href="#partners">Business partners</a><a href="#partner-form">List your business</a></div>
          </nav>
          <a className="footer-order-link" href="#menu">
            Looking for something?
            <span>Explore the collection <span aria-hidden="true">↗</span></span>
          </a>
        </div>
        <div className="footer-bottom">
          <p>© <span>{currentYear}</span> QuickCrave. Made with a little extra flavor.</p>
          <a href="#home">Back to top <span aria-hidden="true">↑</span></a>
        </div>
      </footer>

      <div className={`toast-message${toast ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/account" element={<AccountChoicePage />} />
      <Route path="/customer/login" element={<AuthPage audience="customer" mode="login" />} />
      <Route path="/customer/signup" element={<AuthPage audience="customer" mode="signup" />} />
      <Route path="/customer/forgot-password" element={<AuthPage audience="customer" mode="recovery" />} />
      <Route path="/customer/reset-password" element={<AuthPage audience="customer" mode="password-reset" />} />
      <Route path="/restaurant/login" element={<AuthPage audience="restaurant" mode="login" />} />
      <Route path="/restaurant/signup" element={<AuthPage audience="restaurant" mode="signup" />} />
      <Route path="/restaurant/forgot-password" element={<AuthPage audience="restaurant" mode="recovery" />} />
      <Route path="/restaurant/reset-password" element={<AuthPage audience="restaurant" mode="password-reset" />} />
      <Route path="/admin/login" element={<AuthPage audience="admin" mode="login" />} />
      <Route path="/admin/forgot-password" element={<AuthPage audience="admin" mode="recovery" />} />
      <Route path="/admin/reset-password" element={<AuthPage audience="admin" mode="password-reset" />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/customer/dashboard/*" element={<CustomerDashboardPage />} />
      <Route path="/restaurant/dashboard/*" element={<RestaurantDashboardPage />} />
      <Route path="*" element={<AccountChoicePage />} />
    </Routes>
  );
}

export default App;
