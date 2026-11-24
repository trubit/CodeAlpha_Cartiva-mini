# Cartiva Mini — Centralized Design System (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Visual Identity & Design Direction

The Cartiva Mini customer experience uses a premium commercial shopping aesthetic inspired by modern, trustworthy retail platforms:
- **Clean & Luxurious:** Clean surfaces, soft neutral backdrops, and generous whitespace.
- **Trustworthy & Authoritative:** Rich navy and royal blue palette communicating security and commercial stability.
- **Energetic & Focused:** Vibrant warm gold and yellow accents for promotions, badges, and primary calls-to-action.

---

## 2. Color Palette & Tokens

### Primary Palette
- **Deep Navy (`#101D3B`):** Main navigation bar, primary headings, dark surfaces, and footer.
- **Royal Blue (`#1557D5`):** Interactive links, secondary navigation chips, active tabs, and primary action buttons.
- **Warm Yellow / Gold (`#FFB900`):** "Shop Now" and "Buy Now" CTAs, best-seller badges, ratings, and promotional banners.
- **Soft Background (`#F5F7FC`):** Primary page background providing contrast for pure white cards.
- **Surface White (`#FFFFFF`):** Product cards, input fields, and elevated panels.
- **Border Slate (`#E2E8F0`):** Subtle card outlines and divider rules.

### Feedback States
- **Success (`#10B981`):** In-stock indicators, successful payments, delivered orders.
- **Warning (`#F59E0B`):** Low-stock alerts, pending payment verifications.
- **Error (`#EF4444`):** Out-of-stock chips, failed validations, destructive confirmations.
- **Info (`#3B82F6`):** General announcements and dispatch alerts.

---

## 3. Typography Scale

The design system uses modern system sans-serif typography (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`):

| Scale Token | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `h1` | 2.5rem (40px) | 900 | 1.15 | Hero headlines and primary marketing statements |
| `h2` | 2.0rem (32px) | 800 | 1.25 | Major page titles |
| `h3` | 1.6rem (25px) | 800 | 1.30 | Section headings (Categories, Best Sellers) |
| `h6` | 1.15rem (18px) | 700 | 1.40 | Card titles and modal dialog headings |
| `subtitle1` | 1.0rem (16px) | 600 | 1.50 | Supporting subtitles and emphasized labels |
| `body1` | 0.95rem (15px) | 400 | 1.60 | Standard body copy and product descriptions |
| `body2` | 0.85rem (13.6px) | 500 | 1.55 | Secondary information and metadata |
| `caption` | 0.75rem (12px) | 600 | 1.40 | Status tags, badge labels, and timestamps |

---

## 4. Reusable UI Components

1. **`ProductCard` (`frontend/src/components/common/ProductCard.tsx`):**
   - Rounded corners (`16px`), 1px slate border, hover elevation with smooth scale transition.
   - Dynamic badges for discounts, featured status, and stock availability.
   - Interactive wishlist toggle with live store synchronization.
   - Direct Add-to-Cart trigger with toast feedback.
2. **`CategoryCard` (`frontend/src/components/common/CategoryCard.tsx`):**
   - Soft pastel backgrounds (`#EEF4FF`, `#FFF7ED`, `#FEF3C7`, etc.).
   - Clean product count indicators and hover transform.
3. **`GlobalToast` (`frontend/src/components/common/GlobalToast.tsx`):**
   - MUI Snackbar rendering error, success, info, and warning states across all routes.
   - Completely replaces native browser `alert()`, `confirm()`, and `prompt()`.
