# Cartiva Mini — Frontend Accessibility & Usability (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Accessibility Compliance (WCAG 2.1 AA)

Cartiva Mini implements accessibility best practices across all customer-facing interfaces:

### Core Standards Implemented:
1. **Semantic HTML Structure:**
   - Single `<h1>` per page with logical heading hierarchies (`h1` -> `h2` -> `h3` -> `h6`).
   - Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`.
2. **Keyboard Navigation & Visible Focus:**
   - All interactive elements (buttons, inputs, links, dropdowns, accordions) are fully navigable via `Tab` and `Shift+Tab`.
   - Clear visual focus outlines with royal blue rings (`rgba(21, 87, 213, 0.4)`).
3. **Screen Reader Support:**
   - Descriptive `aria-label` attributes for icon-only action buttons (e.g., `aria-label="Add to Wishlist"`, `aria-label="Remove item"`, `aria-label="Open mobile navigation menu"`).
   - Form controls explicitly paired with descriptive labels or `inputProps={{ 'aria-label': '...' }}`.
4. **Color Contrast & Readability:**
   - High contrast ratios exceeding 4.5:1 for body copy (`#101D3B` and `#334155` on `#FFFFFF` and `#F5F7FC`).
   - Status indicators pair colors with icons and text labels (never relying solely on color).
5. **No Disruptive Browser Modals:**
   - In-app MUI `GlobalToast` alerts and accessible `Dialog` modals replace native browser `alert()` and `confirm()` dialogs.
