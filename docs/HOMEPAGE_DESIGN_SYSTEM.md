# Cartiva Mini — Homepage Design System & Visual Identity

## 1. Design Direction & Commercial Benchmarks

The Cartiva Mini homepage redesign transitions the storefront from a basic utility interface into a luxury, editorial-grade commercial shopping destination. The aesthetic direction directly incorporates the visual qualities requested by the user, drawing inspiration from high-fashion editorial platforms (such as Aurel and Memento Mori):

- **Luxury Editorial Serifs:** `Playfair Display` serif headlines combined with clean `Inter` geometric sans-serif for UI clarity.
- **Curated Color Harmony:** Deep slate foundations, warm terracotta brand accents, crisp surfaces, and refined muted slate borders.
- **Frosted Glassmorphism:** Subtle translucent backdrops (`rgba(255, 255, 255, 0.7)` and `rgba(15, 23, 42, 0.65)`) with backdrop blur filters (`16px`) and delicate border lines (`1px solid rgba(255, 255, 255, 0.15)`).
- **Edge-to-Edge Visual Impact:** Immersive hero imagery with full-bleed photography and warm terracotta highlights.
- **Architectural Layout:** Bento-grid category displays and consistent product card elevations.

---

## 2. Color Palette & Design Tokens

### 2.1 Brand Tokens (`frontend/src/styles/theme.ts`)

```typescript
export const themeColors = {
  // Brand Accent (Terracotta)
  primary: '#ea580c', // Warm terracotta primary
  primaryHover: '#c2410c', // Deep terracotta hover
  primaryLight: '#fff7ed', // Soft terracotta wash
  primaryMuted: '#fb923c', // Secondary accent amber-orange

  // Foundation & Neutrals (Deep Slate)
  background: '#f8fafc', // Off-white airy page background
  surface: '#ffffff', // Pure white card surfaces
  surfaceDark: '#0f172a', // Luxury midnight slate footer & hero dock
  surfaceDeep: '#020617', // True dark base

  // Text Colors
  textPrimary: '#0f172a', // High-contrast ink text
  textSecondary: '#475569', // Secondary body text
  textMuted: '#94a3b8', // Helper notes & captions
  textInverse: '#ffffff', // White text on dark surfaces

  // Border & Dividers
  borderSubtle: '#e2e8f0', // Hairline container borders
  borderGlass: 'rgba(255, 255, 255, 0.18)',

  // Status & Feedback
  success: '#16a34a', // In-stock & free shipping green
  warning: '#f59e0b', // Low-stock amber
  error: '#dc2626', // Error crimson
};
```

---

## 3. Typography Hierarchy

| Level                  | Font Family             | Size                          | Weight           | Line Height | Usage                                            |
| :--------------------- | :---------------------- | :---------------------------- | :--------------- | :---------- | :----------------------------------------------- |
| **Hero Display**       | Playfair Display, serif | 3.5rem (56px) / 2.5rem mobile | 700 / 600 italic | 1.15        | Main hero title (_"Designed for Modern Living"_) |
| **Section H2**         | Playfair Display, serif | 2.25rem (36px)                | 700              | 1.25        | _"Curated Arrivals"_, _"Departments"_            |
| **Card H3 / Subtitle** | Inter, sans-serif       | 1.125rem (18px)               | 600              | 1.4         | Product card titles, Department titles           |
| **Body Primary**       | Inter, sans-serif       | 1.0rem (16px)                 | 400              | 1.6         | Supporting descriptions, hero subtext            |
| **Label / Accent**     | Inter, sans-serif       | 0.8125rem (13px)              | 600              | 1.2         | Badges, pills, navigation links                  |
| **Price Display**      | Inter, sans-serif       | 1.125rem (18px)               | 700              | 1.2         | Active prices with strike-through sale values    |

---

## 4. Reusable Surface & Glassmorphism Utilities (`frontend/src/styles/index.css`)

```css
/* Editorial Serif Heading */
.font-editorial {
  font-family: 'Playfair Display', Georgia, serif;
}

.italic-accent {
  font-style: italic;
  font-weight: 500;
  color: #ea580c;
}

/* Luxury Frosted Glass */
.glass-panel-dark {
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.glass-panel-light {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}
```

---

## 5. Accessibility & Responsive Standards

- **Color Contrast:** All body and header text complies with WCAG 2.1 AA standards (minimum 4.5:1 contrast against light and dark backgrounds).
- **Responsive Layout:** Adaptive breakpoints at 640px (mobile), 768px (tablet), 1024px (desktop), and 1280px (wide desktop).
- **Touch Targets:** Buttons and navigation interactive targets adhere to minimum 44×44px hit areas.
- **Semantic Structure:** Single `<h1>` on homepage with logical `<h2>` and `<h3>` document outline.
