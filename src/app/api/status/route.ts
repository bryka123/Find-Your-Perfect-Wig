import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API server is running',
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      openai_key_preview: process.env.OPENAI_API_KEY?.substring(0, 20) + '...',
      vector_store_id: process.env.OPENAI_VECTOR_STORE_ID
    },
    dynamic_chunks: {
      available: require('fs').existsSync('./dynamic_chunks/dynamic_index.json'),
      index_file: './dynamic_chunks/dynamic_index.json'
    }
  });
}

export async function POST() {
  return NextResponse.json({
    message: 'Status endpoint - use GET for status information'
  });
}






