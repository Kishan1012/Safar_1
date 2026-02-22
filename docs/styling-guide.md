# AI Trip Planner — Collage-Style UI Styling Guide

## Design Philosophy
A "travel magazine meet digital collage" aesthetic. Think Airbnb meets Condé Nast Traveler — rich photography, editorial typography, and data-dense but spacious layouts.

---

## Color System

```js
// tailwind.config.js — extend for React Native via NativeWind
module.exports = {
  theme: {
    extend: {
      colors: {
        // ─── Dark Background System ───────────────────────
        ink: {
          950: '#060A14',  // deepest bg
          900: '#090E1A',  // primary bg
          800: '#111827',  // surface
          700: '#1A2235',  // surface-2
          600: '#232F44',  // surface-3 / card bg
          500: '#2D3A53',  // border / divider
        },
        // ─── Saffron (primary CTA, highlights) ──────────
        saffron: {
          300: '#FFD24C',
          400: '#FFBA00',
          500: '#FF8C4A',
          600: '#FF6B1A',
          700: '#E0530A',
        },
        // ─── Teal (secondary, AI indicators) ───────────
        teal: {
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#13A898',
          600: '#0B7B6F',
        },
        // ─── Purple (personalization, "why" notes) ──────
        concierge: {
          300: '#DDD6FE',
          400: '#C4B5FD',
          500: '#A78BFA',
          600: '#7C3AED',
        },
        // ─── Text ───────────────────────────────────────
        ivory:  '#F5F0E8',  // primary text
        slate:  '#8896B0',  // muted text
        ghost:  '#4A5568',  // faint / placeholder
      },
      fontFamily: {
        sans:   ['Plus Jakarta Sans', 'system-ui'],
        serif:  ['Playfair Display', 'Georgia'],
        mono:   ['JetBrains Mono', 'monospace'],
      },
    }
  }
}
```

---

## Typography Scale

| Token | Size | Weight | Use |
|---|---|---|---|
| `display-xl` | 52px / 3.25rem | 900 | Hero titles |
| `display-lg` | 40px / 2.5rem | 800 | Section headings |
| `heading-xl` | 28px / 1.75rem | 800 | Card headings |
| `heading-lg` | 22px / 1.375rem | 700 | Day theme title |
| `body-lg` | 16px / 1rem | 500 | Paragraphs |
| `body-sm` | 13px / 0.8125rem | 400 | Supporting copy |
| `label` | 11px / 0.6875rem | 700 | Chips, badges (uppercase) |

```css
/* Base typography rules */
h1 { font-size: clamp(2.5rem, 6vw, 5.2rem); font-weight: 900; letter-spacing: -0.04em; }
h2 { font-size: clamp(1.8rem, 4vw, 3rem);   font-weight: 800; letter-spacing: -0.03em; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; font-size: 0.7rem; }
```

---

## Component Library

### 1. Stop Card (Collage Style)

```tsx
// Layered card with photo strip, editorial typography, and action row
<View className="bg-ink-800 rounded-2xl overflow-hidden border border-ink-500">

  {/* Photo strip — 1/3 height image */}
  <Image style={{ height: 120 }} source={{ uri: stop.photo_url }} />

  {/* Category ribbon */}
  <View className="absolute top-3 left-3 bg-saffron-600/90 px-3 py-1 rounded-full">
    <Text className="text-white text-xs font-bold uppercase tracking-widest">{stop.category}</Text>
  </View>

  {/* Body */}
  <View className="p-4">
    <View className="flex-row justify-between items-start mb-2">
      <Text className="text-ivory text-lg font-black flex-1">{stop.name}</Text>
      <Text className="text-saffron-500 font-bold text-sm">{stop.scheduled_arrival}</Text>
    </View>

    {/* AI match explanation */}
    <Text className="text-concierge-400 text-sm italic mb-3">{stop.why_youll_love_it}</Text>

    {/* Concierge tip */}
    <View className="bg-teal-600/15 border-l-2 border-teal-500 px-3 py-2 rounded-r-lg mb-3">
      <Text className="text-slate text-xs leading-relaxed">{stop.concierge_tip}</Text>
    </View>

    {/* Action row */}
    <View className="flex-row gap-2">
      <Pressable className="flex-1 bg-ink-600 rounded-xl py-2 items-center">
        <Text className="text-slate text-xs font-bold">🗺️ Map</Text>
      </Pressable>
      <Pressable className="flex-1 bg-ink-600 rounded-xl py-2 items-center">
        <Text className="text-slate text-xs font-bold">📋 Info</Text>
      </Pressable>
      <Pressable className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl py-2 items-center">
        <Text className="text-red-400 text-xs font-bold">✕ Skip</Text>
      </Pressable>
    </View>
  </View>
</View>
```

### 2. Travel Connector

```tsx
// Visual bridge between stop cards showing travel mode and time
<View className="flex-row items-center my-3 px-4">
  <View className="flex-1 h-px bg-ink-500" />
  <View className="bg-ink-700 border border-ink-500 px-3 py-1.5 rounded-full mx-3">
    <Text className="text-slate text-xs font-semibold">
      {icon} {mins} min {mode}
    </Text>
  </View>
  <View className="flex-1 h-px bg-ink-500" />
</View>
```

### 3. Budget Donut Widget

