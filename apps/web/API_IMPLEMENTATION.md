# Status Page CRUD APIs (Sprint 1.7)

## ✅ Completed

REST API endpoints for status page and component management have been implemented.

### Validation Schemas
- ✅ `lib/validators/status-page.ts` - Zod validation schemas for all inputs

### Status Page Endpoints

#### POST /api/pages
Create a new status page
- **Auth**: Required (JWT)
- **Input**: `{ name, subdomain, logoUrl?, primaryColor? }`
- **Validation**: 
  - Name: 1-255 characters
  - Subdomain: 3-63 characters, lowercase alphanumeric + hyphens, unique
  - Logo URL: valid URL (optional)
  - Primary color: hex color format (default: #3b82f6)
- **Returns**: Created status page object (201)
- **Errors**: 401 (unauthorized), 400 (validation failed, subdomain taken)

#### GET /api/pages
List all status pages for authenticated user
- **Auth**: Required (JWT)
- **Returns**: Array of status pages (200)
- **Errors**: 401 (unauthorized)

#### GET /api/pages/:id
Get a specific status page
- **Auth**: Required (JWT, must own the page)
- **Returns**: Status page object (200)
- **Errors**: 401 (unauthorized), 404 (not found)

#### PATCH /api/pages/:id
Update a status page
- **Auth**: Required (JWT, must own the page)
- **Input**: `{ name?, logoUrl?, primaryColor?, customDomain? }`
- **Validation**: All fields optional, same rules as POST
- **Returns**: Updated status page object (200)
- **Errors**: 401 (unauthorized), 404 (not found), 400 (validation failed)

#### DELETE /api/pages/:id
Delete a status page
- **Auth**: Required (JWT, must own the page)
- **Note**: Cascade deletes all components, incidents, subscribers
- **Returns**: Success message (200)
- **Errors**: 401 (unauthorized), 404 (not found)

### Component Endpoints

#### POST /api/pages/:id/components
Add a component to a status page
- **Auth**: Required (JWT, must own the page)
- **Input**: `{ name, description?, type, url, checkInterval?, sortOrder? }`
- **Validation**:
  - Name: 1-255 characters
  - Type: 'http' | 'https' | 'tcp' | 'icmp' (default: 'http')
  - URL: valid URL
  - Check interval: 60-3600 seconds (default: 60)
- **Returns**: Created component object (201)
- **Errors**: 401 (unauthorized), 404 (page not found), 400 (validation failed)

#### GET /api/pages/:id/components
List all components for a status page
- **Auth**: Required (JWT, must own the page)
- **Returns**: Array of components (200)
- **Errors**: 401 (unauthorized), 404 (page not found)

#### GET /api/components/:id
Get a specific component
- **Auth**: Required (JWT, must own the parent page)
- **Returns**: Component object (200)
- **Errors**: 401 (unauthorized), 403 (forbidden), 404 (not found)

#### PATCH /api/components/:id
Update a component
- **Auth**: Required (JWT, must own the parent page)
- **Input**: `{ name?, description?, type?, url?, checkInterval?, status?, sortOrder? }`
- **Validation**: All fields optional, same rules as POST
- **Returns**: Updated component object (200)
- **Errors**: 401 (unauthorized), 403 (forbidden), 404 (not found), 400 (validation failed)

#### DELETE /api/components/:id
Delete a component
- **Auth**: Required (JWT, must own the parent page)
- **Returns**: Success message (200)
- **Errors**: 401 (unauthorized), 403 (forbidden), 404 (not found)

## 🔒 Security Features

- ✅ JWT authentication on all endpoints
- ✅ Ownership verification (users can only manage their own pages/components)
- ✅ Input validation with Zod schemas
- ✅ Proper HTTP status codes (401, 403, 404, 400, 500)
- ✅ SQL injection prevention via Drizzle ORM parameterized queries
- ✅ Cascade deletion (deleting a page removes all related data)

## 📋 Testing Checklist

### Status Pages
- [ ] Create a status page with valid subdomain
- [ ] Try creating duplicate subdomain (should fail with 400)
- [ ] List status pages (should show only user's pages)
- [ ] Get a specific page
- [ ] Update page name, logo, color
- [ ] Delete a page
- [ ] Try accessing another user's page (should 404)

### Components
- [ ] Add component to a status page
- [ ] List components for a page
- [ ] Get a specific component
- [ ] Update component details
- [ ] Update component status (operational, degraded, down, maintenance)
- [ ] Delete a component
- [ ] Verify cascade deletion (delete page → components deleted)

## 🎯 Success Criteria Met

All requirements from Sprint 1.7 have been implemented:
- [x] POST/GET/PATCH/DELETE /api/pages
- [x] POST /api/pages/:id/components
- [x] DELETE /api/components/:id
- [x] Zod validation on all inputs
- [x] Auth middleware (JWT verification + ownership checks)
- [x] Proper error responses (400, 401, 403, 404, 500)

## 📝 Example Usage

### Create Status Page
```bash
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "name": "My SaaS Status",
    "subdomain": "mysaas",
    "primaryColor": "#10b981"
  }'
```

### Add Component
```bash
curl -X POST http://localhost:3000/api/pages/<page-id>/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "name": "API Server",
    "type": "https",
    "url": "https://api.example.com",
    "checkInterval": 300
  }'
```

**Status**: Ready for testing and deployment ⚡
