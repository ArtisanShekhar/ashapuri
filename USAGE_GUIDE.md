# Ashapuri Dashboard Usage Guide

This guide explains how to run and use the single Laravel app (`backend`) for Phase 1.

## 1) Login Availability

Yes, login is implemented with JWT and role-based access.

- Endpoint: `POST /api/auth/login`
- Default seeded user:
  - Email: `gm@ashapurivillage.in`
  - Password: `password123`
- Other role users:
  - `store@ashapurivillage.in` / `password123`
  - `kitchen@ashapurivillage.in` / `password123`

Login UI opens first at `/`, then redirects to `/dashboard` after success.

## Seeded Demo Data (From Brief)

`php artisan db:seed` now loads realistic Phase-1 operational data based on your project description:

- 30 days of Store purchases
- 30 days of Kitchen submissions for breakfast/lunch/dinner
- Dish waste rows matching your sample pattern:
  - Paneer Butter Masala
  - Chicken Curry
  - Plain Rice
- Vendor pricing examples from brief:
  - Coffee at high overpay levels (vs market)
  - Paneer moderate overpay
  - Rice near market rate
- Price spike days included for alert testing

## 2) One-Time Setup

From `backend` folder:

1. `copy .env.example .env`
2. `php artisan key:generate`
3. `php artisan migrate --seed`
4. `npm install`

Optional for AI:

- Add `ANTHROPIC_API_KEY=your_key_here` in `.env`
- (Optional) set `ANTHROPIC_MODEL`

## 3) Run the App

Open 2 terminals inside `backend`:

- Terminal 1: `php artisan serve`
- Terminal 2: `npm run dev`

Then open:
- `http://127.0.0.1:8000`

## 4) What You Can Use Right Now

### Dashboard

- Tabs:
  - Ops
  - Store
- Role control:
  - Admin/GM: full dashboard + AI + both forms
  - Store: store tab + store form
  - Kitchen: ops tab + kitchen form
- KPI cards:
  - Guests Served
  - Food Waste
  - Cost Per Cover
- KPI cards are clickable and open drill-down detail panels
- Charts:
  - Guest trend
  - Waste trend
  - Cost per cover trend
- Vendor analysis table:
  - Cost vs market rate
  - Overpay and monthly loss
- AI chat box at bottom

### Forms
- Store / Procurement form follows brief fields:
  - Date, vendor, item, category, qty, unit, cost/unit, total auto, market rate, notes, issued to kitchen
- Kitchen Daily Log follows brief sections:
  - Basics, Before Service, Dishes & Waste rows, During Service, End of Service, Notes

### API Endpoints

- Auth:
  - `POST /api/auth/login`
- Store:
  - `POST /api/store/purchases`
  - `GET /api/store/purchases`
  - `GET /api/store/vendor-analysis`
  - `GET /api/store/price-alerts`
- Kitchen:
  - `POST /api/kitchen/submissions`
  - `GET /api/kitchen/submissions`
- Dashboard:
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/guests`
  - `GET /api/dashboard/waste`
  - `GET /api/dashboard/cost-per-cover`
- AI:
  - `POST /api/ai/chat`
  - `POST /api/ai/daily-summary`
  - `GET /api/ai/insights`

## 5) Quick API Examples (PowerShell)

### Login

```powershell
$body = @{ email="gm@ashapurivillage.in"; password="password123" } | ConvertTo-Json
$resp = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/auth/login" -ContentType "application/json" -Body $body
$token = $resp.token
```

### Get Dashboard Summary

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/dashboard/summary" -Headers @{ Authorization = "Bearer $token" }
```

### Add Store Purchase

```powershell
$purchase = @{
  date = "2026-04-30"
  vendor_name = "Sharma Provisions"
  item_name = "Coffee"
  item_category = "Beverages"
  quantity = 5
  unit = "packet"
  cost_per_unit = 60
  market_rate = 42
  notes = "Quality average"
  issued_to_kitchen_qty = 3
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/store/purchases" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $purchase
```

## 6) Troubleshooting

- `Invalid token`:
  - Login again and use new bearer token.
- AI gives fallback text:
  - Set `ANTHROPIC_API_KEY` in `.env`.
- Blank page or assets not loading:
  - Ensure `npm run dev` is running.
- Database errors:
  - Run `php artisan migrate --seed` again.

## 7) Next Improvements (Suggested)

- Add manual login page (UI form) instead of auto-login.
- Add dedicated Store and Kitchen data-entry screens.
- Add drill-down pages for KPI cards.
- Add role-based access (GM / Store / Kitchen).
