# Shopify Embed Instructions for Wig Matcher Widget

## Option 1: Simple iframe Embed (Easiest)

### HTML Code to Embed Anywhere

```html
<!-- Wig Matcher Widget iframe -->
<div class="wig-matcher-container" style="width: 100%; max-width: 1200px; margin: 0 auto;">
  <iframe
    src="https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher"
    width="100%"
    height="1200px"
    frameborder="0"
    scrolling="no"
    style="border: none; overflow: hidden;"
    title="Find Your Perfect Wig Matcher"
    allow="camera; microphone"
  ></iframe>
</div>

<!-- Auto-resize iframe script (optional but recommended) -->
<script>
  // Auto-resize iframe to fit content
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'resize-iframe') {
      const iframe = document.querySelector('iframe[src*="wig-matcher"]');
      if (iframe && e.data.height) {
        iframe.style.height = e.data.height + 'px';
      }
    }
  });
</script>
```

---

## Option 2: Shopify Page Template (Best Integration)

### Step 1: Create a new page template

1. Go to Shopify Admin → **Online Store** → **Themes**
2. Click **Actions** → **Edit code**
3. Under **Templates**, click **Add a new template**
4. Choose **page** and name it `page.wig-matcher.liquid`
5. Paste the code below:

```liquid
<!-- templates/page.wig-matcher.liquid -->

<div class="page-width">
  <div class="page-header">
    <h1 class="page-title">{{ page.title }}</h1>
  </div>

  <!-- Page content if any -->
  {% if page.content != blank %}
    <div class="rte">
      {{ page.content }}
    </div>
  {% endif %}

  <!-- Wig Matcher Widget -->
  <div class="wig-matcher-embed" style="margin: 2rem 0;">
    <iframe
      src="https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher"
      width="100%"
      height="1200px"
      frameborder="0"
      style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
      title="Find Your Perfect Wig"
      allow="camera"
      loading="lazy"
    ></iframe>
  </div>
</div>

<style>
  .wig-matcher-embed iframe {
    min-height: 800px;
    display: block;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .wig-matcher-embed iframe {
      height: 1400px;
    }
  }
</style>

<script>
  // Listen for resize messages from iframe
  window.addEventListener('message', function(event) {
    // Verify origin for security
    if (event.origin !== 'https://main.d3gr4ycam28tui.amplifyapp.com') return;

    if (event.data && event.data.type === 'resize') {
      const iframe = document.querySelector('.wig-matcher-embed iframe');
      if (iframe && event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    }
  });
</script>
```

### Step 2: Create a page using the template

1. Go to Shopify Admin → **Online Store** → **Pages**
2. Click **Add page**
3. Set **Title**: "Find Your Perfect Wig"
4. On the right sidebar, under **Template**, select `page.wig-matcher`
5. Click **Save**

Your widget will now be at: `https://chiquel.com/pages/find-your-perfect-wig`

---

## Option 3: Embed in Existing Page (Quick Add)

If you want to add it to an existing page:

1. Go to **Online Store** → **Pages**
2. Select your page (e.g., "Virtual Try-On")
3. Click **Show HTML** button in editor
4. Paste this code where you want the widget:

```html
<div style="margin: 2rem 0;">
  <iframe
    src="https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher"
    width="100%"
    height="1200px"
    style="border: none; border-radius: 8px;"
    title="Find Your Perfect Wig"
  ></iframe>
</div>
```

---

## Option 4: Add to Navigation Menu

After creating your page, add it to the main navigation:

1. Go to **Online Store** → **Navigation**
2. Select your main menu
3. Click **Add menu item**
4. **Name**: "Find Your Wig"
5. **Link**: Select your newly created page
6. Click **Save**

---

## Option 5: Full-Width Homepage Section (Advanced)

Add as a homepage section:

1. Go to **Themes** → **Edit code**
2. Under **Sections**, create `wig-matcher-section.liquid`
3. Paste this code:

```liquid
<!-- sections/wig-matcher-section.liquid -->

<div class="wig-matcher-section" style="background: #f9f9f9; padding: 3rem 0;">
  <div class="page-width">
    {% if section.settings.heading != blank %}
      <h2 style="text-align: center; margin-bottom: 2rem; font-size: 2rem;">
        {{ section.settings.heading }}
      </h2>
    {% endif %}

    {% if section.settings.description != blank %}
      <div class="rte" style="text-align: center; margin-bottom: 2rem; max-width: 700px; margin-left: auto; margin-right: auto;">
        {{ section.settings.description }}
      </div>
    {% endif %}

    <div class="wig-matcher-embed">
      <iframe
        src="https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher"
        width="100%"
        height="{{ section.settings.iframe_height }}px"
        frameborder="0"
        style="border: none; border-radius: 8px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
        title="Find Your Perfect Wig"
        allow="camera"
      ></iframe>
    </div>
  </div>
</div>

{% schema %}
{
  "name": "Wig Matcher Widget",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Find Your Perfect Wig"
    },
    {
      "type": "richtext",
      "id": "description",
      "label": "Description",
      "default": "<p>Discover wigs that match your style and features using AI-powered recommendations</p>"
    },
    {
      "type": "range",
      "id": "iframe_height",
      "label": "Widget Height",
      "min": 800,
      "max": 2000,
      "step": 100,
      "default": 1200,
      "unit": "px"
    }
  ],
  "presets": [
    {
      "name": "Wig Matcher",
      "category": "Custom"
    }
  ]
}
{% endschema %}
```

Then add it to your homepage via **Customize theme**.

---

## Troubleshooting

### Issue: iframe not loading
- Check if the URL is correct: `https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher`
- Check browser console for CORS errors
- Verify AWS Amplify app is deployed and running

### Issue: iframe too small/large
- Adjust the `height` attribute in the iframe tag
- Use responsive CSS for mobile devices

### Issue: Camera not working
- Make sure you have `allow="camera"` in the iframe tag
- Camera permissions must be on HTTPS (Shopify is HTTPS by default ✓)

---

## Recommended Setup

**Best Option**: Use **Option 2 (Page Template)** for the cleanest integration.

1. Create the page template
2. Create a page using that template
3. Add to navigation menu
4. Test on mobile and desktop

**URL Structure**:
- Widget page: `https://chiquel.com/pages/find-your-perfect-wig`
- Widget iframe: `https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher`

---

## Need Help?

If you have issues embedding the widget, check:
1. AWS Amplify deployment is live
2. URL is accessible in browser
3. Shopify theme allows iframes
4. Camera permissions are enabled
