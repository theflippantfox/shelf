# Shelf POS — Flutter Design Guide

> A complete design system translation: taking Shelf's web design language (CSS-variable tokens, 10 palettes, chart system, motion) and re-expressing it as a clean, professional, phone-optimized Flutter design system.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Recommended Packages](#2-recommended-packages)
3. [Design Tokens → Flutter](#3-design-tokens--flutter)
4. [Color System & Palettes](#4-color-system--palettes)
5. [Typography](#5-typography)
6. [Spacing, Radius & Elevation](#6-spacing-radius--elevation)
7. [Motion & Animation](#7-motion--animation)
8. [Theme Architecture (Code Structure)](#8-theme-architecture-code-structure)
9. [Core Component Specs](#9-core-component-specs)
10. [Charts on Mobile](#10-charts-on-mobile)
11. [Navigation Shell (Mobile-First)](#11-navigation-shell-mobile-first)
12. [Screen-by-Screen Mobile Adaptation](#12-screen-by-screen-mobile-adaptation)
13. [Dark Mode & Theme Switching](#13-dark-mode--theme-switching)
14. [Accessibility](#14-accessibility)
15. [What to Change vs. the Web App](#15-what-to-change-vs-the-web-app)

---

## 1. Design Philosophy

The web app's strength is its token discipline — everything traces back to a small set of CSS variables. The Flutter app should carry that same discipline over, but adapt three things for phones specifically:

- **Touch-first density.** The web app is dense (13px body text, tight tables). On a phone, density has to yield to tap-target size. Target a **minimum 44×44dp** tap target everywhere, even inside dense list rows.
- **One-hand reachability.** Primary actions (Pay Now, Add to Cart, FAB) live in the **bottom third** of the screen, not the top. Sidebars become bottom nav; headers become slim app bars.
- **Native motion feel.** Instead of porting CSS keyframes 1:1, use Flutter's implicit animation widgets so transitions feel like platform-native gestures (spring-like, interruptible) rather than fixed-timeline CSS animations.

The result should feel like a **premium fintech app**, not "a website in a WebView." No component here is a Chart.js canvas or a `<table>` in disguise — each is rebuilt as a real Flutter widget with real physics.

---

## 2. Recommended Packages

| Package | Purpose | Replaces (web) |
| --- | --- | --- |
| `google_fonts` | DM Sans, Outfit, DM Mono | `@font-face` imports |
| `flutter_riverpod` (or `provider`) | Theme/palette state, app state | CSS variable swapping via `.dark` class |
| `fl_chart` | Bar / line / area / donut charts | Chart.js |
| `flutter_animate` | Declarative stagger, fade, slide animations | CSS keyframes + stagger classes |
| `shimmer` | Skeleton loading placeholders | `shimmer` keyframe |
| `cached_network_image` | Product images | `<img>` |
| `flutter_svg` | Icons/illustrations if not using Material icons | inline SVG |
| `intl` | Currency/number formatting, tabular figures | `tabular-nums`, `Intl.NumberFormat` |
| `local_auth` | Optional biometric login for POS terminals | — |
| `connectivity_plus` | Offline indicator | Supabase realtime + navigator.onLine |
| `supabase_flutter` | If backend is Supabase | Supabase JS client |
| `go_router` | Declarative nav, deep links, shell routes | Next/React Router |
| `flutter_slidable` | Swipe actions on list rows (delete/refund) | hover-only web actions |

---

## 3. Design Tokens → Flutter

Flutter has no native "CSS variable" concept, so tokens become a combination of:

- **`ThemeExtension`** classes for anything Material's `ThemeData` doesn't already model (surface tiers, semantic accents, radius scale, custom shadows).
- **`ColorScheme`** for anything Material already models well (primary, error, surface).
- **Plain `const` classes** for spacing and duration scales, since those don't need to react to theme changes.

### 3.1 Token Mapping Table

| Web Token | Flutter Equivalent | Notes |
| --- | --- | --- |
| `--bg` | `ColorScheme.background` / `Scaffold.backgroundColor` | |
| `--surface` | `ColorScheme.surface` | Card backgrounds |
| `--surface2` | `AppColorsExtension.surface2` | Custom extension — no Material equivalent |
| `--inset` | `AppColorsExtension.inset` | Custom extension |
| `--border` | `AppColorsExtension.border` or `DividerThemeData.color` | |
| `--text` / `--text-2` / `--text-3` | `TextTheme` colors at 3 opacity/shade tiers | Use `onSurface`, `onSurface.withOpacity(0.64)`, `.withOpacity(0.44)` |
| `--primary` / `-dim` / `-fg` / `-mid` | `ColorScheme.primary`, `.primaryContainer`, `.onPrimary`, custom `primaryMid` | |
| `--shadow-sm/md/lg` | `AppShadowsExtension` (List<BoxShadow>) | |
| `--radius-*` | `AppRadii` const class | `BorderRadius.circular(x)` |
| `--transition-*` | `AppDurations` const class | Used in `AnimatedContainer`, `AnimationController` |
| Accent colors (gold/cobalt/crimson/teal/violet/lime) | `AppAccentsExtension` | Each with base/dim/fg like the web ramp |

---

## 4. Color System & Palettes

### 4.1 Semantic Accents (carry over exactly — these are functional, not decorative)

| Accent | Hex | Meaning |
| --- | --- | --- |
| Gold | `#D4A017` | Warnings, low stock, P0 |
| Cobalt | `#3B5FD9` | Info, links, tags |
| Crimson | `#DC3545` | Errors, destructive, void, P1 |
| Teal | `#0D9488` | Success, refunds, active, P2 |
| Violet | `#7C3AED` | Favourites, personal, P3 |
| Lime | `#65A30D` | Neutral notes, P4 |

Each gets a 3-value ramp in Flutter, matching the web's `--{name}`, `--{name}-dim`, `--{name}-fg`:

```dart
class AppAccent {
  final Color base;
  final Color dim;   // ~12% opacity on background, for chip/badge fills
  final Color fg;    // text/icon color when placed on `base`
  const AppAccent({required this.base, required this.dim, required this.fg});
}
```

### 4.2 The 10 Palettes

Keep all 10 palettes, but implement them as a single `List<AppPalette>` the user picks from in Settings → Appearance, exactly like the web app. Each palette must define light **and** dark variants, plus its own sidebar/nav tokens (since the mobile bottom nav plays the sidebar's role and should keep its own identity regardless of page theme).

| Palette | Accent | Vibe |
| --- | --- | --- |
| Graphite & Mint (default) | `#10B981` | Fintech-modern |
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

**Mobile-specific palette token:** add a `navBg` / `navActive` / `navMuted` triad separate from `sidebarBg` — bottom nav bars read differently than side rails (shorter, closer to thumb, often need higher contrast against the home indicator area on iOS).

### 4.3 Category Colors

Port the 40-color category palette as-is; expose it as a `List<Color>` the product/category picker cycles through. On mobile, pair each with a rounded-square swatch (32×32dp) in the category editor rather than the web's swatch grid, for easier tapping.

### 4.4 Text Color Tiers (mobile contrast note)

Phones are viewed outdoors far more than desktop dashboards. Bump `--text-3` (tertiary/muted) contrast slightly versus the web value — target **WCAG AA on tertiary text**, not just primary/secondary, since low-stock counts and timestamps are often tertiary-styled but functionally important on a POS device.

---

## 5. Typography

### 5.1 Fonts (unchanged families, mobile-tuned scale)

| Role | Font | Web Weight(s) | Flutter `google_fonts` call |
| --- | --- | --- | --- |
| Body / UI | DM Sans | 400, 500, 700 | `GoogleFonts.dmSans()` |
| Display / Dashboard headings | Outfit | 600 | `GoogleFonts.outfit()` |
| Mono (barcodes, SKUs) | DM Mono | 400, 500 | `GoogleFonts.dmMono()` |

**Self-host, don't fetch at runtime.** The web review flags Google Fonts loading as a reliability gap; on Flutter, bundle the font files in `assets/fonts/` and register them in `pubspec.yaml` rather than using `google_fonts`' runtime-fetch mode — POS devices need to work in spotty back-of-store WiFi.

### 5.2 Type Scale — Mobile-Adjusted

The web scale is tuned for a dense desktop dashboard. On phones, bump the floor slightly so nothing dips below comfortable reading size at arm's length, and widen the gap between body and title so hierarchy reads at a glance:

| Style Name | Web Size | Flutter Size | Weight | Use |
| --- | --- | --- | --- | --- |
| `display` | 28px | **26sp** | 700 (Outfit, 600) | Page hero title (Dashboard greeting) |
| `heading` | 18px | **19sp** | 700 | Section headers |
| `title` | 15px | **16sp** | 600 | Card titles, product names |
| `body` | 13px | **14sp** | 400 | Body text |
| `caption` | 11px | **12sp** | 500 | Metadata, timestamps |
| `tiny` | 10px | **11sp** | 600, uppercase, +0.4 letter-spacing | Overlines, status labels |

Implement as a `TextTheme` extension so every screen pulls from `Theme.of(context).textTheme.titleMedium` etc. rather than hardcoding sizes.

### 5.3 Tabular Figures

Wrap every price, total, and quantity in a widget that forces tabular (monospaced-digit) rendering, matching the web's `tabular-nums` detail:

```dart
Text(
  formattedPrice,
  style: TextStyle(fontFeatures: [FontFeature.tabularFigures()]),
)
```

This single detail is disproportionately important for a POS app — it stops totals from jittering horizontally as digits update (paired with the NumberFlow-style counter in §7.4).

### 5.4 Letter-Spacing Fix

The web review flags `text-display`'s `-0.02em` letter-spacing as inconsistent on Android WebView. Since Flutter renders text natively (not via WebView), this isn't a bug that carries over — but keep the same visual intent: `letterSpacing: -0.3` (in logical px) on the `display` style, verified on both iOS and Android since native font metrics differ slightly between platforms.

---

## 6. Spacing, Radius & Elevation

### 6.1 Spacing Scale (4pt-based, matches Tailwind's scale conceptually)

| Token | Value | Use |
| --- | --- | --- |
| `space.xs` | 4dp | Icon-to-label gap |
| `space.sm` | 8dp | Inline chip gaps |
| `space.md` | 12dp | Default component gap |
| `space.lg` | 16dp | Card padding, list item padding |
| `space.xl` | 20dp | Screen edge padding (mobile) |
| `space.xxl` | 24dp | Section separation |

**Mobile note:** the web app uses 20–32px page padding depending on breakpoint. On phones, standardize on **16dp edge padding** for content-dense screens (Inventory, History) and **20dp** for lighter screens (Dashboard, Settings) — anything wider wastes precious width on a 360–430dp viewport.

### 6.2 Radius Tokens (unchanged values, direct port)

| Token | Value | Use |
| --- | --- | --- |
| `radius.sm` | 6dp | Badges, chips |
| `radius.md` | 10dp | Cards, inputs, buttons |
| `radius.lg` | 14dp | Bottom sheets, modals |
| `radius.pill` | 100dp | Pill buttons/tabs |
| `radius.full` | 50% | Avatars, FAB |

### 6.3 Elevation (shadow → Material elevation)

Flutter's Material 3 favors **tonal elevation** (surface tint) over drop shadows for a flatter, more modern look — which actually matches the web review's own conclusion that POS UIs benefit from staying visually flat. Recommend:

| Web Token | Flutter Approach |
| --- | --- |
| `--shadow-sm` (card lift) | Elevation 1, `surfaceTintColor` only — skip a hard shadow |
| `--shadow-md` (dropdown/sheet) | Elevation 3 + soft `BoxShadow(color: black @ 8%, blur: 12, offset: (0,4))` |
| `--shadow-lg` (modal/FAB) | Elevation 6 + `BoxShadow(color: black @ 10%, blur: 24, offset: (0,8))` |

Keep the web's `rgba(0,0,0,0.10)` ceiling — don't let mobile shadows get heavier than the web ones; the flat aesthetic is a strength, not a gap to "fix."

---

## 7. Motion & Animation

### 7.1 Duration Scale (direct port)

| Token | Duration | Curve | Use |
| --- | --- | --- | --- |
| `duration.fast` | 120ms | `Curves.easeOut` | Tap feedback, focus rings |
| `duration.base` | 200ms | `Curves.easeInOut` | Sheet/modal open, tab switches |
| `duration.slow` | 350ms | `Curves.easeOutCubic` | Screen transitions, sheet slide |

### 7.2 Respecting Reduced Motion (fixes a flagged web gap)

The web review calls out that only the top progress bar respects `prefers-reduced-motion`. Don't repeat that gap in Flutter — check `MediaQuery.of(context).disableAnimations` (mirrors iOS "Reduce Motion" / Android "Remove animations") globally in a single `AppMotion.duration()` helper that every widget calls instead of hardcoding `Duration(milliseconds: 200)` directly:

```dart
Duration appDuration(BuildContext context, Duration base) {
  return MediaQuery.of(context).disableAnimations ? Duration.zero : base;
}
```

### 7.3 Stagger Entrance (product grid, KPI cards)

Use `flutter_animate`'s `.animate().fadeIn().slideY()` with an `interval` parameter instead of hand-rolled `nth-child` delays:

```dart
GridView.builder(
  itemBuilder: (context, i) => ProductCard(product: products[i])
      .animate(delay: (40 * i).ms)
      .fadeIn(duration: 300.ms)
      .slideY(begin: 0.08, end: 0),
  ...
)
```

Cap the stagger at the first ~12 visible items (matches the web's 15-item cap) — beyond that, delay becomes perceptible lag rather than polish.

### 7.4 Animated Numbers (NumberFlow equivalent)

Port the tween-based counter using an `AnimationController` + `TweenAnimationBuilder<double>` with `Curves.easeOutQuart`, feeding formatted, tabular-figure text. Use for KPI card values, cart totals, and the running sale total — anywhere a number updates live in front of a cashier.

### 7.5 Screen & Sheet Transitions

- **Bottom sheets** (cart, filters, product detail): slide up over 350ms, `Curves.easeOutCubic`, matching the web's `slide-up` — this is the single most-used transition in a mobile POS, so it should feel the most refined.
- **Tab/page transitions**: prefer a subtle cross-fade + 4dp vertical shift over a full slide, so switching between Dashboard/Sale/Inventory feels calm rather than "navigating pages."
- **Toasts**: slide in from the **top**, not the side (see §15 — bottom is reserved for the nav bar and FAB on mobile).

---

## 8. Theme Architecture (Code Structure)

Recommended file layout so tokens stay as centralized as the web's CSS variables:

```
lib/
  theme/
    app_colors.dart        // ColorScheme builders per palette, light+dark
    app_palettes.dart       // The 10 AppPalette definitions
    app_accents.dart         // Gold/Cobalt/Crimson/Teal/Violet/Lime ramps
    app_category_colors.dart // 40-color category list
    app_text_theme.dart      // TextTheme builder (DM Sans/Outfit/DM Mono)
    app_radii.dart            // const radius values
    app_spacing.dart          // const spacing values
    app_shadows.dart          // ThemeExtension<AppShadows>
    app_durations.dart        // const Duration values + reduced-motion helper
    app_theme.dart            // Combines all of the above into ThemeData
  providers/
    theme_provider.dart       // Riverpod: current palette + brightness mode
```

`app_theme.dart` builds a `ThemeData` per (palette × brightness) combination — 10 palettes × 2 modes = 20 `ThemeData` instances, generated from data rather than hand-written, mirroring the web's "20 possible visual configurations" line item.

---

## 9. Core Component Specs

### 9.1 Buttons

| Variant | Style |
| --- | --- |
| Primary | Filled, `radius.pill`, `--primary` fill, `--primary-fg` text, 48dp min height |
| Secondary | Outlined, 1px `--border`, `radius.pill` |
| Destructive | Filled `crimson`, used for Void/Delete only |
| Icon button | 44×44dp tap target minimum, even if the icon itself is 20dp |
| FAB (POS quick-sale) | `radius.full`, `--shadow-lg`, bottom-right, thumb-reachable |

### 9.2 Cards

- `radius.md` (10dp), `--surface` fill, `--shadow-sm`.
- Padding: 16dp standard, 12dp for dense list-style cards (Inventory row-as-card on mobile).
- Tap target: entire card is tappable where it represents a navigable row (not just an icon inside it).

### 9.3 Badges / Status Pills

Direct port of the badge system: `radius.pill`, using the accent's `-dim` fill and `-fg`-tinted text (e.g., Low Stock → gold-dim background, gold text). Minimum height 24dp so text doesn't feel cramped at mobile DPI.

### 9.4 Inputs

- `radius.md`, `--surface2` fill (raised, not outlined-only — easier to spot on a bright store floor).
- 48dp min height (bigger than the web's compact inputs — fat-finger tolerance matters more on a register).
- Barcode/SKU fields use `DM Mono` and right-aligned tabular text.

### 9.5 Tables → Cards (the biggest structural change)

Every web `<table>` (Inventory, History, Customers) becomes a **card list** on mobile, not a horizontally-scrolling table:

- Primary field (Product name / Sale ID / Customer name) → `title` style, top line.
- 2–3 secondary fields → `caption` style, single row of chips/text below, truncated with `…`.
- Status → badge, top-right of the card.
- Swipe actions (`flutter_slidable`) replace hover-revealed row actions: swipe left for Delete/Void, right for Edit/Refund.

### 9.6 Bottom Sheets (replace most modals)

Any web "Modal" (centered dialog) becomes a **bottom sheet** on mobile — matches the responsive table in the review (§13) which already does this for Sheet/Modal. Use `showModalBottomSheet` with a **drag handle** at top, `radius.lg` on top corners only, and `isScrollControlled: true` for anything with a form inside (checkout, product edit).

### 9.7 Skeleton Loaders

Use the `shimmer` package with the same visual rhythm as the web's `shimmer` keyframe — grey `--surface2`-toned bars, not the default shimmer package colors. Respect reduced-motion by falling back to a static grey block.

### 9.8 Toasts

Top-anchored (see §7.5), auto-dismiss 4s, swipe-to-dismiss enabled, max one visible at a time (queue additional ones) — mobile screens can't afford toast stacking the way a desktop corner can.

---

## 10. Charts on Mobile

`fl_chart` maps cleanly onto the existing chart catalog:

| Web Chart | `fl_chart` Widget | Mobile Adjustment |
| --- | --- | --- |
| BarChart | `BarChart` | Reduce to max 7 bars visible without scroll; rotate labels 0°, not diagonal — abbreviate instead (Mon/Tue/Wed) |
| AreaChart | `LineChart` with `belowBarData` gradient | Keep 30%→0% opacity gradient fill; drop dashed comparison lines on phone width — show as a toggleable second series instead of simultaneous dashed overlay |
| DonutChart | `PieChart` with `centerSpaceRadius` ≈ 72% of radius | Center label/value overlay via `Stack`, same as web |
| Sparkline | `LineChart` with all axes/grid hidden | Keep 40dp height default; used in KPI cards and list rows |
| HBarChart | `BarChart` with `alignment: BarChartAlignment.spaceAround`, horizontal via rotated layout or a custom `Row`-based bar | Auto-height by data length, same as web |
| Heatmap | Custom `GridView` (not `fl_chart`) | Keep pure-widget approach; use `color-mix`-equivalent via `Color.lerp(surface2, primary, pct)`; replace hover-scale (no hover on touch) with a **tap-to-reveal tooltip** instead |

**Universal mobile chart rule:** every chart needs a **native accessible fallback** — a text summary or a data table view behind a "View as table" toggle. The web review flags "charts lack text alternatives" as a gap (§14) — don't inherit that gap into the new app; bake the fallback in from the start.

**Theme-change rebuild flash:** the web app rebuilds charts on theme toggle causing a flash (flagged as high-priority in §19). In Flutter, avoid this entirely by driving chart colors from `Theme.of(context)` inside the widget's `build()` — theme changes trigger a normal rebuild/repaint rather than a destroy/recreate cycle.

---

## 11. Navigation Shell (Mobile-First)

The web's sidebar (224dp) has no direct mobile equivalent — replace with:

- **Bottom navigation bar** (5 destinations max: Dashboard, Sale, Inventory, History, More) — `NavigationBar` (Material 3), height ~64dp, using the palette's `navBg`/`navActive`/`navMuted` tokens from §4.2.
- **FAB** docked center or end of the bottom bar for the POS quick-sale action — this is the single most-used action and deserves the most reachable position, not buried behind a nav tab.
- **"More" tab** absorbs anything that doesn't fit 4 primary destinations (Customers, Restocking, Settings, Analytics) as a bottom-sheet or full-screen menu — the web's 7-section Settings hub-and-spoke pattern (§11.3) works well ported directly as a full-screen grid under "More."
- **Command palette (`Ctrl+K`)** has no mobile keyboard-shortcut equivalent — replace with a persistent **search icon in the app bar** that opens the same fuzzy-search results in a full-screen search page, keeping the icon+label+destination result format from the web version.
- **`aria-current` gap fix:** the web app is missing an active-nav-item semantic marker (§14 gap). In Flutter, make sure the selected `NavigationDestination` sets `Semantics(selected: true)` — don't inherit that accessibility gap.

---

## 12. Screen-by-Screen Mobile Adaptation

| Screen | Web Layout | Mobile Adaptation |
| --- | --- | --- |
| **Dashboard** | 4-col KPI grid, bar chart, table | 2-col KPI grid (unchanged from web's own mobile breakpoint), full-width bar chart, sales list as cards, pull-to-refresh |
| **Sale/POS** | Side-by-side product grid + cart | Product grid (3-col) full-screen; cart as a **draggable bottom sheet** (peek height showing item count + total, drag up for full cart) rather than a separate stacked section |
| **Settings** | 7-card grid | Full-screen list (icon + label + chevron), grouped with subtle section dividers — this also fixes the web's flagged "sidebar section headers invisible" gap (§19) by making grouping explicit |
| **Inventory** | Full table | Card list (§9.5) with sticky search bar + filter chips row |
| **Sales History** | Table + export | Card list; Export moves into a top-right overflow menu (rare action, don't waste app-bar space) |
| **Customers** | Table | Card list with tag chips; tap → customer detail bottom sheet |
| **Analytics** | 4 chart types on one page | Tabbed or vertically-scrolled sections per chart, each full-width, since side-by-side charts don't fit phone width |
| **Restocking** | PO management + status | Card list grouped by status column (Draft/Ordered/Received) as horizontally-swipeable segments, or a segmented control filter |

---

## 13. Dark Mode & Theme Switching

- Same three-state model as web: **Light / Dark / System**, stored per-device (or synced via the user's account if the backend supports it).
- Implement via a single `ThemeMode` + selected `AppPalette` held in a Riverpod provider; `MaterialApp` consumes `theme:` and `darkTheme:` built from the same palette so switching is instant (no rebuild flash, addressing §19's chart-flash issue at the architecture level, not just in charts).
- Persist the choice locally (e.g., `shared_preferences`) so it survives app restarts even offline.

---

## 14. Accessibility

Carry over every "Positive" from the web review, and explicitly close every "Gap" listed, since a POS app doubles as a workplace tool that may need to meet accessibility compliance:

| Web Gap | Flutter Fix |
| --- | --- |
| No skip-to-content link | N/A on mobile (no keyboard tab order across a full page) — ensure `Semantics` reading order is logical top-to-bottom instead |
| No `aria-current` on active nav | `Semantics(selected: true)` on active `NavigationDestination` |
| Charts lack text alternatives | "View as table" toggle on every chart (§10) |
| No `prefers-reduced-motion` handling | Global `appDuration()` helper (§7.2) used everywhere |
| Form errors lack live announcements | Wrap error text in `Semantics(liveRegion: true)` |
| FAB may need explicit label | `Tooltip` + `Semantics(label: 'New sale')` on the FAB |

Additional mobile-specific requirements:
- Minimum tap target 44×44dp (Apple HIG) / 48×48dp (Material) — enforce via a lint rule or shared `MinTapTarget` wrapper widget.
- Support OS-level text scaling (`MediaQuery.textScaler`) up to at least 130% without layout breakage — test the KPI cards and product grid at large text sizes specifically, since they're the most information-dense screens.

---

## 15. What to Change vs. the Web App

A short list of deliberate departures, so nothing here reads as "we forgot":

1. **Sidebar → bottom nav + FAB.** Not a downgrade — it's the correct mobile pattern, and puts the highest-frequency action (new sale) in the most reachable spot.
2. **Tables → cards everywhere.** Non-negotiable on phone widths; horizontal-scroll tables on mobile are a known usability failure pattern.
3. **Toasts move top-anchored.** The web review already flags a bottom-nav conflict risk (§19) — solve it by relocating rather than shrinking the nav.
4. **Command palette → search icon + full-screen results.** `Cmd+K` has no phone equivalent; don't force a fake keyboard-shortcut affordance.
5. **Runtime Google Fonts → bundled fonts.** Reliability over the web's convenience-loading approach; POS devices need offline-safe assets.
6. **Chart-rebuild-on-theme-change is designed out from day one**, not patched in later, since Flutter's declarative rebuild model makes the web's destroy/recreate flash avoidable from the start.
7. **Accessibility gaps are closed by default**, not treated as a backlog — see §14.

---

*This guide should be treated as the single source of truth for visual and interaction decisions during Flutter development — the same role the CSS token system plays for the web app. Any new component should be checked against §3–§9 before a one-off style is introduced.*
