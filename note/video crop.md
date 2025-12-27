[1 tool called]

To change (crop/resize) the hero video, adjust the CSS for `hero-img` (and optionally its box).

Right now in `style.css` you have:

```css
.hero-img {
  width: 100%;
}
```

### Make the hero video smaller

If you just want it smaller, change it to for example:

```css
.hero-img {
  width: 60%; /* smaller than full width */
  max-height: 40rem;
  object-fit: cover;
  border-radius: 1.2rem; /* optional: rounded corners */
}
```

### Make it fixed size and “cropped”

If you want a fixed-size box that crops the video:

```css
.hero-img-box {
  width: 40rem; /* adjust as you like */
  height: 25rem; /* adjust as you like */
  overflow: hidden; /* crop anything that overflows */
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* fills the box and crops edges */
  border-radius: 1.2rem;
}
```

Edit `public/css/style.css` with one of these options, save, then reload the page to see the new video size.
