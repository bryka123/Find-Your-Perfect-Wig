# Shopify Installation Instructions - Wig Matcher Widget

## Files You Need

1. **shopify-section-wig-matcher.liquid** - The section file
2. **shopify-page-template-wig-matcher.json** - The page template (JSON format)

---

## Step-by-Step Installation

### Step 1: Add the Section File

1. Go to **Shopify Admin** → **Online Store** → **Themes**
2. Click **Actions** → **Edit code**
3. In the left sidebar, under **Sections**, click **Add a new section**
4. Name it: `wig-matcher`
5. Delete all the placeholder code
6. Copy and paste the entire contents of `shopify-section-wig-matcher.liquid`
7. Click **Save**

### Step 2: Add the Page Template (JSON Format)

1. Still in **Edit code**, under **Templates**, click **Add a new template**
2. Select **page** from the dropdown
3. Name it: `wig-matcher`
4. Choose **JSON** format (important!)
5. Delete all placeholder code
6. Copy and paste the entire contents of `shopify-page-template-wig-matcher.json`
7. Click **Save**

### Step 3: Create the Page

1. Go to **Online Store** → **Pages**
2. Click **Add page**
3. Set **Title**: "Find Your Perfect Wig"
4. Leave content blank (or add intro text)
5. On the right sidebar, under **Template**, select `page.wig-matcher`
6. Click **Save**

Your widget is now live at: `https://chiquel.com/pages/find-your-perfect-wig`

### Step 4: Add to Navigation (Optional)

1. Go to **Online Store** → **Navigation**
2. Select your main menu (usually "Main menu")
3. Click **Add menu item**
4. **Name**: "Find Your Wig" or "Wig Matcher"
5. **Link**: Search for and select your newly created page
6. Click **Save menu**

---

## Customization Options

After installation, you can customize the widget:

1. Go to **Online Store** → **Themes** → **Customize**
2. Navigate to your wig matcher page
3. Click on the **Wig Matcher Widget** section
4. You can adjust:
   - **Heading text and color**
   - **Subheading text**
   - **Widget height** (desktop and mobile)
   - **Maximum width**
   - **Border radius**
   - **Background colors**
   - **Padding/spacing**

---

## Alternative: Add to Homepage

To add the widget to your homepage:

1. Go to **Online Store** → **Themes** → **Customize**
2. Navigate to your homepage
3. Click **Add section**
4. Search for "Wig Matcher"
5. Click to add it
6. Customize settings as needed
7. Click **Save**

---

## Alternative: Add to Any Page as Section

To add to any existing page:

1. Go to the page in theme customizer
2. Click **Add section**
3. Select **Wig Matcher**
4. Position it where you want
5. Customize and **Save**

---

## Troubleshooting

### Section doesn't appear in customizer
- Make sure you saved the section file as `wig-matcher.liquid`
- Refresh the theme customizer page
- Check for any syntax errors in the code

### Page template doesn't show up
- Verify the template is saved as `page.wig-matcher.json`
- Make sure you selected **JSON** format (not Liquid)
- Refresh the admin page

### Widget not loading
- Check that AWS Amplify URL is correct: `https://main.d3gr4ycam28tui.amplifyapp.com/storefront/wig-matcher`
- Verify the Amplify app is deployed and running
- Check browser console for errors

### Height issues
- Adjust the height settings in the customizer
- Mobile height might need to be taller than desktop
- Try values between 1200-1600px for best results

---

## Support

If you need help:
1. Check that both files are uploaded correctly
2. Verify file names match exactly
3. Make sure JSON template uses `"type": "wig-matcher"` matching the section filename
4. Test the widget URL directly in browser first

---

## File Locations in Theme

After installation, files will be at:
- `sections/wig-matcher.liquid` - The widget section
- `templates/page.wig-matcher.json` - The page template

You can edit these files anytime in **Theme Code Editor**.
