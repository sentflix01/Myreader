I’ll turn your hero video into a full-screen background behind the hero section by updating the HTML slightly and adding CSS that makes the video cover the whole section while keeping your text on top.

[4 tools called]

To make the video play behind the hero section at (almost) screen size, I’ve turned it into a full-section background.

### What I changed

- **In `index.html`**, right inside `section-hero` I added a background video:

```html
<section class="section-hero">
  <video
    class="hero-bg-video"
    src="img/hero1.mp4"
    autoplay
    muted
    loop
    playsinline
  ></video>
  <div class="hero">
    <!-- existing hero content stays the same -->
  </div>
</section>
```

- **In `style.css`**, I made the hero section full-screen and put the video behind:

```css
.section-hero {
  position: relative;
  background-color: #000;
  padding: 0;
  min-height: 100vh; /* full screen height */
  overflow: hidden;
}

.hero {
  position: relative;
  z-index: 1; /* content above video */
  max-width: 130rem;
  margin: 0 auto;
  padding: 4.8rem 3.2rem 9.6rem 3.2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9.6rem;
  align-items: center;
}

.hero-bg-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* fills and crops like background */
  z-index: 0;
}
```

Now the video fills the whole hero section as a background, and your text/buttons stay on top. Refresh the page; if you want it to cover more/less than the screen, adjust `min-height` on `.section-hero`.

I’ll adjust the layering in the CSS so the video sits truly behind the hero content, not on top of it, while keeping it sized to the `.hero` area.

[1 tool called]

Now the video is truly in the background and your text stays on top.

Key CSS changed in `style.css`:

```css
.hero {
  position: relative;
  max-width: 130rem;
  margin: 0 auto;
  padding: 4.8rem 3.2rem 9.6rem 3.2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9.6rem;
  align-items: center;
}

.hero-bg-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1; /* behind all hero content */
  pointer-events: none; /* clicks go to buttons/links, not video */
}
```

Because `.hero` is `position: relative` and the video has `z-index: -1`, all your headings, text, and buttons inside `.hero` will render above the video while it plays in the background. Reload the page to see the effect.
