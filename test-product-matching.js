const fs = require('fs');
const path = require('path');

// Test loading catalog and matching
const catalogPath = path.join(__dirname, 'valid_image_catalog.json');
console.log('Loading catalog from:', catalogPath);

if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const allProducts = catalog.products || [];

  console.log(`✅ Loaded ${allProducts.length} products`);

  // Search for Venice Blonde products
  const veniceProducts = allProducts.filter(p => {
    if (!p.colorName) return false;
    const colorName = p.colorName.toLowerCase();
    return colorName.includes('22f16s8') || colorName.includes('venice');
  });

  console.log(`\n🔍 Found ${veniceProducts.length} Venice Blonde products:`);
  veniceProducts.slice(0, 5).forEach(p => {
    console.log(`  - ${p.title} | Color: ${p.colorName}`);
  });

  // Search for R6/10 products
  const r6Products = allProducts.filter(p => {
    if (!p.colorName) return false;
    const colorName = p.colorName.toLowerCase();
    return colorName.includes('r6/10') || colorName.includes('r6');
  });

  console.log(`\n🔍 Found ${r6Products.length} R6/10 products:`);
  r6Products.slice(0, 5).forEach(p => {
    console.log(`  - ${p.title} | Color: ${p.colorName}`);
  });

  // Check product structure
  console.log('\n📊 Sample product structure:');
  const sampleProduct = allProducts[0];
  console.log(JSON.stringify(sampleProduct, null, 2));

} else {
  console.error('❌ Catalog not found at:', catalogPath);
}