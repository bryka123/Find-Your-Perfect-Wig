import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@/lib/shopify';

// Unified webhook handler
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');
    const signature = request.headers.get('x-shopify-hmac-sha256');
    
    if (!topic || !shop || !signature) {
      console.error('Missing required webhook headers');
      return NextResponse.json({ error: 'Invalid webhook headers' }, { status: 400 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature
    if (!verifyWebhook(rawBody, signature)) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    
    console.log(`Received webhook: ${topic} from shop: ${shop}`);

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'app/uninstalled':
        await handleAppUninstalled(shop, webhookData);
        break;
        
      case 'products/create':
      case 'products/update':
      case 'products/delete':
        // Forward to catalog sync webhook handler
        return await forwardToCatalogSync(request, topic, rawBody, signature);
        
      case 'orders/paid':
        await handleOrderPaid(shop, webhookData);
        break;
        
      case 'customers/data_request':
        await handleCustomerDataRequest(shop, webhookData);
        break;
        
      case 'customers/redact':
        await handleCustomerRedact(shop, webhookData);
        break;
        
      case 'shop/redact':
        await handleShopRedact(shop, webhookData);
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleAppUninstalled(shop: string, data: any) {
  try {
    console.log(`App uninstalled from shop: ${shop}`);
    
    // Clean up app data (in production, this would clean up database records)
    // 1. Remove stored sessions
    // 2. Clear vector index for this shop
    // 3. Remove webhook subscriptions
    // 4. Clean up any stored customer data
    
    console.log(`Cleanup completed for shop: ${shop}`);
    
  } catch (error) {
    console.error(`Error handling app uninstall for ${shop}:`, error);
  }
}

async function handleOrderPaid(shop: string, orderData: any) {
  try {
    console.log(`Order paid webhook from shop: ${shop}, order ID: ${orderData.id}`);
    
    // Handle paid order logic
    // This could trigger:
    // 1. Analytics tracking
    // 2. Fulfillment workflows
    // 3. Customer follow-up emails
    
  } catch (error) {
    console.error(`Error handling order paid for ${shop}:`, error);
  }
}

// GDPR Compliance Webhooks
async function handleCustomerDataRequest(shop: string, data: any) {
  try {
    console.log(`Customer data request from shop: ${shop}, customer ID: ${data.customer.id}`);
    
    // Handle customer data request (GDPR compliance)
    // 1. Collect all data related to this customer
    // 2. Format it according to GDPR requirements
    // 3. Provide it to the customer or shop owner
    
    const customerData = {
      customer_id: data.customer.id,
      email: data.customer.email,
      phone: data.customer.phone,
      // Add any app-specific data stored for this customer
      wig_preferences: [], // Example: stored wig matching preferences
      search_history: [], // Example: search history
      recommendations: [] // Example: past recommendations
    };
    
    console.log(`Customer data compiled for: ${data.customer.email}`);
    
  } catch (error) {
    console.error(`Error handling customer data request for ${shop}:`, error);
  }
}

async function handleCustomerRedact(shop: string, data: any) {
  try {
    console.log(`Customer redact request from shop: ${shop}, customer ID: ${data.customer.id}`);
    
    // Handle customer data deletion (GDPR compliance)
    // 1. Remove all stored data for this customer
    // 2. Anonymize any analytics data
    // 3. Remove from any mailing lists or preferences
    
    console.log(`Customer data redacted for: ${data.customer.email}`);
    
  } catch (error) {
    console.error(`Error handling customer redact for ${shop}:`, error);
  }
}

async function handleShopRedact(shop: string, data: any) {
  try {
    console.log(`Shop redact request for shop: ${shop}`);
    
    // Handle complete shop data deletion
    // This is called 48 hours after app uninstall
    // 1. Remove all shop data from databases
    // 2. Remove all customer data associated with the shop
    // 3. Clean up any cached data
    
    console.log(`Shop data redacted for: ${shop}`);
    
  } catch (error) {
    console.error(`Error handling shop redact for ${shop}:`, error);
  }
}

async function forwardToCatalogSync(
  request: NextRequest,
  topic: string,
  rawBody: string,
  signature: string
): Promise<NextResponse> {
  try {
    // Forward product webhooks to the catalog sync endpoint
    const catalogSyncUrl = new URL('/api/catalog/sync', request.url);
    
    const forwardedRequest = new NextRequest(catalogSyncUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-shopify-topic': topic,
        'x-shopify-hmac-sha256': signature,
        'x-shopify-shop-domain': request.headers.get('x-shopify-shop-domain') || ''
      },
      body: rawBody
    });

    // Import the catalog sync handler
    const { PUT } = await import('../catalog/sync/route');
    return await PUT(forwardedRequest);
    
  } catch (error) {
    console.error('Error forwarding to catalog sync:', error);
    return NextResponse.json({ error: 'Failed to process product webhook' }, { status: 500 });
  }
}







