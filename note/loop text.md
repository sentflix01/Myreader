[5 tools called]

To loop the logos infinitely, I turned the logos row into a scrolling “track” and duplicated the logos for a seamless loop.

### HTML (`index.html` 151–163)

```html
<section class="section-featured">
  <div class="container">
    <h2 class="heading-featured-in">As featured in</h2>
    <div class="logos">
      <div class="logos-track">
        <img src="img/logos/techcrunch.png" alt="Techcrunch logo" />
        <img src="img/logos/business-insider.png" alt="Business Insider logo" />
        <img
          src="img/logos/the-new-york-times.png"
          alt="The New York Times logo"
        />
        <img src="img/logos/forbes.png" alt="Forbes logo" />
        <img src="img/logos/usa-today.png" alt="USA Today logo" />
        <!-- duplicate for seamless loop -->
        <img src="img/logos/techcrunch.png" alt="Techcrunch logo" />
        <img src="img/logos/business-insider.png" alt="Business Insider logo" />
        <img
          src="img/logos/the-new-york-times.png"
          alt="The New York Times logo"
        />
        <img src="img/logos/forbes.png" alt="Forbes logo" />
        <img src="img/logos/usa-today.png" alt="USA Today logo" />
      </div>
    </div>
  </div>
</section>
```

### CSS (`style.css`)

```css
.section-featured {
  padding: 4.8rem 0 3.2rem 0;
}

.heading-featured-in {
  font-size: 1.4rem;
  text-transform: uppercase;
  letter-spacing: 0.75px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 2.4rem;
  color: #888;
}

.logos {
  overflow: hidden;
  position: relative;
}

.logos-track {
  display: flex;
  gap: 4.8rem;
  align-items: center;
  animation: logos-scroll 25s linear infinite;
}

.logos img {
  height: 3.2rem;
  filter: brightness(0);
  opacity: 50%;
  flex-shrink: 0;
}

@keyframes logos-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
```

This makes the logos slide left forever in a smooth, infinite loop.
