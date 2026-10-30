const menuToggle = document.querySelector(".menu-toggle");
const navigationMenu = document.querySelector(".navigation-menu");
const navigationLinks = document.querySelectorAll(".navigation-link");
const menuFilters = document.querySelectorAll(".menu-filter");
const dishCards = document.querySelectorAll(".dish-card");
const favoritesGrid = document.querySelector("#favorites-grid");
const favoritesEmpty = document.querySelector("#favorites-empty");
const favoritesCount = document.querySelector("#favorites-count");
const cartDialog = document.querySelector("#cart-dialog");
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const cart = new Map();
const favoriteStorageKey = "quickcrave:favorites";
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dishesById = new Map(
  Array.from(dishCards, (card) => [
    card.querySelector("[data-add-to-cart]")?.dataset.id,
    card,
  ]).filter(([id]) => id),
);
let toastTimeout;

function loadFavorites() {
  try {
    const storedFavorites = window.localStorage.getItem(favoriteStorageKey);
    if (storedFavorites === null) return new Set();

    const ids = JSON.parse(storedFavorites);
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw new TypeError("Saved favorites must be an array of dish IDs.");
    }

    return new Set(ids.filter((id) => dishesById.has(id)));
  } catch (error) {
    console.error("Could not load saved QuickCrave favorites.", error);
    return new Set();
  }
}

const favorites = loadFavorites();

document.querySelector("#current-year").textContent = String(
  new Date().getFullYear(),
);

function showCartView() {
  document.querySelector("#cart-view").hidden = false;
  document.querySelector("#checkout-form").hidden = true;
  document.querySelector("#checkout-confirmation").hidden = true;
}

function renderCart() {
  cartItems.replaceChildren();

  let itemCount = 0;
  let subtotal = 0;

  cart.forEach((item, id) => {
    itemCount += item.quantity;
    subtotal += item.price * item.quantity;

    const line = document.createElement("div");
    line.className = "cart-line";

    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = item.name;
    const restaurant = document.createElement("p");
    restaurant.textContent = item.restaurant;

    const controls = document.createElement("div");
    controls.className = "cart-line-controls";
    controls.append(
      createQuantityButton("Decrease quantity", "decrease", id, "−"),
    );
    const quantity = document.createElement("span");
    quantity.className = "cart-quantity";
    quantity.textContent = String(item.quantity);
    controls.append(quantity);
    controls.append(
      createQuantityButton("Increase quantity", "increase", id, "+"),
    );

    const remove = document.createElement("button");
    remove.className = "cart-remove";
    remove.type = "button";
    remove.dataset.cartAction = "remove";
    remove.dataset.id = id;
    remove.textContent = "Remove";
    controls.append(remove);

    details.append(name, restaurant, controls);
    const linePrice = document.createElement("strong");
    linePrice.className = "cart-line-price";
    linePrice.textContent = currency.format(item.price * item.quantity);
    line.append(details, linePrice);
    cartItems.append(line);
  });

  const delivery = itemCount > 0 ? 2.99 : 0;
  const tax = (subtotal + delivery) * 0.08;
  const total = subtotal + delivery + tax;
  const hasItems = itemCount > 0;

  cartCount.textContent = String(itemCount);
  document.querySelector("#cart-item-label").textContent =
    `(${itemCount} ${itemCount === 1 ? "item" : "items"})`;
  document.querySelector("#cart-empty").hidden = hasItems;
  document.querySelector("#cart-totals").hidden = !hasItems;
  document.querySelector("#cart-subtotal").textContent = currency.format(subtotal);
  document.querySelector("#cart-delivery").textContent = currency.format(delivery);
  document.querySelector("#cart-tax").textContent = currency.format(tax);
  document.querySelector("#cart-total").textContent = currency.format(total);
  document.querySelector("#checkout-total").textContent = currency.format(total);
}

function createQuantityButton(label, action, id, text) {
  const button = document.createElement("button");
  button.className = "quantity-button";
  button.type = "button";
  button.dataset.cartAction = action;
  button.dataset.id = id;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
}

function showToast(message) {
  const toast = document.querySelector("#cart-toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function saveFavorites() {
  try {
    window.localStorage.setItem(
      favoriteStorageKey,
      JSON.stringify([...favorites]),
    );
  } catch (error) {
    console.error("Could not save QuickCrave favorites.", error);
    showToast("Your favorites could not be saved on this device.");
  }
}

function updateFavoriteButtons() {
  document.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
    const id = button.dataset.id;
    const dish = dishesById.get(id);
    if (!dish) return;

    const isFavorite = favorites.has(id);
    const name = dish.querySelector("[data-add-to-cart]").dataset.name;
    button.classList.toggle("is-favorite", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute(
      "aria-label",
      `${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} favorites`,
    );
    button.textContent = isFavorite ? "♥" : "♡";
  });
}

