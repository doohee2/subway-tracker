---
name: Metrolink Pro
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#454652'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#757684'
  outline-variant: '#c5c5d4'
  surface-tint: '#4355b9'
  primary: '#24389c'
  on-primary: '#ffffff'
  primary-container: '#3f51b5'
  on-primary-container: '#cacfff'
  inverse-primary: '#bac3ff'
  secondary: '#6f43c0'
  on-secondary: '#ffffff'
  secondary-container: '#a97efd'
  on-secondary-container: '#3d0088'
  tertiary: '#313e7e'
  on-tertiary: '#ffffff'
  tertiary-container: '#495697'
  on-tertiary-container: '#c9d0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105c'
  on-primary-fixed-variant: '#293ca0'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5727a6'
  tertiary-fixed: '#dee1ff'
  tertiary-fixed-dim: '#b9c3ff'
  on-tertiary-fixed: '#021355'
  on-tertiary-fixed-variant: '#354282'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-mono:
    fontFamily: monospace
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system is built to evoke a sense of precision, reliability, and technological sophistication. The brand personality is "The Silent Conductor"—authoritative and efficient, yet unobtrusive. It targets urban commuters and transit professionals who require real-time data delivered through a high-performance interface.

The design style follows a **Corporate / Modern** aesthetic, prioritizing clarity and utilitarian beauty. It utilizes deep saturated tones to suggest stability, paired with a vast expanse of whitespace to prevent information density from becoming overwhelming. The visual language is high-tech but grounded, avoiding unnecessary flourishes in favor of crisp execution and logical hierarchy.

## Colors

The color palette is anchored by **Deep Indigo** for core branding and primary actions, providing a sense of institutional trust. **Royal Purple** serves as the secondary accent, used for secondary data points and interactive highlights. 

- **Primary (#3F51B5):** Main buttons, active navigation states, and primary route indicators.
- **Secondary (#673AB7):** Status icons, progress bars, and hover states.
- **Neutral / Background:** A clean white background is complemented by a very light cool-grey surface color for card backgrounds and sidebars to define spatial boundaries.
- **Semantic States:** Success (Green) indicates "On Time" or "Service Normal," while Error (Red) signals "Delays," "Cancellations," or "Emergency Alerts."

## Typography

This design system utilizes **Inter** for its exceptional legibility at small sizes and its neutral, systematic feel. 

- **Headlines:** Use heavy weights (600-700) with slight negative letter-spacing to create a "locked-in," professional look.
- **Body:** Standardized at 16px for optimal readability. 
- **Labels:** Small, uppercase labels are used for metadata and category headers to provide clear structural breaks without taking up excessive vertical space.
- **Numerical Data:** For arrival times and countdowns, a medium weight is preferred to ensure instant scannability against a busy background.

## Layout & Spacing

The layout employs a **Fluid Grid** system within a 1280px max-width container. A strict 8px base unit ensures consistent rhythm across all components.

- **Margins:** Page margins should be set to `lg` (40px) on desktop to provide "breathing room" that reinforces the high-end, clean aesthetic.
- **Gutters:** Standardized at 24px to ensure distinct separation between data modules.
- **Rhythm:** Information-dense areas (like arrival tables) should use `sm` spacing, while high-level dashboard views should use `md` padding to maintain the "clean" vibe.

## Elevation & Depth

To convey hierarchy in a high-tech environment, this design system uses **Ambient Shadows** and **Tonal Layers**.

- **Level 0 (Background):** Pure white.
- **Level 1 (Cards/Panels):** Surface color (#F5F7FB) with a subtle 1px border (#E0E4EF).
- **Level 2 (Interactive Elements):** A soft, diffused shadow (0px 4px 12px rgba(63, 81, 181, 0.08)) is applied to primary cards and dropdowns to suggest they are "above" the base layer.
- **Level 3 (Active Overlays):** Modals and popovers use a deeper shadow (0px 12px 32px rgba(0, 0, 0, 0.12)) to focus user attention.

Avoid heavy black shadows; use a subtle indigo tint in the shadow color to maintain palette harmony.

## Shapes

The shape language is defined by **Rounded** corners, striking a balance between the friendliness of a consumer app and the rigidity of a professional tool.

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Containers:** Large dashboard sections and main containers use a 1rem (16px) radius.
- **Data Points:** Real-time badges and status indicators use a "Pill" shape (full radius) to distinguish them as dynamic, status-driven elements.

## Components

- **Buttons:** Primary buttons use a solid Deep Indigo fill with white text. Secondary buttons use a transparent background with a 1px Indigo border. 
- **Chips:** Used for transit line indicators (e.g., "Line A", "Line B"). These should have high-contrast backgrounds corresponding to the specific line color, using the "Pill" shape.
- **Input Fields:** Clean, white backgrounds with a subtle Indigo border on focus. No heavy shadows; use a 2px stroke for the active state.
- **Lists:** Subway arrival lists should use alternate-row shading (Zebra striping) using the Surface color for increased legibility.
- **Status Badges:** "On Time" badges use the Success Green text with a 10% opacity green background. "Delayed" uses the Error Red in the same format.
- **Interactive Map:** Should be the centerpiece of the tracking app. Use a "Dark Mode" styled map (even in light mode) to make the vibrant Indigo/Purple transit lines pop.
- **Cards:** Use cards to group station information. Ensure cards have `md` padding and Level 2 elevation for a crisp, organized feel.