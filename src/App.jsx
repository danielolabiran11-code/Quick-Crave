import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
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
            d="M21.5 4.5c1.8 7.1-3.1 8.3-3.1 13.1 0 2.2 1.1 3.6 2.8 4.5-.2-3.1 1.5-5.3 4.7-7.5 3.5 3.4 5.4 7.1 5.4 11.1 0 6-4.8 10-11.2 10S8.9 31.7 8.9 25.8c0-4.9 3.1-8.5 7.8-12.1-.7 5.2 1.7 6.7 3.5 7.1-1.6-5.6 4.1-8.8 1.3-16.3Z"
            fill="currentColor"
          />
          <path
            d="M20.1 29.7c1.8-2.1 1.8-4 1.6-5.3 2.8 1.8 4.1 3.8 4.1 6 0 2.6-2 4.3-4.7 4.3s-4.7-1.7-4.7-4.1c0-1.5.8-2.8 2.2-4 .1 1.5.5 2.4 1.5 3.1Z"
            fill="#FFF9F2"
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
        aria-label={`Explore the ${dish.name}`}
      >
        {dish.image ? (
          <img src={dish.image} alt={dish.imageAlt || `${dish.name} from ${dish.restaurant}`} loading="lazy" />
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
          {dish.restaurant} <span aria-hidden="true">·</span> {dish.cuisine}
        </p>
        <div className="dish-meta">
          {dish.time && <span>{dish.time}</span>}
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
                ["#menu", "Explore menu"],
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
              Your neighborhood, on a plate
            </p>
            <h1 id="hero-title">
              Big flavor.
              <br />
              <span>Close</span> by.
            </h1>
            <p className="hero-description">
              Discover the good stuff from neighborhood restaurants and explore
              their menus in one place.
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
                <strong>Good food, close to home</strong>
                <br />
                Made for neighborhood restaurants and the people who love them.
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-wash" aria-hidden="true" />
            <div className="visual-note note-top" aria-hidden="true">
              <span className="note-icon">✦</span>
              <span>Made fresh,<br /><strong>never boring</strong></span>
            </div>
            <div className="meal-art">
              <img
                className="hero-food-photo"
                src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=88"
                alt="Freshly baked pizza topped with tomato, basil, and melted cheese"
                fetchPriority="high"
              />
            </div>
            <div className="visual-note note-bottom" aria-hidden="true">
              <span className="delivery-icon">↗</span>
              <span>Local kitchens<br /><strong>right around you</strong></span>
            </div>
            <svg className="hero-chilli" viewBox="0 0 120 150" fill="none" aria-hidden="true">
              <path d="M42 25c15 9 23 25 22 44-1 24-19 47-42 57-10 5-18 2-17-7 2-15 17-28 20-48 3-18-3-30 5-42 3-5 7-7 12-4Z" fill="#E95C32" />
              <path d="M42 29c-4-10-2-19 5-25 3 8 8 13 16 15-1 6-7 11-16 13" fill="#4D8A4F" />
              <path d="M45 37c7 18 2 38-9 55" stroke="#FF9B68" strokeLinecap="round" strokeWidth="5" opacity=".8" />
            </svg>
          </div>
        </section>

        <section className="explore-section" id="menu" aria-labelledby="menu-title">
          <div className="explore-container">
            <div className="explore-heading">
              <div>
                <p className="section-eyebrow">Good food, great mood</p>
                <h2 id="menu-title">What are you <span>craving?</span></h2>
                <p className="section-description">
                  Local favorites, made fresh and ready to make your day.
                </p>
              </div>
              <a className="explore-all-link" href="#menu">
                Explore all dishes <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="menu-filters" role="group" aria-label="Filter dishes by category">
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
              Browse available dishes from approved neighborhood restaurants.
            </p>
            <div className="dish-grid" id="dish-grid" aria-live="polite">
              {menuLoading ? (
                <p className="public-menu-state" role="status">Loading restaurant menus…</p>
              ) : menuError ? (
                <p className="public-menu-state" role="alert">Couldn’t load restaurant menus: {menuError}</p>
              ) : visibleDishes.length === 0 ? (
                <p className="public-menu-state">
                  {dishes.length === 0
                    ? "Restaurant menus will appear here after QuickCrave is configured and restaurants are approved."
                    : "There are no available dishes in this category yet."}
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
                  <p className="section-eyebrow">Keep your cravings close</p>
                  <h2 id="favorites-title">Your <span>favorites</span></h2>
                  <p className="section-description">The dishes you love, all in one place.</p>
                </div>
                <a className="explore-all-link" href="#menu">
                  Browse the menu <span aria-hidden="true">↗</span>
                </a>
              </div>
              {favoriteDishes.length === 0 ? (
                <p className="favorites-empty" role="status">
                  No favorites yet. Tap the heart on any dish to save it here.
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
              <p className="section-eyebrow">Good food is just around the corner</p>
              <h2 id="ordering-title">Your next great meal is <span>three taps away.</span></h2>
              <p className="section-description">
                Skip the guesswork. We make getting something delicious feel effortless.
              </p>
              <a className="hero-primary-button" href="#menu">
                Start exploring <span aria-hidden="true">→</span>
              </a>
            </div>
            <ol className="ordering-steps">
              <li><span className="step-number">01</span><div><h3>Find your craving</h3><p>Browse menus from neighborhood restaurants.</p></div></li>
              <li><span className="step-number">02</span><div><h3>Send an order request</h3><p>Choose your dishes and share your delivery details.</p></div></li>
              <li><span className="step-number">03</span><div><h3>Confirm with the restaurant</h3><p>The restaurant confirms availability and arranges payment and delivery directly with you.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="story-section" id="about" aria-labelledby="story-title">
          <div className="story-container">
            <div className="story-visual">
              <div className="story-photo">
                <img
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85"
                  alt="A freshly prepared meal made with colorful local ingredients"
                  loading="lazy"
                />
                <span className="story-photo-label"><span aria-hidden="true">✦</span> A taste of the neighborhood</span>
              </div>
              <div className="story-note">
                <span className="story-note-icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none">
                    <path d="M5 14.5 16 5l11 9.5V27H5V14.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 27v-8h8v8M10 14h.01M16 14h.01M22 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <span><strong>Good food.</strong><br />Good neighbors.</span>
              </div>
              <span className="story-sparkle sparkle-one" aria-hidden="true">✳</span>
              <span className="story-sparkle sparkle-two" aria-hidden="true">✦</span>
            </div>
            <div className="story-copy">
              <p className="section-eyebrow">A little about us</p>
              <h2 id="story-title">Big love for the <span>little places.</span></h2>
              <p className="story-lead">
                The best bites aren’t always from the biggest kitchens. They’re
                from the neighborhood spots that remember your order, try
                something new, and put a little heart into every plate.
              </p>
              <p className="story-description">
                QuickCrave is built around a simple idea: discovering those
                places should feel just as good as eating from them. We bring
                local menus together in one easy place, so finding your next
                favorite feels effortless—and choosing local feels natural.
              </p>
              <a className="story-link" href="#menu">
                Get to know your local menu <span aria-hidden="true">→</span>
              </a>
              <div className="story-values">
                <div><span className="value-mark" aria-hidden="true">01</span><strong>Local at heart</strong><p>Made for neighborhood flavor.</p></div>
                <div><span className="value-mark" aria-hidden="true">02</span><strong>Always welcoming</strong><p>Something for every craving.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="partner-section" id="partners" aria-labelledby="partner-title">
          <div className="partner-container">
            <div className="partner-copy">
              <p className="section-eyebrow">For the people behind the plate</p>
              <h2 id="partner-title">Your food deserves a <span>bigger table.</span></h2>
              <p>We help neighborhood restaurants meet more hungry locals. Tell us a little about your spot and our partnerships team will be in touch.</p>
              <ul className="partner-benefits">
                <li><span aria-hidden="true">✓</span> Reach new nearby customers</li>
                <li><span aria-hidden="true">✓</span> Keep your restaurant's personality front and center</li>
                <li><span aria-hidden="true">✓</span> Grow at a pace that works for you</li>
              </ul>
              <p className="partner-disclaimer">Restaurant registration is available through a restaurant account.</p>
            </div>
            <div className="partner-form partner-register-card" id="partner-form">
              <h3>Let's get to know your restaurant</h3>
              <p>Create a restaurant account to set up your business and manage your menu.</p>
              <Link className="hero-primary-button" to="/restaurant/signup">
                Register your restaurant <span aria-hidden="true">→</span>
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
            <p>Good food from good neighbors.<br />A little local flavor goes a long way.</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <div className="footer-link-group"><h2>Explore</h2><a href="#menu">Browse the menu</a><a href="#how-it-works">How it works</a></div>
            <div className="footer-link-group"><h2>Be part of it</h2><a href="#partners">Restaurant partners</a><a href="#partner-form">Pitch your restaurant</a></div>
          </nav>
          <a className="footer-order-link" href="#menu">
            Hungry yet?
            <span>Find something delicious <span aria-hidden="true">↗</span></span>
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
