import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db/manager';

// GET - Load logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop') || 'demo-shop.myshopify.com';
    const type = searchParams.get('type') || 'all'; // sync, webhook, error, all
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const db = DatabaseManager.getInstance();
    let logs: any = {};

    switch (type) {
      case 'sync':
        logs.syncLogs = await db.getSyncLogs(shop, limit);
        break;
      case 'webhook':
        logs.webhookLogs = await db.getWebhookLogs(shop, limit);
        break;
      case 'error':
        logs.errorLogs = await db.getErrorLogs(shop, limit);
        break;
      case 'all':
      default:
        logs.syncLogs = await db.getSyncLogs(shop, Math.floor(limit / 3));
        logs.webhookLogs = await db.getWebhookLogs(shop, Math.floor(limit / 3));
        logs.errorLogs = await db.getErrorLogs(shop, Math.floor(limit / 3));
        break;
    }

    return NextResponse.json({
      success: true,
      logs,
      type,
      limit
    });

  } catch (error) {
    console.error('Error loading logs:', error);
    return NextResponse.json(
      { error: 'Failed to load logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, type, logData } = body;
    
    if (!shop || !type || !logData) {
      return NextResponse.json({ error: 'Shop, type, and logData required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();
    let newLog: any;

    switch (type) {
      case 'sync':
        newLog = await db.addSyncLog(logData);
        break;
      case 'webhook':
        newLog = await db.addWebhookLog(logData);
        break;
      case 'error':
        newLog = await db.addErrorLog(logData);
        break;
      default:
        return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Log entry created successfully',
      log: newLog
    });

  } catch (error) {
    console.error('Error creating log entry:', error);
    return NextResponse.json(
      { error: 'Failed to create log entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update log entry (e.g., mark error as resolved)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, action, errorId } = body;
    
    if (!shop || !action) {
      return NextResponse.json({ error: 'Shop and action required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();

    switch (action) {
      case 'resolve_error':
        if (!errorId) {
          return NextResponse.json({ error: 'Error ID required' }, { status: 400 });
        }
        
        const resolved = await db.markErrorResolved(shop, errorId);
        if (resolved) {
          return NextResponse.json({
            success: true,
            message: 'Error marked as resolved'
          });
        } else {
          return NextResponse.json({ error: 'Error not found' }, { status: 404 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating log entry:', error);
    return NextResponse.json(
      { error: 'Failed to update log entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}







