# Main simulator background image

The main simulator (index.html) uses a full-page background image at 50% opacity.

## How to change the background image from the code

**Option 1 — Edit the CSS variable (recommended)**

1. Open **`styles/main.css`**.
2. Find the **`:root`** block at the top.
3. Change **`--simulator-bg-image`** to your image path:

```css
--simulator-bg-image: url('assets/card-images/simulator-background.png');
```

Current background: `assets/card-images/simulator-background.png`. To use another image, change the path above or put your file at that path.

Use a path relative to the project root (e.g. `assets/my-background.jpg`).

**Option 2 — Change opacity**

In the same **`:root`** block, adjust:

```css
--simulator-bg-opacity: 0.5;   /* 0 = invisible, 1 = full opacity */
```

**Option 3 — Use a different file without editing CSS**

1. Put your image in **`assets/card-images/`**.
2. Name it **`simulator-background.png`** (or update `--simulator-bg-image` in `main.css` to your filename).

Current value in code: `url('assets/card-images/simulator-background.png')` with opacity `0.5`.
