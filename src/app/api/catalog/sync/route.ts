import { NextRequest, NextResponse } from 'next/server';
import { createAdminApiClient, GET_PRODUCTS_QUERY, verifyWebhook, extractWigAttributes } from '@/lib/shopify';
import { VectorMatcher } from '@/lib/vectors';
import { Variant } from '@/lib/types';

// Bulk import handler - syncs all products from Shopify
export async function POST(request: NextRequest) {
  try {
    const { shop, accessToken, force } = await request.json();
    
    if (!shop || !accessToken) {
      return NextResponse.json({ error: 'Shop and accessToken required' }, { status: 400 });
    }

    // Create session object for Shopify client
    const session = {
      id: `${shop}_session`,
      shop,
      state: 'authenticated',
      isOnline: false,
      accessToken,
      scope: process.env.SHOPIFY_SCOPES || ''
    };

    const client = createAdminApiClient(session as any);
    const vectorMatcher = VectorMatcher.getInstance();
    
    // If force is true, clear existing index
    if (force) {
      vectorMatcher.clearIndex();
    }

    let hasNextPage = true;
    let cursor: string | null = null;
    let totalProducts = 0;
    let totalVariants = 0;
    const errors: string[] = [];

    console.log(`Starting product sync for shop: ${shop}`);

    while (hasNextPage) {
      try {
        const variables: any = { first: 50 };
        if (cursor) {
          variables.after = cursor;
        }

        const response = await client.request(GET_PRODUCTS_QUERY, { variables });
        
        if (response.errors) {
          console.error('GraphQL errors:', response.errors);
          errors.push(`GraphQL errors: ${JSON.stringify(response.errors)}`);
          break;
        }

        const products = response.data?.products?.edges || [];
        
        for (const productEdge of products) {
          const product = productEdge.node;
          totalProducts++;
          
          // Process each variant
          const variants = product.variants?.edges || [];
          for (const variantEdge of variants) {
            try {
              const shopifyVariant = variantEdge.node;
              
              // Extract wig attributes from product/variant metafields
              const wigAttributes = extractWigAttributes(product, shopifyVariant);
              
              // Create our variant object
              const variant: Variant = {
                id: shopifyVariant.id,
                productId: product.id,
                title: `${product.title} - ${shopifyVariant.title}`,
                price: shopifyVariant.price,
                compareAtPrice: shopifyVariant.compareAtPrice,
                availableForSale: shopifyVariant.availableForSale,
                image: shopifyVariant.image ? {
                  url: shopifyVariant.image.url,
                  altText: shopifyVariant.image.altText || ''
                } : undefined,
                selectedOptions: shopifyVariant.selectedOptions || [],
                wigAttributes
              };
              
              // Add to vector index
              vectorMatcher.addVariant(variant);
              totalVariants++;
              
            } catch (variantError) {
              console.error(`Error processing variant ${variantEdge.node.id}:`, variantError);
              errors.push(`Variant ${variantEdge.node.id}: ${variantError}`);
            }
          }
        }

        // Check pagination
        const pageInfo = response.data?.products?.pageInfo;
        hasNextPage = pageInfo?.hasNextPage || false;
        cursor = pageInfo?.endCursor || null;
        
        console.log(`Processed ${totalProducts} products, ${totalVariants} variants so far...`);
        
      } catch (pageError) {
        console.error('Error processing page:', pageError);
        errors.push(`Page error: ${pageError}`);
        hasNextPage = false;
      }
    }

    const stats = vectorMatcher.getStats();
    
    console.log(`Product sync completed. Products: ${totalProducts}, Variants: ${totalVariants}`);

    return NextResponse.json({
      success: true,
      message: 'Product catalog synced successfully',
      stats: {
        totalProducts,
        totalVariants,
        ...stats
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Catalog sync error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Webhook handler for product updates
export async function PUT(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const rawBody = await request.text();
    
    if (!signature || !verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    const topic = request.headers.get('x-shopify-topic');
    
    console.log(`Received webhook: ${topic}`);
    
    const vectorMatcher = VectorMatcher.getInstance();
    
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductUpdate(webhookData, vectorMatcher);
        break;
        
      case 'products/delete':
        await handleProductDelete(webhookData, vectorMatcher);
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleProductUpdate(productData: any, vectorMatcher: VectorMatcher) {
  try {
    // For webhook data, we might not have all the metafields
    // In a production app, you'd fetch the full product data here
    const variants = productData.variants || [];
    
    for (const shopifyVariant of variants) {
      // Extract wig attributes (simplified for webhook)
      const wigAttributes = extractWigAttributes(productData, shopifyVariant);
      
      const variant: Variant = {
        id: shopifyVariant.id?.toString() || `${productData.id}_${shopifyVariant.id}`,
        productId: productData.id?.toString() || '',
        title: `${productData.title} - ${shopifyVariant.title}`,
        price: shopifyVariant.price,
        compareAtPrice: shopifyVariant.compare_at_price,
        availableForSale: shopifyVariant.available || false,
        image: shopifyVariant.image_id ? {
          url: `https://cdn.shopify.com/s/files/1/0000/0000/0000/products/image.jpg`, // Placeholder
          altText: productData.title
        } : undefined,
        selectedOptions: shopifyVariant.option1 ? [
          { name: 'Option 1', value: shopifyVariant.option1 }
        ] : [],
        wigAttributes
      };
      
      // Update in vector index
      vectorMatcher.addVariant(variant);
    }
    
    console.log(`Updated product ${productData.id} with ${variants.length} variants`);
    
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

async function handleProductDelete(productData: any, vectorMatcher: VectorMatcher) {
  try {
    // Remove all variants for this product from the vector index
    const variants = productData.variants || [];
    
    for (const variant of variants) {
      const variantId = variant.id?.toString() || `${productData.id}_${variant.id}`;
      vectorMatcher.removeVariant(variantId);
    }
    
    console.log(`Deleted product ${productData.id} with ${variants.length} variants`);
    
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    // Check if Shopify API is available
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json({
        success: true,
        stats: {
          totalVariants: 0,
          indexedVariants: 0
        },
        lastSync: null,
        shopifyConfigured: false,
        message: 'Shopify API credentials not configured'
      });
    }

    const vectorMatcher = VectorMatcher.getInstance();
    const stats = vectorMatcher.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      lastSync: new Date().toISOString(), // In production, store this in database
      shopifyConfigured: true
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        totalVariants: 0,
        indexedVariants: 0
      },
      lastSync: null
    }, { status: 200 }); // Return 200 with error details for graceful handling
  }
}
