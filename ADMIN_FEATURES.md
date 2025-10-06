# Admin Dashboard Features

The Chiquel Wig Matcher admin dashboard now includes comprehensive management capabilities for sync monitoring, color families, and scoring weights configuration.

## 🎛️ **Enhanced Dashboard Features**

### **📊 Multi-Tab Interface**
- **Overview**: System stats and quick actions
- **Sync & Logs**: Monitoring and error tracking  
- **Color Manager**: Color family and undertone management
- **Scoring Weights**: AI matching weights configuration

### **🔄 Sync Management**
- **Last Sync Status**: Real-time sync monitoring
- **Webhook Status**: Active/disabled webhook tracking
- **Auto Sync Configuration**: Scheduled sync settings
- **Sync History**: Detailed activity logs with performance metrics

### **🎨 Color Family Manager**
- **Visual Color Editor**: Hex and LAB color space management
- **Undertone Configuration**: Warm/cool/neutral undertone settings
- **Rooted Variants**: SS (Shaded), RT (Rooted), HL (Highlighted) support
- **Color Science Integration**: LAB values for ΔE calculations

### **⚖️ Scoring Weights Configuration**
- **Interactive Sliders**: Real-time weight adjustment
- **Validation**: Automatic 100% total validation
- **Live Preview**: See how changes affect matching
- **Persistence**: Settings saved to database/metafields

## 🏗️ **Database Schema**

### **App Settings Structure**
```typescript
interface AppSettings {
  id: string;
  shop: string;
  scoringWeights: {
    color: 0.55,        // Color matching importance
    texture: 0.20,      // Texture matching importance  
    availability: 0.10, // Stock availability weight
    popularity: 0.10,   // Popularity/price proxy weight
    capFeature: 0.05    // Premium cap construction bonus
  };
  colorFamilies: ColorFamilySettings[];
  syncSettings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    webhooksEnabled: boolean;
    lastSync?: Date;
    lastSyncStatus: 'success' | 'failed' | 'pending' | 'never';
  };
}
```

### **Color Family Configuration**
```typescript
interface ColorFamilySettings {
  id: string;
  name: string;           // 'blonde'
  displayName: string;    // 'Golden Blonde'
  labValues: [85, 5, 25]; // LAB color space
  hexColor: '#F7E7A1';   // UI display color
  enabled: boolean;
  
  undertones: [{
    id: 'blonde_warm',
    name: 'warm',
    description: 'Golden, honey, strawberry undertones',
    labAdjustment: [0, 5, 10],
    examples: ['Golden Blonde', 'Honey Blonde']
  }];
  
  rootedVariants: [{
    id: 'blonde_rooted_ss',
    name: 'SS (Shaded)',
    description: 'Darker roots with blonde lengths',
    rootColor: 'brunette',
    tipColor: 'blonde',
    gradientType: 'linear'
  }];
}
```

## 🔧 **API Endpoints**

### **Settings Management**
```bash
# Get current settings
GET /api/admin/settings?shop=store.myshopify.com

# Update scoring weights
POST /api/admin/settings
{
  "shop": "store.myshopify.com",
  "action": "update_weights",
  "data": {
    "color": 0.60,
    "texture": 0.15,
    "availability": 0.10,
    "popularity": 0.10,
    "capFeature": 0.05
  }
}

# Create color family
POST /api/admin/settings
{
  "shop": "store.myshopify.com", 
  "action": "create_color_family",
  "data": {
    "name": "rose_gold",
    "displayName": "Rose Gold",
    "labValues": [75, 15, 20],
    "hexColor": "#E8B4CB",
    "enabled": true,
    "undertones": [...],
    "rootedVariants": [...]
  }
}
```

### **Logging & Monitoring**
```bash
# Get all logs
GET /api/admin/logs?shop=store.myshopify.com&type=all&limit=50

# Get specific log type
GET /api/admin/logs?type=error&limit=20

# Mark error as resolved
PATCH /api/admin/logs
{
  "shop": "store.myshopify.com",
  "action": "resolve_error", 
  "errorId": "error_123"
}
```

### **Authentication**
```bash
# Create demo session
POST /api/admin/auth
{"demo": true}

# Validate session
GET /api/admin/auth

# Logout
DELETE /api/admin/auth
```

## 🎨 **Color Manager Features**

### **Default Color Families**
1. **Blonde Family**
   - **Undertones**: Warm (golden, honey), Cool (ash, platinum)
   - **Rooted Variants**: SS (Shaded), RT (Rooted)
   - **LAB Values**: [85, 5, 25]

2. **Brunette Family**
   - **Undertones**: Warm (golden, caramel), Cool (ash, espresso)
   - **Rooted Variants**: HL (Highlighted)
   - **LAB Values**: [35, 10, 20]

3. **Red Family**
   - **Undertones**: Warm (copper, auburn), Cool (burgundy, wine)
   - **Rooted Variants**: OM (Ombre)
   - **LAB Values**: [45, 35, 25]

4. **Black Family**
   - **Undertones**: Neutral (true black), Blue (blue black)
   - **LAB Values**: [15, 0, 0]

### **Rooted Variant Types**
- **SS (Shaded)**: Darker roots with lighter lengths
- **RT (Rooted)**: Gradual root-to-tip color transition
- **HL (Highlighted)**: Base color with contrasting highlights
- **OM (Ombre)**: Dramatic dark-to-light transition
- **TT (Tipped)**: Colored tips on natural base

## ⚖️ **Scoring Weights Manager**

### **Weight Categories**
- **Color Matching (55%)**: Most critical factor
  - ΔE color science calculations
  - Color family compatibility
  - Undertone matching