```tsx
// Real-time budget visualization — use react-native-reanimated + SVG
<View className="bg-ink-800 rounded-2xl p-5">
  <View className="flex-row items-center justify-between mb-4">
    <Text className="text-ivory font-bold text-lg">Today's Budget</Text>
    <Text className="text-saffron-500 font-black text-xl">₹{remaining.toLocaleString('en-IN')}</Text>
  </View>

  {/* Segmented bar */}
  <View className="bg-ink-600 rounded-full h-2.5 overflow-hidden flex-row">
    <View className="bg-saffron-600" style={{ flex: flightPct }} />
    <View className="bg-teal-500" style={{ flex: hotelPct }} />
    <View className="bg-concierge-500" style={{ flex: foodPct }} />
    <View className="bg-blue-400" style={{ flex: activityPct }} />
  </View>

  {/* Legend */}
  <View className="flex-row flex-wrap gap-3 mt-3">
    {[
      { color: 'bg-saffron-600', label: 'Flight' },
      { color: 'bg-teal-500',    label: 'Hotel' },
      { color: 'bg-concierge-500', label: 'Food' },
      { color: 'bg-blue-400',    label: 'Activities' },
    ].map(l => (
      <View key={l.label} className="flex-row items-center gap-1.5">
        <View className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
        <Text className="text-slate text-xs">{l.label}</Text>
      </View>
    ))}
  </View>
</View>
```

### 4. Traveler DNA Badge

```tsx
// Small profile chip shown in itinerary header
<View className="flex-row items-center gap-2 bg-ink-700 border border-ink-500 px-3 py-1.5 rounded-full">
  <Text className="text-base">
    {pace === 'slow' ? '🌿' : pace === 'fast' ? '🚀' : '⚡'}
  </Text>
  <Text className="text-slate text-xs font-bold uppercase tracking-wide">{pace}</Text>
  <View className="w-px h-3 bg-ink-500" />
  <Text className="text-saffron-500 text-xs font-bold">{budget_tier}</Text>
</View>
```

### 5. Neighborhood Cluster Tag

```tsx
// Visual indicator showing all stops belong to one area — prevents ping-ponging
<View className="bg-saffron-600/10 border border-saffron-600/30 px-3 py-1 rounded-full flex-row items-center gap-1.5">
  <View className="w-2 h-2 bg-saffron-500 rounded-full" />
  <Text className="text-saffron-500 text-xs font-bold">{neighborhood}</Text>
  <Text className="text-slate text-xs">· {stops.length} stops nearby</Text>
</View>
```

---

## Spacing System

```js
// 4-point base grid
const SPACING = {
  xs: 4,   sm: 8,   md: 12,  base: 16,
  lg: 20,  xl: 24,  '2xl': 32, '3xl': 48,
  '4xl': 64, '5xl': 96,
};
```

---

## Animation Tokens

```ts
// React Native Reanimated presets
export const SPRING = {
  gentle:   { damping: 20, stiffness: 120 },  // Card entrance
  bouncy:   { damping: 12, stiffness: 180 },  // Chips / toggles
  stiff:    { damping: 30, stiffness: 300 },  // Quick micro-interactions
};

export const TRANSITION_MS = {
  instant: 100,
  fast:    200,
  normal:  300,
  slow:    500,
};

// Stop rejection animation: slide out left + fade
// New stop arrival: fade in + slide up from bottom
// Day change: horizontal slide transition
// Loading skeleton: shimmer from left to right
```

---

## Layout Patterns

### Collage Grid (web)
```css
.collage-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
/* Hero image: spans 8 cols */
/* Side stack: spans 4 cols, 2 rows of 2 items each */
/* Full-width strip: spans 12 cols */
```

### Timeline (mobile)
```
09:00 ─●── Amber Fort            [heritage] [₹550]
           🚕 30 min taxi
13:00 ─●── LMB Restaurant        [lunch]    [₹380]
           🚶 15 min walk
14:30 ─●── Hawa Mahal            [heritage] [₹200]
           🚇 20 min metro
17:00 ─●── Nahargarh Fort Sunset [viewpoint][FREE]
```

---

## Dark / Light Mode

```ts
// Use system theme via Appearance API
import { Appearance } from 'react-native';

const THEME = {
  dark: {
    bg: '#090E1A', surface: '#111827', text: '#F5F0E8', muted: '#8896B0',
  },
  light: {
    bg: '#F8F5EF', surface: '#FFFFFF', text: '#1A1A2E', muted: '#6B7280',
  },
};
```

---

## AI Agent Status Indicators

| State | Color | Animation | Copy |
|---|---|---|---|
| Researching | `teal-500` | Pulse | "🔍 Finding the best spots in Jaipur..." |
| Optimizing | `saffron-500` | Spinner | "⚙️ Clustering by neighborhood..." |
| Personalizing | `concierge-400` | Shimmer | "🧬 Tuning to your Traveler DNA..." |
| Complete | `green-500` | Checkmark pop | "✅ Your itinerary is ready!" |
| Error | `red-400` | Shake | "❌ Try again or adjust filters" |

---

## Accessibility

```tsx
// Every interactive element must have:
accessibilityLabel="Reject Amber Fort stop"
accessibilityRole="button"
accessibilityHint="Double tap to skip this location and find an alternative"

// Color contrast ratios:
// saffron-600 on ink-800: 4.8:1 ✅ (WCAG AA)
// ivory on ink-900: 14.2:1 ✅ (WCAG AAA)
// slate on ink-800: 3.1:1 ⚠️ (use for non-critical copy only)
```

---

## Offline Mode UX

```ts
// AsyncStorage keys
const CACHE_KEYS = {
  TRIP:         (id: string) => `@safar/trip/${id}`,
  TRAVELER_DNA: '@safar/traveler_dna',
  MAP_TILES:    (city: string) => `@safar/tiles/${city}`,
};

// Offline indicator pattern
// - Green dot + "Synced" when online
// - Amber dot + "Saved offline" when cached + no connection
// - Red dot + "No data" when no cache + no connection
// Cache invalidation: 24 hours, or on any user-initiated change
```
