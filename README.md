# QuickCrave

QuickCrave is a responsive food-delivery website concept built as a frontend internship project. It helps people discover meals from neighborhood restaurants, save dishes they like, and preview an order in a simple checkout flow.

> **Project status:** This is a front-end demonstration, not a live ordering service. Restaurant information and menu items are sample content. Orders and restaurant enquiries are not sent to a business, and the checkout does not take payment.

## Project idea

QuickCrave is based on the idea that a food-delivery experience can do more than list restaurants: it can make discovering local food feel inviting, quick, and personal. The concept focuses on connecting customers with independent neighborhood restaurants through an easy-to-browse menu and familiar, friendly visual identity.

The brand promise is **“Big flavor. Zero waiting.”** Warm cream backgrounds, citrus-orange accents, appetizing food photography, rounded cards, and short interactions give the site an energetic food personality without making the interface feel busy.

## Project goals

- Build a polished, responsive marketing and menu experience using browser-native frontend technologies.
- Organize the page so visitors can understand the service, explore dishes, and try the ordering flow.
- Practice semantic HTML, responsive CSS, DOM updates, event handling, local storage, and accessibility basics.
- Keep the difference between a working front-end demo and a production ordering platform clear.

## Website sections

1. **Navigation:** QuickCrave branding, links to the main sections, a mobile/tablet menu, a favorites count, and a cart button.
2. **Hero:** The service promise, calls to action, food photography, and short delivery/quality messages.
3. **Explore menu:** Eight sample dishes with photos, restaurant names, categories, ratings, prices, estimated preparation times, and add-to-cart buttons.
4. **Favorites:** A saved-dishes area linked from the navigation. It shows an empty-state message until meals are saved.
5. **How it works:** A three-step explanation of browsing, adding meals to a cart, and receiving a delivery.
6. **Our story:** The fictional brand’s focus on neighborhood restaurants and local food.
7. **Restaurant partners:** A sample enquiry form and information for restaurant owners.
8. **Footer:** Section links, partner links, and a dynamically updated copyright year.
9. **Cart and checkout dialog:** A modal cart with editable quantities, item removal, a cost summary, a delivery-details form, and a demo confirmation.

## Main interactions

### Browse and filter dishes

The menu can be filtered by category: everything, bowls, street food, burgers, or pizza and comfort food. Selecting a category updates the active filter and hides dishes outside that category.

### Save and remove favorites

The heart button on each dish toggles its favorite state. A saved dish appears in the Favorites section, and the number beside the Favorites navigation link updates. Pressing the heart again—from either the menu or the saved list—removes the dish. Favorites are saved in the browser's `localStorage`, so they remain on that browser after a reload.

### Add dishes and use the cart

“Add to cart” buttons add a dish or increase its quantity. The cart dialog lets visitors increase or decrease quantities and remove items. The displayed estimate uses the sample menu prices, a **$2.99 delivery fee** for non-empty carts, and **8% estimated tax** calculated on the subtotal plus delivery.

The cart itself is held in JavaScript memory and **does not persist after reloading the page**. Completing the checkout clears the cart and shows a demo confirmation; it does not place an order.

### Submit the restaurant form

The restaurant partner form uses browser form validation and displays an on-page acknowledgement after submission. It does not transmit or store the submitted details.

## Design and accessibility

- Responsive layouts adapt across desktop, tablet, and mobile screen sizes.
- The navigation collapses into an expandable menu at narrower widths.
- Food photography is paired with a warm cream, orange, and muted green palette.
- Cards, buttons, and links use hover/focus feedback; the hero meal image has an entrance animation.
- Native buttons and links, descriptive image text, visible keyboard focus, dialog semantics, and live status text support accessible interaction.
- A `prefers-reduced-motion` CSS rule reduces animations and transitions for visitors who request less motion.

The decorative food-outline background has been removed. The page now uses its clean cream background and food imagery to carry the visual theme.

## Technology

- **HTML5** for page structure and accessible form and dialog controls.
- **CSS3** for colors, layout, responsive breakpoints, visual effects, and motion.
- **Vanilla JavaScript** for navigation, filtering, favorites, cart calculations, checkout demo states, and form feedback.
- **Browser `localStorage`** for the favorites list only.
- **Unsplash image URLs** for the hero, menu, and story photography. An internet connection is needed to load these remote images.

There is no backend, database, payment provider, build system, package manager, or third-party JavaScript dependency in the current demo.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page content, menu data, forms, navigation, and cart/checkout dialog markup. |
| `styles.css` | Theme, responsive layouts, component styling, and reduced-motion behavior. |
| `script.js` | Navigation, menu filters, favorites persistence, cart behavior, demo checkout, and form feedback. |
| `favicon.svg` | QuickCrave browser-tab icon. |

## Run locally

The site uses no build step. Open `index.html` in a modern browser, or use the VS Code **Live Server** extension to serve it locally. Serving over localhost is recommended when testing browser storage and local development tools.

## Suggested demo walkthrough

1. Open the page at desktop width and review the hero and navigation.
2. Resize to a phone or tablet width and open/close the navigation menu.
3. Filter the sample menu to a category.
4. Save a meal, visit Favorites, remove it, then reload to demonstrate that saved favorites persist.
5. Add a meal to the cart, adjust its quantity, and review the total estimate.
6. Complete the demo checkout and point out that it takes no payment and sends no order.
7. Submit the restaurant partner form and show its local acknowledgement.

## Internship learning outcomes

This project provides practice with:

- Turning a product brief and brand concept into a multi-section page.
- Building responsive layouts with CSS Grid, Flexbox, and media queries.
- Using semantic elements, accessible labels, keyboard focus states, and ARIA attributes.
- Managing interactive UI state with JavaScript and event delegation.
- Persisting a small user preference with `localStorage`.
- Formatting prices and calculating cart totals.
- Communicating demo limitations and identifying what a production application still needs.

## Future work

Possible next steps for evolving the concept include:

- Add scroll-triggered fade/slide reveals while respecting reduced-motion preferences.
- Move sample restaurants and dishes into a data source or API.
- Add search, restaurant details, dietary information, and delivery-area selection.
- Persist carts if that is a desired product behavior.
- Connect partner enquiries and orders to a secure backend.
- Integrate real order status, delivery estimates, authentication, and a payment provider.
- Replace sample prices, ratings, and restaurant details with verified business data.
- Review image licensing, optimization, and hosting before any public production launch.