- **Texture Matching (20%)**: Secondary importance
  - Straight, wavy, curly preferences
  - Texture compatibility scoring

- **Availability (10%)**: Stock status
  - Binary in-stock scoring
  - Inventory level consideration

- **Popularity (10%)**: Market appeal
  - Price-based popularity proxy
  - Historical performance data

- **Cap Features (5%)**: Construction quality
  - Lace front premium bonus
  - Monofilament quality scoring
  - Hand-tied construction premium

### **Weight Validation**
- **Total Constraint**: Must sum to exactly 1.0 (100%)
- **Range Limits**: Each weight has logical min/max bounds
- **Real-time Feedback**: Live total calculation display
- **Error Prevention**: Visual warnings for invalid totals

## 📊 **Monitoring & Logging**

### **Sync Activity Tracking**
```javascript
const syncLog = {
  id: 'sync_1640995200000_abc123',
  shop: 'store.myshopify.com',
  timestamp: new Date(),
  type: 'manual' | 'webhook' | 'scheduled',
  status: 'success' | 'failed' | 'pending',
  stats: {
    totalProducts: 1234,
    totalVariants: 5678,
    processed: 5678,
    errors: []
  },
  duration: 15000 // milliseconds
};
```

### **Webhook Monitoring**
```javascript
const webhookLog = {
  id: 'webhook_1640995200000_def456',
  shop: 'store.myshopify.com',
  timestamp: new Date(),
  topic: 'products/update',
  status: 'success',
  payload: { /* webhook data */ },
  processingTime: 245
};
```

### **Error Tracking**
```javascript
const errorLog = {
  id: 'error_1640995200000_ghi789',
  shop: 'store.myshopify.com',
  timestamp: new Date(),
  level: 'error' | 'warning' | 'info',
  source: 'sync' | 'webhook' | 'api' | 'matching' | 'vector_store',
  message: 'Failed to process product variant',
  details: { /* error context */ },
  resolved: false
};
```

## 🔐 **Authentication System**

### **Admin Session Management**
- **Session Creation**: Shop-specific admin sessions
- **Permission System**: Role-based access control
- **Session Validation**: Automatic expiry and cleanup
- **Secure Storage**: HttpOnly cookies with CSRF protection

### **Demo Mode**
For development, the system includes a demo mode:
```bash
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"demo": true}'
```

## 🎯 **Dashboard Usage**

### **1. Overview Tab**
- **Quick Stats**: Variants, sync history, system health
- **Action Buttons**: Manual sync, CSV import
- **Health Indicators**: Error count, webhook status

### **2. Sync & Logs Tab**  
- **Webhook Status**: Active/disabled with event count
- **Auto Sync Settings**: Enabled/disabled with interval
- **Recent Activity**: Sync history with performance data
- **Error Log**: Filterable error list with resolution actions

### **3. Color Manager Tab**
- **Color Family List**: Visual color swatches with LAB values
- **Quick Actions**: Edit, delete, enable/disable
- **Add New**: Create custom color families
- **Undertone Editor**: Warm/cool variant configuration

### **4. Scoring Weights Tab**
- **Interactive Sliders**: Real-time weight adjustment
- **Live Total**: Running total with validation
- **Category Descriptions**: Clear explanations for each weight
- **Save/Cancel**: Persistent configuration management

## 🧪 **Testing & Validation**

### **Test Coverage**
```bash
npm test
# ✅ Database operations (CRUD)
# ✅ Authentication flows
# ✅ Weight validation
# ✅ Color family management
# ✅ Error handling
```

### **Manual Testing Checklist**
- [ ] Dashboard loads with all tabs
- [ ] Scoring weights sliders work and validate
- [ ] Color families can be created/edited/deleted
- [ ] Sync logs display correctly
- [ ] Error resolution works
- [ ] Authentication persists across sessions
- [ ] Mobile responsive design

### **API Testing**
```bash
# Test settings CRUD
curl -X GET "http://localhost:3000/api/admin/settings?shop=demo-shop.myshopify.com"

# Test weight updates
curl -X POST http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"shop":"demo-shop.myshopify.com","action":"update_weights","data":{"color":0.6,"texture":0.15,"availability":0.1,"popularity":0.1,"capFeature":0.05}}'

# Test color family creation
curl -X POST http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"shop":"demo-shop.myshopify.com","action":"create_color_family","data":{"name":"custom","displayName":"Custom Color","labValues":[50,25,25],"hexColor":"#FF6B6B","enabled":true,"undertones":[],"rootedVariants":[]}}'
```

## 🚀 **Production Deployment**

### **Environment Variables**
```env
# Database URL (replace in-memory storage)
DATABASE_URL=postgresql://user:pass@host:port/db

# Admin authentication
ADMIN_SECRET_KEY=your-secret-key
SESSION_ENCRYPTION_KEY=32-char-encryption-key

# Shopify metafield storage (alternative to database)
USE_SHOPIFY_METAFIELDS=true
METAFIELD_NAMESPACE=chiquel_admin
```

### **Database Migration**
For production, migrate from in-memory storage to persistent database:
1. **PostgreSQL**: Full-featured SQL database
2. **SQLite**: Lightweight local database  
3. **Shopify Metafields**: Store in Shopify's system

### **Security Considerations**
- **CSRF Protection**: Validate request origins
- **Rate Limiting**: Prevent abuse of admin endpoints
- **Input Validation**: Sanitize all admin inputs
- **Audit Logging**: Track all admin actions

---

**Result**: A **comprehensive admin management system** with sync monitoring, color science configuration, and intelligent scoring weight management, all with proper authentication and CRUD operations for professional store management. 🎛️✨







