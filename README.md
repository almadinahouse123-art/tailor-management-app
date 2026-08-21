# Almadina Stitching Suite

Create a single-user Urdu Tailoring Management App named “Almadina Cloth House and Stitching” with cloud database integration (Supabase).

LOGIN SYSTEM

- Email/Phone login

- Password required

- Single admin user only

- Secure cloud authentication

DATABASE (Supabase)

Tables:

Customers, Measurements, Orders, Workers, CustomerLedger, WorkerLedger, Inventory, Billing, DailyProduction

UNIQUE ID SYSTEM (IMPORTANT)

- Customer ID starts from 1 (1,2,3…)

- Worker ID starts from 1

- Order ID starts from 1

- Invoice number starts from 1

- Auto-increment sequentially only (no random IDs, no gaps)

CUSTOMER SYSTEM

Each customer:

- Unique Customer ID

- Name

- Phone

- Address

- Photo (optional)

MEASUREMENTS (STRICT URDU FIELDS ONLY)

- لمبائی

- دامن

- چوڑائی

- تیرا

- آستین

- کالر (بن / دو ٹکڑا)

- کف پیمائش

- جب (2 سائیڈ / 2+1)

- آستین ٹائپ (کف / کنار / چک پٹے + description required)

- شلوار سائز

- پنجہ

RULES:

- Each measurement must have description/note field

- Fabric image can be attached

- Full history must be saved (no overwrite)

- Latest measurement shown by default

CUSTOMER LEDGER (ACCOUNT SYSTEM)

- Date

- Description

- Total amount

- Paid amount (cash)

- Remaining amount (auto calculate)

- Multiple payment entries allowed (no overwrite)

PAYMENT STATUS

- 🟢 Paid (fully paid)

- 🟡 Partial (some paid)

- 🔴 Unpaid (no payment)

ORDERS SYSTEM

- Order ID

- Customer linked

- Date

- Delivery date

- Status (Pending / Stitching / Ready / Delivered)

- Fabric image

- Instructions

- Payment linked with ledger

DESIGN SYSTEM

- Fabric image required

- Color selection

- Design type (Simple / Fancy / Embroidery / Printed)

- Description field

PRODUCTION SYSTEM (DAILY RECORD)

- Date

- Simple suits

- Chakpate suits

- Worker name

- Notes

- Full history saved

WORKER SYSTEM (FULL PROFILE)

Each worker:

- Worker ID

- Name

- Phone

- Photo (mandatory)

WORKER PRODUCTION

- Daily simple suits

- Daily chakpate suits

- Date-wise history

WORKER LEDGER

- Date

- Description

- Total suits

- Paid amount

- Remaining amount

- Full history saved

INVENTORY SYSTEM

- Thread stock in/out

- Buckram stock

- Collar buckram sizes (10 to 18)

- Available / Finished tracking

- Low stock alerts

BILLING SYSTEM

- Invoice number

- Customer details

- Order details

- Total suits

- Price per suit

- Total amount

- Paid / Remaining

- Printable invoice (thermal printer friendly)

DAILY RECORDS

- Date

- Total suits

- Income

- Expenses

- Labor cost

REVENUE SYSTEM

- Daily income

- Monthly income

- Profit

- Expenses

SMART SEARCH SYSTEM

- Customer ID

- Name (partial search)

- Phone number

- Order ID

PRINT SYSTEM

- Measurement print (cutting sheet)

- Invoice print

NOTES SYSTEM

Available in:

- Measurements

- Orders

- Production

UI/UX REQUIREMENTS

- Simple Urdu interface only

- Card-based modern design

- Fast performance

- Bottom navigation

- Lightweight app

- No heavy animations

APP FLOW

Login → Dashboard → Customers → Measurements → Orders → Production → Workers → Inventory → Billing → Revenue

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tailor-management-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ed0868f5-fa19-4e4b-835b-d92bc92590b6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
