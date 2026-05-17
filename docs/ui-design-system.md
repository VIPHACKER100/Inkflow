# 🎨 UI Design System

This document describes Inkflow's CSS design token architecture, theme system, and layout grid structure.

---

## CSS Design Tokens & Theme System

The visual foundations are centralized in a robust CSS Custom Property system, enabling precise theme-switching (light/dark) without runtime layout recalculations.

### Core Token Table

| Design Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--paper-cream` | `#f7f3ea` | `#1e1e2e` | Canvas backgrounds for ruled, plain, legal |
| `--app-bg` | `#ede8dc` | `#12121e` | Outer application layout container |
| `--accent` | `#c0622a` | `#e08050` | CTA buttons, slider thumbs, branding |
| `--sidebar-bg` | `rgba(247,243,234,0.72)` | `rgba(20,20,35,0.82)` | Frosted glass backdrop for sidebar |
| `--sidebar-border` | `rgba(180,160,110,0.25)` | `rgba(80,80,120,0.3)` | Soft metallic divider lines |
| `--text-primary` | `#1c2340` | `#e8e4d8` | Primary readable text and headers |

---

## Layout Grid Structure

The interface uses a **two-column CSS Grid** layout:

### Control Console (`#sidebar` — 300px)
A glassmorphic control dock featuring stacked, collapsible sections for:
- Text entry
- Typography options
- Paper styles
- Ink characteristics
- AI functions
- Animation controls
- Export options

### Canvas Viewport (`#canvas-area`)
A neutral, spacious preview environment with:
- Subtle radial-gradient micro-dot pattern
- Centered virtual A4 pages
- Depth shadows via `--paper-shadow`

### Floating Header (56px fixed)
Top toolbar on a saturated frosted backdrop (`backdrop-filter: blur(20px)`) containing the app logo, theme toggle, and primary action buttons.

### Floating Pagination
Bottom pill-style navigation for multi-page A4 transitions.

---

## Typography

- **Primary Font**: `'Outfit'`, `'Inter'` — Modern, clean UI typography
- **Handwriting Fonts**: Google Fonts (Caveat, Patrick Hand, Indie Flower, etc.) + custom user fonts
- **Monospace**: System monospace for code snippets and technical labels

---

## Glassmorphism & Visual Effects

```css
.sidebar {
  background: var(--sidebar-bg);
  backdrop-filter: blur(16px) saturate(1.4);
  border-right: 1px solid var(--sidebar-border);
}

.card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
```

---

## Color Palette

### Ink Colors (User-Selectable)
| Name | Hex | Usage |
| :--- | :--- | :--- |
| Navy Black | `#1c2340` | Default ink — professional dark blue |
| Royal Blue | `#1a3a7a` | Formal blue ink |
| Forest Green | `#1a5c3a` | Nature-toned notes |
| Crimson Red | `#8b1a1a` | Corrections and emphasis |
| Graphite | `#333333` | Pencil-like writing |

### Paper Backgrounds
| Style | Color | Description |
| :--- | :--- | :--- |
| Ruled | `#f7f3ea` | Warm cream notebook |
| Legal | `#fff8cc` | Bright yellow legal pad |
| Vintage | `#e8dcc4` | Aged parchment |
| Dark | `#1e1e2e` | Indigo slate dark mode |
