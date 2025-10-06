import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'not found';

  return NextResponse.json({
    hasKey,
    keyPrefix,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI')),
  });
}
