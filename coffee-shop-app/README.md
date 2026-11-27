# Coffee Shop POS

A small point-of-sale and management web app for one coffee shop (college project).

- **Frontend:** React + Vite + Tailwind CSS (JavaScript)
- **Backend:** Node.js + Express (JavaScript)
- **Database:** MySQL 8

Two roles: **cashier** (takes orders, tracks orders, views history) and **admin** (dashboard, orders board, products, categories, history).

## Setup

You need Node.js 20+ and MySQL 8 running on your computer.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env          # then open .env and fill in DB_PASSWORD and JWT_SECRET
npm run db:migrate            # creates the database and tables
npm run db:seed-demo          # OPTIONAL: demo users + demo menu (prints the demo password once)
npm run dev                   # API on http://localhost:4000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

Open http://localhost:5173 and sign in.

**Your own accounts** (there is no public sign-up page):

```bash
cd server
npm run create-user -- sara admin "Sara Admin"
npm run create-user -- ali cashier "Ali Cashier"
```

It asks for the password after you press Enter. Delete the demo users before real use.

**One-server mode:** run `npm run build` in `client`, then `npm start` in `server`. The API then also serves the app on http://localhost:4000.

**Tests:** `cd server && npm test` (money maths and order validation).

## How it works

| Step | What happens |
|---|---|
| Cashier builds the order on **Main** | Server recalculates every price and total from the database. |
| Pays (cash / card / QR) | The order is saved **after payment is recorded**. Status starts at **New Order**. |
| **Orders** screens | New Order → Preparing → **Ready to Serve**. Ready to Serve is the end: the waiter serves the food and the order is complete. |
| **History** | Every order ever made (including Cancelled), searchable and view-only. |

- **Invoice number:** the auto-increment order id, shown as `INV-000123`. It is created when the order is saved, so cancelled orders keep theirs.
- **Order number:** a small queue number that restarts every day (#1, #2, …).
- **Cancel:** admin and cashier can both cancel a New Order or Preparing order. A reason is required. Finished orders cannot be cancelled or edited.
- **Edit Order:** only customer name and notes (items cannot change after payment; cancel and re-order instead).
- **Double-click** an order card on the admin Orders board to move it forward. A visible button does the same.

## Decisions made for you (change them if you want)

These were open in the spec. Each has a simple default.

| Question | What I did |
|---|---|
| Tax | `TAX_RATE` in `server/.env`. Default `0` (no tax). Prices are tax-exclusive; tax is added at checkout and rounded to the nearest sen. Set it to the rate your shop must charge (for example `6`). Check the correct rate with your lecturer or the tax authority, I did not assume one. |
| Card payment | Not processed by the app. The cashier ticks "terminal approved" and it is saved as a **manual confirmation**. The app never asks for card details or a PIN. |
| QR / e-wallet | Shows a **placeholder** (not a real QR). Same manual confirmation tick. A real provider would need a merchant account. |
| Delete product | "Archives" it: it disappears from the app, old orders keep their records. |
| Delete category | Blocked while it still has products. |
| Customer name | Optional (shown as "Walk-in" when empty). |
| Dashboard | "Pending" = New Order + Preparing. "Week" = last 7 days. "Top sellers" = this calendar month. Cancelled orders are never counted as sales. Day boundaries use `DB_TIMEZONE` (default `+08:00`, Malaysia). |
| Cashier Orders screen | Shows unfinished orders plus today's Ready to Serve orders. |
| Settings (in the PDF) | Not built. The report does not describe it. |
| PDF page 1 (number grid 1-24) | Not built. It was unclear what it was for. |
| Product images | JPG/PNG/WebP, max 2 MB, saved in `server/uploads`. |
| Why JavaScript, not TypeScript | The spec asks for JavaScript, and it is less to learn for a college project. TypeScript is nice for big teams but adds setup and extra syntax. |

## Security notes

- Passwords are hashed with bcrypt. Login is rate limited (10 tries / 15 min per IP).
- Every API route checks the user's role on the server, not just in the menu.
- SQL uses parameters only. Uploads are limited by type and size.
- Never commit `.env`. The login token lives in the browser's localStorage for 8 hours.

## Known limitations

- No real card or QR payment, no receipt/thermal printing, no password reset page.
- Order screens refresh by polling every 10-15 seconds (no live push).
- Colours are in `client/tailwind.config.js`, in one place.
- The demo menu has no photos; add them under **Products**.

## Project layout

```
server/  src/routes (API), src/middleware, src/utils, sql/schema.sql, scripts/, tests/
client/  src/pages (screens), src/components, src/api.js, tailwind.config.js
```
