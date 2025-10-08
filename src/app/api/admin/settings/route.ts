import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db/manager';
import { ScoringWeights, ColorFamilySettings } from '@/lib/db/schema';

// GET - Load app settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop') || 'demo-shop.myshopify.com'; // Get from auth in production
    
    const db = DatabaseManager.getInstance();
    const settings = await db.getAppSettings(shop);
    const stats = await db.getStats(shop);
    
    return NextResponse.json({
      success: true,
      settings,
      stats
    });

  } catch (error) {
    console.error('Error loading app settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Update app settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, action, data } = body;
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();

    switch (action) {
      case 'update_weights':
        const weights: ScoringWeights = data;
        
        // Validate weights total to 1.0
        const total = weights.color + weights.texture + weights.availability + weights.popularity + weights.capFeature;
        if (Math.abs(total - 1.0) > 0.01) {
          return NextResponse.json(
            { error: `Weights must total 1.0, got ${total}` },
            { status: 400 }
          );
        }
        
        const updatedSettings = await db.updateScoringWeights(shop, weights);
        return NextResponse.json({
          success: true,
          message: 'Scoring weights updated successfully',
          settings: updatedSettings
        });

      case 'update_color_families':
        const colorFamilies: ColorFamilySettings[] = data;
        const updatedColorSettings = await db.updateColorFamilies(shop, colorFamilies);
        return NextResponse.json({
          success: true,
          message: 'Color families updated successfully',
          settings: updatedColorSettings
        });

      case 'create_color_family':
        const newFamily = await db.createColorFamily(shop, data);
        return NextResponse.json({
          success: true,
          message: 'Color family created successfully',
          colorFamily: newFamily
        });

      case 'update_color_family':
        const { familyId, updates } = data;
        const updated = await db.updateColorFamily(shop, familyId, updates);
        if (updated) {
          return NextResponse.json({
            success: true,
            message: 'Color family updated successfully',
            colorFamily: updated
          });
        } else {
          return NextResponse.json({ error: 'Color family not found' }, { status: 404 });
        }

      case 'delete_color_family':
        const { familyId: deleteId } = data;
        const deleted = await db.deleteColorFamily(shop, deleteId);
        if (deleted) {
          return NextResponse.json({
            success: true,
            message: 'Color family deleted successfully'
          });
        } else {
          return NextResponse.json({ error: 'Color family not found' }, { status: 404 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating app settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Reset to defaults
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop') || 'demo-shop.myshopify.com';
    
    const db = DatabaseManager.getInstance();
    
    // Reset to default settings
    const defaultSettings = await db.getAppSettings(shop); // This creates defaults
    await db.updateAppSettings(shop, defaultSettings);
    
    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults',
      settings: defaultSettings
    });

  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}










