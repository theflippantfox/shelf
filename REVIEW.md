# Shelf POS — Complete UI & Design Review

> A thorough audit of every visual, interaction, layout, and design-system detail in the Shelf web application.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Typography](#2-typography)
3. [Color & Palette System](#3-color--palette-system)
4. [Spacing, Radius & Shadows](#4-spacing-radius--shadows)
5. [Animations & Motion](#5-animations--motion)
6. [Layout Architecture](#6-layout-architecture)
7. [Navigation](#7-navigation)
8. [Header](#8-header)
9. [UI Component Catalog](#9-ui-component-catalog)
10. [Charts & Data Visualisation](#10-charts--data-visualisation)
11. [Page-by-Page Review](#11-page-by-page-review)
12. [Auth Flow & Login](#12-auth-flow--login)
13. [Responsive Behaviour](#13-responsive-behaviour)
14. [Accessibility](#14-accessibility)
15. [Offline & Sync UX](#15-offline--sync-ux)
16. [Command Palette](#16-command-palette)
17. [Theming & Dark Mode](#17-theming--dark-mode)
18. [Strengths](#18-strengths)
19. [Issues & Recommendations](#19-issues--recommendations)

---

## 1. Design System Foundation

Shelf uses a **custom CSS-variable-driven design system** — no Tailwind UI kit, no third-party component library. Every colour, radius, shadow, and transition is expressed through CSS custom properties on `:root` / `.dark`, making the entire palette hot-swappable at runtime.

**Token map (22 core tokens):**

| Token | Purpose |
| --- | --- |
| `--bg` | Page background |
| `--surface` | Card / sheet background |
| `--surface2` | Raised surface (input bg, hover) |
| `--inset` | Sunken / inset surface |
| `--border` | Hairline borders |
| `--text` | Primary text |
| `--text-2` | Secondary text |
| `--text-3` | Tertiary / muted |
| `--primary` | Brand primary |
| `--primary-dim` | Primary at 12% on bg |
| `--primary-fg` | Text on primary fill |
| `--primary-mid` | Primary mid-tone for hover |
| `--shadow-sm / --shadow-md / --shadow-lg` | 3-level elevation system |
| `--radius-sm / --radius-md / --radius-lg / --radius-pill / --radius-full` | 5 radius tokens |
| `--transition-fast / --transition-base / --transition-slow` | 3 speed tiers |
| `--gold / --cobalt / --crimson / --teal / --violet / --lime` | 6 vibrant accent colours |

**Six semantic accent colours** beyond the primary:

- `--gold` (#D4A017) — warnings, alerts, low stock, P0 priority
- `--cobalt` (#3B5FD9) — info, links, tags
- `--crimson` (#DC3545) — errors, destructive, void, P1
- `--teal` (#0D9488) — success, refunds, active, P2
- `--violet` (#7C3AED) — personal, favourites, P3
- `--lime` (#65A30D) — neutral notes, P4

Each accent has a full ramp: `--{name}`, `--{name}-dim`, `--{name}-fg`.

**Assessment:** Clean, well-structured token system. The three-tier surface model (`bg → surface → surface2/inset`) creates good depth without heavy shadows. The accent system is mature with consistent semantics across all components.

---

## 2. Typography

**Font families (3):**

| Token | Font | Use |
| --- | --- | --- |
| `--font-sans` | DM Sans (700, 500, 400) | Body text, headings, UI |
| `--font-display` | Outfit (600) | Large dashboard headings |
| `--font-mono` | DM Mono (500, 400) | Barcodes, SKU codes |

**Type scale:**

| Class | Size | Weight | Use |
| --- | --- | --- | --- |
| `text-display` | 28px | 700 | Page hero titles |
| `text-heading` | 18px | 700 | Section headers |
| `text-title` | 15px | 600 | Card titles |
| `text-body` | 13px | 400 | Body text |
| `text-caption` | 11px | 500 | Captions, metadata |
| `text-tiny` | 10px | 600 | Uppercase labels, overlines |

**Assessment:** The type scale is compact and well-suited for a dense POS interface. The jump from `text-body` (13px) to `text-title` (15px) is only 2px — appropriate for data-heavy screens. The `text-display` class at 28px is used sparingly (only dashboard heading) which is correct. The use of `tabular-nums` for financial figures is a strong detail.

One concern: the `text-display` font-size hardcodes `letter-spacing: -0.02em` which may not render consistently across all Android WebView environments.

---

## 3. Color & Palette System

### 3.1 Palette Architecture

The system supports **10 user-selectable palettes**, each with complete light and dark mode token sets:

| Palette | Accent | Vibe |
| --- | --- | --- |
| Graphite & Mint | `#10B981` | Fintech-modern (default) |
| Ink & Gold | `#C9A875` | Editorial, boutique |
| Mist & Violet | `#A855F7` | Soft magenta |
| Ocean Cobalt | `#06B6D4` | Coastal, airy |
| Forest & Linen | `#65A30D` | Olive, muted |
| Rose & Clay | `#E11D48` | Deep rose |
| Sandstone | `#D97706` | Warm sand |
| Slate Mono | `#52525B` | True grayscale |
| Sapphire | `#6366F1` | Deep indigo |
| Sunset Coral | `#F97316` | Warm orange |
| Emerald Noir | `#14B8A6` | Teal, luxe |

**Each palette defines 21 tokens** including separate sidebar tokens (`sidebarBg`, `sidebarText`, `sidebarMuted`, `sidebarActive`, `sidebarAccent`).

### 3.2 Category Colors

A curated 40-color palette for product categories, organized by hue families (Purple/Pink, Blue, Green, Yellow/Orange, Red/Crimson, Brown/Earth, Teal/Cyan, Gray/Slate, Indigo/Violet). Each color is designed to work on both light and dark surfaces.

### 3.3 Assessment

This is an **exceptionally well-designed** palette system. The separation of sidebar tokens from main tokens allows the sidebar to maintain its own colour identity (always dark in most palettes) regardless of the page theme. The 10 palettes offer genuine variety — from the near-monochrome Slate Mono to the vibrant Rose & Clay.

The Graphite & Mint default is a strong choice — it reads as professional and modern without being personality-heavy.

---

## 4. Spacing, Radius & Shadows

### 4.1 Spacing Scale

The project uses Tailwind's default spacing scale. Key values observed in components:

- **Page padding:** `p-5` (20px) on mobile, `p-6 md:p-8` (24px → 32px) on desktop
- **Card padding:** `p-3.5` to `p-5` depending on density
- **Component gaps:** `gap-2` (8px) to `gap-4` (16px)
- **Inline spacing:** `gap-1.5` (6px) to `gap-3` (12px)

### 4.2 Radius Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 6px | Small elements (badges, chips) |
| `--radius-md` | 10px | Cards, inputs, buttons |
| `--radius-lg` | 14px | Modals, sheets, large cards |
| `--radius-pill` | 100px | Pill badges, buttons, tabs |
| `--radius-full` | 50% | Circular elements (avatar, fab) |

### 4.3 Shadow System

| Token | Use |
| --- | --- |
| `--shadow-sm` | Subtle card lift |
| `--shadow-md` | Dropdown, popover, sheet |
| `--shadow-lg` | Modal, FAB |

All shadows use `rgba(0,0,0,0.10)` — light enough to not fight with the palette, dark enough to create depth.

**Assessment:** The five-tier radius system is more than most POS apps need but it's used consistently. The pill radius for buttons and badges creates a friendly, modern feel. The shadow system is conservative (only 3 levels) which is appropriate — POS interfaces benefit from being visually flat.

---

## 5. Animations & Motion

### 5.1 Transition Speeds

| Token | Duration | Use |
| --- | --- | --- |
| `--transition-fast` | 120ms | Hovers, focus rings, micro-interactions |
| `--transition-base` | 200ms | Modal open/close, nav transitions |
| `--transition-slow` | 350ms | Page transitions, sheet slide |

### 5.2 Keyframe Animations

| Animation | Use |
| --- | --- |
| `shimmer` | Skeleton loading placeholders |
| `fade-in` | General opacity entrance |
| `slide-up` | Bottom-sheet and modal entrance |
| `scale-in` | Confirm modal pop-in |
| `spin` | Spinner rotation |
| `slide-in-right` | Toast notification entrance |
| `slide-out-right` | Toast exit |
| `top-progress` | Navigation loading bar |
| `dot-pattern` | Auth background dots |
| `ambient-glow` | Auth card ambient glow |
| `drawer-open` | Sheet slide-down |
| `drawer-close` | Sheet slide-up |
| `kpi-enter` | KPI card stagger entrance |

### 5.3 Stagger Animations

The product grid uses a CSS stagger pattern:

```css
.anim-stagger > * {
  opacity: 0; transform: translateY(6px);
  animation: fade-in 0.4s ease-out forwards;
}
.anim-stagger > *:nth-child(1) { animation-delay: 0.04s; }
.anim-stagger > *:nth-child(2) { animation-delay: 0.08s; }
/* ... up to :nth-child(15) */
```

### 5.4 NumberFlow Component

A custom animated number counter that tweens from old value to new value using `easeOutQuart`, with `requestAnimationFrame` for smooth 60fps animation.

### 5.5 Assessment

The motion design is polished and consistent. The three-tier speed system prevents the common mistake of having all transitions be the same duration. The stagger animation on the product grid is a particularly nice touch that makes the interface feel alive.

**Reduced motion:** The top progress bar respects `prefers-reduced-motion: reduce`, but other animations (shimmer, slide-up, fade-in) do not. This is a gap.

---

## 6. Layout Architecture

### 6.1 Desktop Layout

```
┌──────────┬──────────────────────────────┐
│          │  Header (breadcrumbs, etc.)   │
│ Sidebar  ├──────────────────────────────┤
│ (224px)  │                              │
│ Fixed    │     Page Content             │
│          │     (scrollable)             │
│          │                              │
└──────────┴──────────────────────────────┘
```

- **Sidebar:** Fixed 224px wide, dark background (`var(--sidebar-bg)`), full height, hides on mobile
- **Main area:** `pl-[224px]` to offset sidebar, `pt-[60px]` for fixed header
- **Header:** 60px tall, fixed at top, contains breadcrumbs + actions

### 6.2 Mobile Layout

```
┌──────────────────────────────┐
│  Header (breadcrumbs)        │
├──────────────────────────────┤
│                              │
│     Page Content             │
│     (scrollable)             │
│                              │
├──────────────────────────────┤
│  Bottom Nav (48px)           │
│  [🏠] [📦] [🛒 FAB] [👥] [⋯]│
└──────────────────────────────┘
```

- Bottom nav replaces sidebar on `<768px`
- FAB (Floating Action Button) sits in the center of bottom nav for quick POS access
- Page content has `pb-[80px]` bottom padding to avoid FAB overlap

### 6.3 Auth Layout

```
┌──────────────────────────────┐
│     (dot pattern background) │
│                              │
│   ┌──────────────────────┐   │
│   │   Brand Mark "S"     │   │
│   │   Shelf              │   │
│   │                      │   │
│   │   [Login Form]       │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

- Centered card with `max-w-sm` (384px)
- Ambient radial glow behind card
- Dot pattern background (`radial-gradient(circle, var(--primary) 1px, transparent 1px)`)
- Full viewport height

### 6.4 App Layout Root Structure

The root layout orchestrates:

1. **TopProgress** — thin loading bar during SvelteKit navigation
2. **Toast** — notification toasts
3. **OfflineIndicator** — sticky offline banner
4. **CommandBar** — keyboard shortcut-driven command palette
5. **SyncBadge** — sync status indicator
6. Realtime subscriptions (Supabase channel for `sales` table inserts)

**Assessment:** The layout is clean and follows the established pattern for admin/POS dashboards. The 224px sidebar is slightly wider than typical (180-200px) which gives the nav items room to breathe. The mobile bottom nav with FAB is well-implemented.

---

## 7. Navigation

### 7.1 Sidebar Navigation

**Structure:** The sidebar uses a grouped section model with 6 sections:

| Section | Items |
| --- | --- |
| *(Brand)* | "S Shëlf." logo |
| Main | Dashboard, POS |
| Stock | Inventory, Restock |
| Customers | Customers |
| Records | Sales History, Analytics |
| Config | Settings |

**Visual details:**

- Active state: `var(--sidebar-active)` background + 3px `var(--sidebar-accent)` left border (pill shape)
- Muted text: `var(--sidebar-muted)`
- Hover: lighter muted colour
- Icon size: 18px, stroke-width 1.75 (Lucide icons)
- Section headers: `text-[10px]` uppercase with letter-spacing

### 7.2 Bottom Navigation (Mobile)

- 5 items: Dashboard, Inventory, **POS (FAB)**, Customers, More
- The POS button is elevated as a **circular FAB** (56×56px, `var(--primary)` bg, 3px scale on press)
- Labels: `text-[10px]`, icons: 20px
- Active state: primary colour + bold label
- Hover: `--surface2` background on non-active items
- Uses `use:enhance` for SPA-style transitions (no full page reloads)

### 7.3 Breadcrumbs

- Uses Lucide icons (not chevrons) between breadcrumb segments
- Last segment is always plain text (no link)
- Separator: `ChevronRight` icon at 12px

### 7.4 Assessment

The navigation is well-structured with clear information hierarchy. The FAB for POS is an excellent mobile pattern — it makes the primary action (selling) the most prominent touch target. The grouped sidebar sections help with cognitive load.

**Minor issue:** The sidebar sections don't have visible section headers on desktop — the grouping is implicit. Adding subtle section dividers or labels could improve scannability for new users.

---

## 8. Header

### 8.1 Desktop Header

```
┌──────────────────────────────────────────────────┐
│ 📋 Sales History    [Filter ▾] [Export ↓] [Shop ▾]│
│    /analytics/sales                    [☀] [🔔] [⟳]│
└──────────────────────────────────────────────────┘
```

**Components (left to right):**

1. **Page icon** — 16px, `var(--text-3)` colour
2. **Page title** — `text-[13px]` font-semibold
3. **Breadcrumb trail** — below title, `text-[11px]`
4. **Page actions** — slot for page-specific buttons (filters, export, etc.)
5. **SyncBadge** — shows sync status (green check, orange spinner, red error)
6. **Shop switcher** — avatar + shop name + caret
7. **Theme toggle** — Sun/Moon/Monitor icons
8. **Notifications** — BellDot icon with "!" badge for pending credits
9. **Command palette trigger** — keyboard icon (`Command` size 14)

### 8.2 Mobile Header

- Simplified: back arrow + title + theme toggle + notification bell
- No shop switcher (moved to Settings)
- Back arrow appears on non-root pages
- Bottom border: `border-b border-[var(--border)]`

### 8.3 Assessment

The header is information-dense but well-organized. The left-aligned breadcrumbs with right-aligned actions is the standard pattern. The shop switcher in the header is a nice touch for multi-shop users.

---

## 9. UI Component Catalog

### 9.1 Button

**Variants:** `primary`, `secondary`, `ghost`, `danger`
**Sizes:** `xs` (h-7), `sm` (h-8), `md` (h-9), `lg` (h-10)
**Features:**

- Inline SVG loading spinner replaces icon on `loading` state
- `iconOnly` mode for square icon buttons
- Focus ring: `0 0 0 2px var(--bg), 0 0 0 4px var(--primary)`
- All transitions use `--transition-fast` (120ms)

### 9.2 Input

**Features:**

- Label with required asterisk (crimson colour)
- Hint text (below input)
- Error state with `input-error` class
- Character counter
- Left icon slot (absolute positioned)
- Prefix/suffix text
- Focus ring: `0 0 0 2px var(--bg), 0 0 0 4px var(--primary)`

### 9.3 PasswordInput

- Toggle visibility button (Eye/EyeOff icons)
- `autocomplete="current-password"` attribute

### 9.4 Card

**Variants:** `default`, `surface`, `accent`, `primary`, `danger`

- `default`: Standard card with border + shadow
- `surface`: Flat card (no border, bg = `--surface2`)
- `accent`: Gold-tinted background for highlights
- `primary`: Primary-tinted background
- `danger`: Crimson-tinted background for errors

### 9.5 Badge

**Variants:** `default`, `primary`, `success`, `warning`, `danger`, `info`, `muted`
**Sizes:** `xs`, `sm` (default), `md`

- Each variant has a matching `--{variant}-dim` background and `--{variant}` text colour
- Rounded pill shape (`--radius-pill`)

### 9.6 Toggle

- 40×22px track, 16px circle knob
- Active: `var(--primary)` track, white knob
- Inactive: `var(--surface2)` track, `var(--border)` knob
- Smooth transition with `transform: translateX(18px)` for active state

### 9.7 Select

- Label, hint, error, character counter (same as Input)
- Custom chevron icon (14px)
- `appearance-none` with custom styling

### 9.8 SearchBar

- Debounced input (300ms)
- Search icon, clear button (X icon)
- Keyboard shortcut hint: `/` to focus
- Focus ring on container div
- Bottom sheet on mobile with backdrop

### 9.9 Sheet (Modal / Drawer)

**Modes:** `modal` (centered), `bottom-sheet` (slides from bottom)
**Features:**

- Close button (X icon)
- Custom CSS animations for open/close
- Backdrop click to close
- Keyboard: Escape to close
- Portal rendering (into `document.body`)
- Scroll lock on body when open
- Uses Svelte 5 runes (`$state`, `$effect`, `$props`, `$host`)

### 9.10 ConfirmModal

- Custom animated checkmark circle (green stroke drawing animation)
- Title + description + confirm/cancel buttons
- Uses Sheet component in modal mode

### 9.11 KpiCard

- Icon + value + label + trend indicator
- Animated number counter (NumberFlow)
- Sparkline chart (optional)
- Trend badge (up/down/flat with colour coding)
- Active state (left green accent border, elevated shadow)
- Loading skeleton state

### 9.12 StatTile

- Simpler variant of KpiCard (icon + value + label, no trend/sparkline)

### 9.13 Avatar

**Sizes:** `xs` (24px), `sm` (32px), `md` (40px), `lg` (48px), `xl` (64px)

- Fallback: initials extraction from name
- Background colour derived from name hash (consistent per-user)

### 9.14 Skeleton / Shimmer

- Base `.shimmer` class: moving gradient from `--surface` to `--surface2`
- `ProductCardSkeleton` matches exact card dimensions

### 9.15 Toast

- Fixed bottom-right position
- `slide-in-right` entrance animation
- Close button (X)
- Portal rendering

### 9.16 QtyInput

- Quantity input with +/- buttons
- Sync button (circular arrow icon)
- Auto-sync on value change with debounce

### 9.17 Stepper

- Visual step indicator with connecting lines
- Active: `--primary` background
- Completed: check mark
- Future: `--surface2` background

### 9.18 EmptyState

- Icon + title + description + optional action button

### 9.19 OfflineIndicator

- Sticky banner at top of page
- Yellow/amber background
- "Working Offline" + last sync time
- Manual sync button

### 9.20 SyncBadge

- Compact sync status indicator
- States: synced (green check), syncing (orange spinner), error (red alert)

### 9.21 BarcodeScanner

- Camera-based barcode scanning component

### 9.22 DynamicIcon

- Resolves Lucide icon by string name at runtime
- Fallback: "?" placeholder if icon not found

### 9.23 IconPicker

- 6-column grid of category icons
- Visual selection with `--primary-dim` background

### 9.24 ColorSwatch

- Circular colour picker
- Check icon on selected colour

### 9.25 NumberFlow

- Animated number counter using `requestAnimationFrame`
- Eases from old value to new value over 700ms
- `tabular-nums` font for proper number alignment

---

## 10. Charts & Data Visualisation

### 10.1 Chart Stack

All charts use **Chart.js** with lazy-loaded imports. Each chart component:

1. Registers Chart.js modules on mount
2. Observes theme changes via `MutationObserver` on `document.documentElement`
3. Uses `easeOutQuart` easing
4. Resolves CSS variables to actual hex values at runtime

### 10.2 BarChart

- Rounded top corners (`borderRadius: 6`)
- Custom tooltip matching design system
- `highlightLast` mode dims all bars except the latest
- Y-axis formatting: number / currency / count

### 10.3 AreaChart

- Multi-dataset support with gradient fills
- Gradient: 30% opacity at top → transparent at bottom
- Tension: 0.42 (smooth curves)
- Dashed line support for comparison datasets

### 10.4 DonutChart

- 72% cutout (thick donut)
- 4px border between segments
- Custom center label/value overlay
- Hover offset: 8px

### 10.5 HBarChart (Horizontal Bar)

- Auto-height based on data length
- Custom external tooltip via `mountChartTooltip` utility
- Tooltip auto-hide via `setupTooltipAutoHide` utility

### 10.6 Sparkline

- Tiny inline line chart (40px height default)
- No axes, no tooltips
- Gradient fill under the line
- Used in KpiCards and tables

### 10.7 Heatmap

- Pure HTML/CSS implementation (no Chart.js)
- 7 rows (days) × 24 columns (hours)
- Colour intensity: `color-mix(in srgb, var(--primary) ${pct}%, var(--surface2))`
- Hover: scale 1.1 + shadow
- Tooltip: native `title` attribute

---

## 11. Page-by-Page Review

### 11.1 Dashboard (`/`)

- Greeting with time-of-day (Good Morning/Afternoon/Evening)
- 4 KPI cards (Revenue, Total Sales, Avg Sale Value, Items Sold) with sparklines + trend badges
- Revenue bar chart (7-day rolling)
- Recent sales table (5 rows max, mobile-cards / desktop-table)
- Fetches from `GET /api/analytics?range=dashboard`

### 11.2 POS / Sale (`/sale`)

- Product search with barcode support
- Category filter pills
- Product grid with quick-add buttons
- "In Cart" badge on added products
- Cart panel (right side / bottom sheet on mobile)
- Subtotal, discount, tax, total calculation
- "Pay Now" button → payment sheet

### 11.3 Settings (`/settings`)

- Hub-and-spoke model: 7 section cards (Profile, Shop, Users, Roles, Appearance, Currency, Advanced)
- Each card navigates to detail page

### 11.4 Inventory (`/inventory`)

- Product table with: Product, SKU, Price, Stock, Category, Status
- Status badges: Active, Inactive, Low Stock, Out of Stock
- Search + category filter + status filter
- Mobile: card-based layout

### 11.5 Sales History (`/history`)

- Sales table with: Sale ID, Date, Items, Total, Payment, Cashier
- Search + date range filter + payment method filter
- Export button

### 11.6 Customers (`/customers`)

- Customer table with: Name, Email, Phone, Total Spent, Last Visit, Tags
- Search + tag filter

### 11.7 Analytics (`/analytics`)

- Period selector (Today, 7D, 30D, 90D, 12M)
- Revenue area chart
- Top products horizontal bar chart
- Category performance donut chart
- Sales heatmap (hour × day)

### 11.8 Restocking (`/restock`)

- Purchase order management
- Status tracking (Draft → Ordered → Received)

---

## 12. Auth Flow & Login

**Visual:**

- Dot pattern background (`radial-gradient(circle, var(--primary) 1px, transparent 1px)` at 20px spacing)
- Ambient glow behind card (`radial-gradient(ellipse, var(--primary) 0%, transparent 70%)`)
- Centered card (max-width 384px)
- Brand mark: "S" in `text-display` + "Shelf" in `text-heading`
- Tagline: "Smart Point of Sale"

**Form:**

- Email input with Mail icon
- Password input with toggle visibility
- "Sign in" button with loading state
- Error display in danger Card

---

## 13. Responsive Behaviour

| Element | Desktop | Mobile |
| --- | --- | --- |
| Navigation | Sidebar (224px) | Bottom nav (48px) |
| POS layout | Side-by-side | Stacked |
| Tables | Full table | Card-based |
| Search | Inline | Bottom sheet |
| KPI cards | 4-column grid | 2-column grid |
| Product grid | 4-column | 3-column |
| Settings | Grid of cards | Stack of cards |
| Sheet/Modal | Centered | Bottom sheet |

---

## 14. Accessibility

### Positive

- Semantic HTML (`nav`, `main`, `header`, `aside`, `section`, `article`)
- ARIA labels on icon-only buttons
- Focus management with `ring-focus` class
- Keyboard: Escape to close modals, `/` to focus search
- `aria-pressed` on toggle buttons
- `aria-hidden` on decorative skeleton elements

### Gaps

- No skip-to-content link
- No `aria-current="page"` on active nav items
- Charts lack text alternatives
- No `prefers-reduced-motion` handling for most animations
- Form errors lack `aria-live` announcements
- Bottom nav FAB may need explicit `aria-label`

---

## 15. Offline & Sync UX

- **OfflineIndicator:** Sticky yellow banner with "Working Offline — Last synced [time]" + Sync Now button
- **SyncBadge:** Compact header indicator (green check / orange spinner / red error)
- **Realtime:** Supabase channel subscription for `sales` table INSERT events

---

## 16. Command Palette

- Trigger: `Ctrl+K` / `Cmd+K` or keyboard icon in header
- Search through all navigation items
- Fuzzy matching + keyboard navigation
- Results: icon + label + shortcut hint

---

## 17. Theming & Dark Mode

- Three-state toggle: Light → Dark → System
- Light mode: tokens on `:root`
- Dark mode: tokens on `.dark` class
- All charts rebuild on theme change via MutationObserver
- 10 palettes × 2 themes = 20 possible visual configurations

---

## 18. Strengths

1. **Design system maturity** — 22+ tokens, 10 palettes, consistent semantics
2. **Component consistency** — Shared radius, shadow, transition, colour tokens
3. **Mobile-first POS UX** — FAB for POS, bottom sheets, card views for tables
4. **Theme system** — 10 palettes with full light/dark support
5. **Chart design** — Premium feel with gradient fills and theme-aware rebuilding
6. **Offline awareness** — Two-level sync status system
7. **Animation polish** — Stagger animations, number tweening, skeletons
8. **Compact type scale** — Appropriate for dense POS data
9. **Category customization** — Icon picker + 40-colour palette
10. **Command palette** — Power-user efficiency feature

---

## 19. Issues & Recommendations

### Critical

1. **No `prefers-reduced-motion` support** — Most animations don't respect reduced motion preference

### High Priority

2. **Chart flash on theme toggle** — Charts destroy/rebuild causing visual flash; consider incremental `chart.update()`
2. **Missing `aria-live` on form errors** — Errors aren't announced to screen readers
3. **No `aria-current="page"` on active nav** — Active state is visual-only

### Medium Priority

5. **Sidebar section headers invisible** — Grouping is implicit; add subtle dividers
2. **Mobile bottom nav FAB accessibility** — May need explicit `aria-label`
3. **Chart canvas text alternatives** — No accessible data table alternative

### Low Priority

8. **Font loading** — Consider self-hosting Google Fonts for offline reliability
2. **Toast position on mobile** — May conflict with bottom nav; consider top-positioned
3. **ContextMenu component missing** — Referenced but doesn't exist
