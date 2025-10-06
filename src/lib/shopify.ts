import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

// Initialize Shopify API configuration (conditional for development)
let shopify: any = null;

try {
  if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
    shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
      hostName: (process.env.HOST || 'http://localhost:3000').replace('https://', '').replace('http://', ''),
      apiVersion: ApiVersion.October24,
      isEmbeddedApp: true,
      // Configure session storage (you may want to use a database in production)
      sessionStorage: new Map(),
    });
  } else {
    console.warn('Shopify API credentials not configured - some features will be disabled');
  }
} catch (error) {
  console.warn('Failed to initialize Shopify API:', error);
}

// Create Admin API client
export function createAdminApiClient(session: Session) {
  if (!shopify) {
    throw new Error('Shopify API not initialized - check your environment variables');
  }
  return shopify.clients.graphqlProxy({
    session,
    rawBody: ''
  });
}

// Create REST API client 
export function createRestApiClient(session: Session) {
  if (!shopify) {
    throw new Error('Shopify API not initialized - check your environment variables');
  }
  return new shopify.clients.Rest({
    session,
  });
}

// GraphQL query helper
export async function queryShopifyGraphQL(session: Session, query: string, variables?: Record<string, unknown>) {
  if (!shopify) {
    throw new Error('Shopify API not initialized - check your environment variables');
  }
  const client = new shopify.clients.Graphql({ session });
  return await client.query({
    data: { query, variables }
  });
}

// GraphQL queries for product data
export const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          vendor
          productType
          tags
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 250) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                availableForSale
                selectedOptions {
                  name
                  value
                }
                image {
                  id
                  url
                  altText
                }
                metafields(first: 50) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const CREATE_PRODUCT_METAFIELD_QUERY = `
  mutation createProductMetafield($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        metafields(first: 10) {
          edges {
            node {
              id
              namespace
              key
              value
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const BULK_OPERATION_QUERY = `
  mutation bulkOperationRunQuery($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const BULK_OPERATION_STATUS_QUERY = `
  query bulkOperationStatus($id: ID!) {
    node(id: $id) {
      ... on BulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  }
`;

// Webhook verification
export function verifyWebhook(rawBody: string, signature: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET);
  hmac.update(rawBody, 'utf8');
  const hash = hmac.digest('base64');
  return hash === signature;
}

// OAuth helper functions
export async function beginAuth(shop: string, callbackPath: string, isOnline = false) {
  return await shopify.auth.begin({
    shop: shopify.utils.sanitizeShop(shop, true)!,
    callbackPath,
    isOnline,
    rawRequest: {} as never,
    rawResponse: {} as never,
  });
}

export async function validateAuth(query: Record<string, string>, callbackPath: string, isOnline = false) {
  return await shopify.auth.callback({
    rawRequest: { query } as never,
    rawResponse: {} as never,
  });
}

// Session management
export async function loadSession(sessionId: string): Promise<Session | undefined> {
  // In production, load from database
  // For now, using in-memory storage
  return (shopify.config.sessionStorage as Map<string, Session>).get(sessionId);
}

export async function storeSession(session: Session): Promise<boolean> {
  // In production, store in database
  // For now, using in-memory storage
  (shopify.config.sessionStorage as Map<string, Session>).set(session.id, session);
  return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  // In production, delete from database
  // For now, using in-memory storage
  return (shopify.config.sessionStorage as Map<string, Session>).delete(sessionId);
}

// Product utility functions
export function extractWigAttributes(product: Record<string, unknown>, variant: Record<string, unknown>) {
  // Extract wig-specific attributes from product/variant metafields
  // This will be customized based on how wig attributes are stored
  const attributes = {
    length: 'medium',
    texture: 'straight', 
    color: 'brunette',
    capSize: 'average',
    capConstruction: 'basic',
    density: 'medium',
    hairType: 'synthetic',
    style: 'classic'
  };

  // Look for wig attributes in metafields
  const metafields = [...(product.metafields?.edges || []), ...(variant.metafields?.edges || [])];
  
  for (const edge of metafields) {
    const metafield = edge.node;
    if (metafield.namespace === 'wig_attributes') {
      switch (metafield.key) {
        case 'length':
          attributes.length = metafield.value;
          break;
        case 'texture':
          attributes.texture = metafield.value;
          break;
        case 'color':
          attributes.color = metafield.value;
          break;
        case 'cap_size':
          attributes.capSize = metafield.value;
          break;
        case 'cap_construction':
          attributes.capConstruction = metafield.value;
          break;
        case 'density':
          attributes.density = metafield.value;
          break;
        case 'hair_type':
          attributes.hairType = metafield.value;
          break;
        case 'style':
          attributes.style = metafield.value;
          break;
      }
    }
  }

  return attributes;
}

export default shopify;
