import { NextRequest, NextResponse } from 'next/server';
import { OpenAIVectorStore } from '@/lib/vectors';

// Default vector store ID - should be set via environment variable
const DEFAULT_VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { q: query, vectorStoreId, k = 24 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter "q" is required and must be a string' },
        { status: 400 }
      );
    }

    const storeId = vectorStoreId || DEFAULT_VECTOR_STORE_ID;
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'Vector store ID not configured. Set OPENAI_VECTOR_STORE_ID environment variable or provide vectorStoreId in request.' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log(`Processing vector search query: "${query}"`);

    const vectorStore = OpenAIVectorStore.getInstance();
    const results = await vectorStore.search(storeId, query, k);

    console.log(`Vector search returned ${results.length} results`);

    return NextResponse.json({
      success: true,
      query,
      vectorStoreId: storeId,
      results: results,
      total: results.length,
      k: k
    });

  } catch (error) {
    console.error('Vector search error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('vector_store')) {
        return NextResponse.json(
          { error: 'Vector store not found or not accessible', details: error.message },
          { status: 404 }
        );
      } else if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API authentication failed', details: error.message },
          { status: 401 }
        );
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'OpenAI API quota or rate limit exceeded', details: error.message },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const k = parseInt(searchParams.get('k') || '24');
    const vectorStoreId = searchParams.get('vectorStoreId');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Reuse the POST logic
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, k, vectorStoreId })
    }));

    return response;

  } catch (error) {
    console.error('GET vector search error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Additional endpoint to list vector stores
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const vectorStore = OpenAIVectorStore.getInstance();

    switch (action) {
      case 'list':
        const stores = await vectorStore.listVectorStores();
        return NextResponse.json({
          success: true,
          vectorStores: stores
        });

      case 'create':
        const { name } = body;
        if (!name) {
          return NextResponse.json(
            { error: 'Name is required for creating vector store' },
            { status: 400 }
          );
        }
        const newStoreId = await vectorStore.createVectorStore(name);
        return NextResponse.json({
          success: true,
          vectorStoreId: newStoreId,
          message: `Vector store "${name}" created successfully`
        });

      case 'delete':
        const { vectorStoreId } = body;
        if (!vectorStoreId) {
          return NextResponse.json(
            { error: 'vectorStoreId is required for deletion' },
            { status: 400 }
          );
        }
        await vectorStore.deleteVectorStore(vectorStoreId);
        return NextResponse.json({
          success: true,
          message: `Vector store ${vectorStoreId} deleted successfully`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: list, create, delete' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Vector store management error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}










