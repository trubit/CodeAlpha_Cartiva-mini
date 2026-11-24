# Cartiva Mini — Product Discovery UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Shop Page (`/shop`)

The Shop page (`frontend/src/pages/ShopPage.tsx`) provides comprehensive catalog browsing and filtering powered by the Phase 7 and Phase 9 backend APIs (`/api/v1/products`).

### Filtering Capabilities
- **Category Filter:** Interactive chips and sidebar options dynamically synchronized with active URL parameters (`?category=slug`).
- **Price Range Filter:** Min and Max numeric inputs with instant application.
- **Stock Availability Filter:**
  - `All Products`
  - `In Stock Only`
  - `Out of Stock`
- **Active Filter Chips:** Clear individual or all active filters with one click.
- **Sorting Options:**
  - `Relevance` (Default)
  - `Newest Arrivals`
  - `Price: Low to High`
  - `Price: High to Low`
  - `Customer Rating`

### Product Grid & Responsive Layout
- Desktop: 4 columns or 3 columns with sticky filter sidebar.
- Tablet: 2 or 3 columns.
- Mobile: 1 or 2 columns with an accessible slide-out Filter Drawer (`Open Filters` button).

---

## 2. Search Page (`/search`)

The Search page (`frontend/src/pages/SearchPage.tsx`) handles dedicated customer search queries backed by the Phase 9 search engine (`/api/v1/products/search`).

### Key Features
- **Query Indicator:** Displays search term and match count (e.g., `Showing results for "Sneakers" (14 items found)`).
- **Server Facets:** Highlights matching category facets with count badges.
- **Empty State:** Helpful empty state when no matches are found, suggesting alternative keywords or directing customers to popular categories.
- **Debounced Autocomplete Integration:** Direct synchronization with Header live suggestions.