function renderFavorites() {
  favoritesGrid.replaceChildren();

  favorites.forEach((id) => {
    const dish = dishesById.get(id);
    if (!dish) return;

    const card = dish.cloneNode(true);
    card.dataset.favoriteCopy = "true";
    favoritesGrid.append(card);
  });

  favoritesCount.textContent = String(favorites.size);
  favoritesEmpty.hidden = favorites.size > 0;
  updateFavoriteButtons();
}

function setMenuOpen(isOpen) {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu",
  );
  navigationMenu.classList.toggle("is-open", isOpen);
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  setMenuOpen(!isExpanded);
});

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navigationLinks.forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
    setMenuOpen(false);
  });
});

menuFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const category = filter.dataset.filter;

    menuFilters.forEach((item) => {
      const isSelected = item === filter;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    dishCards.forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const favoriteButton = event.target.closest("[data-favorite-toggle]");
  if (favoriteButton) {
    const { id } = favoriteButton.dataset;
    const dish = dishesById.get(id);
    if (!dish) {
      console.error("Cannot update a favorite with an unknown dish ID.", id);
      return;
    }

    const name = dish.querySelector("[data-add-to-cart]").dataset.name;
    if (favorites.has(id)) {
      favorites.delete(id);
      showToast(`${name} removed from your favorites.`);
    } else {
      favorites.add(id);
      showToast(`${name} added to your favorites.`);
    }

    saveFavorites();
    renderFavorites();
    return;
  }

  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;

  const { id, name, restaurant, price: rawPrice } = button.dataset;
  const price = Number(rawPrice);

  if (!id || !name || !restaurant || !Number.isFinite(price) || price <= 0) {
    console.error("Cannot add a menu item with invalid product details.", button);
    showToast("Sorry, this dish could not be added.");
    return;
  }

  const item = cart.get(id);
  if (item) {
    item.quantity += 1;
  } else {
    cart.set(id, { name, restaurant, price, quantity: 1 });
  }

  renderCart();
  showToast(`${name} added to your cart.`);
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;

  const { cartAction, id } = button.dataset;
  const item = cart.get(id);
  if (!item) return;

  if (cartAction === "increase") {
    item.quantity += 1;
  } else if (cartAction === "decrease" && item.quantity > 1) {
    item.quantity -= 1;
  } else if (cartAction === "remove" || cartAction === "decrease") {
    cart.delete(id);
  }

  renderCart();
});

document.querySelector("#cart-open").addEventListener("click", () => {
  showCartView();
  renderCart();
  cartDialog.showModal();
});

document.querySelectorAll("[data-close-cart]").forEach((button) => {
  button.addEventListener("click", () => cartDialog.close());
});

cartDialog.addEventListener("close", () => {
  document.querySelector("#checkout-form").reset();
  showCartView();
});

document.querySelector("#checkout-start").addEventListener("click", () => {
  if (cart.size === 0) return;
  document.querySelector("#cart-view").hidden = true;
  document.querySelector("#checkout-form").hidden = false;
  document.querySelector("#customer-name").focus();
});

document.querySelector("#back-to-cart").addEventListener("click", showCartView);

document.querySelector("#checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#customer-name").value.trim();
  if (!name || cart.size === 0) return;

  const orderTotal = document.querySelector("#cart-total").textContent;
  document.querySelector("#confirmation-title").textContent = `You're all set, ${name}!`;
  document.querySelector("#confirmation-message").textContent =
    `Your demo order total is ${orderTotal}. No restaurant was notified and no payment was taken.`;
  document.querySelector("#cart-view").hidden = true;
  document.querySelector("#checkout-form").hidden = true;
  document.querySelector("#checkout-confirmation").hidden = false;
  cart.clear();
  renderCart();
});

document.querySelector("#finish-checkout").addEventListener("click", () => {
  cartDialog.close();
});

document.querySelector("#partner-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const restaurantName = document.querySelector("#partner-name").value.trim();
  if (!restaurantName) return;

  document.querySelector("#partner-status").textContent =
    `Thanks for introducing ${restaurantName}! This demo form doesn't send your details.`;
  event.currentTarget.reset();
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuToggle.getAttribute("aria-expanded") === "true"
  ) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    setMenuOpen(false);
  }
});

renderFavorites();
