## مکمل ڈیٹا کنٹرول سسٹم (Edit / Delete / Trash / Restore)

ہر ریکارڈ پر ترمیم، حذف، اور ٹریش سے بحالی کی سہولت — تمام بڑے ماڈیولز کے لیے۔

---

### 1. ڈیٹا بیس میں تبدیلیاں (ایک migration)

ہر اہم table میں دو نئے کالم شامل کیے جائیں گے:

- `deleted_at TIMESTAMPTZ NULL` — soft delete مارکر (NULL = active، ورنہ trash میں)
- `updated_at TIMESTAMPTZ` — جہاں پہلے سے نہیں ہے وہاں شامل + ٹرگر سے auto-update

متاثرہ tables:
- `customers` (updated_at پہلے سے ہے، صرف deleted_at)
- `measurements` (updated_at + deleted_at)
- `orders` (دونوں موجود، صرف deleted_at)
- `workers` (صرف deleted_at)
- `inventory` (صرف deleted_at)
- `invoices` (updated_at + deleted_at)
- `customer_ledger` (updated_at + deleted_at)
- `worker_ledger` (updated_at + deleted_at)
- `daily_production` (updated_at + deleted_at)

ہر table پر `set_updated_at` ٹرگر لگے گا (function پہلے سے موجود ہے)۔
ہر table پر index: `WHERE deleted_at IS NULL` تاکہ active فلٹر تیز رہے۔

> نوٹ: تفصیلی edit history (پرانی/نئی value الگ table میں) فی الحال شامل نہیں — یہ app کو بھاری کرتا ہے۔ آپ کی request کے مطابق "optional lightweight" — ہم `updated_at` رکھتے ہیں جو کافی ہے۔ بعد میں چاہیں تو full audit log الگ سے ڈالا جا سکتا ہے۔

---

### 2. مشترکہ utilities

**`src/lib/crud.ts`** (نئی فائل):
- `softDelete(table, id)` — `deleted_at = now()` سیٹ کرے
- `restore(table, id)` — `deleted_at = null`
- `hardDelete(table, id)` — مکمل حذف
- ہر mutation کے بعد toast پر **"واپس لائیں"** action button (sonner toast کے ساتھ)

**`src/components/DeleteButton.tsx`** (نئی):
- AlertDialog سے confirmation
- soft delete کرتا ہے → toast میں "واپس لائیں" بٹن → کلک پر restore

**`src/components/EditButton.tsx`** (نئی):
- ہر detail/list row پر pencil icon → edit route پر لے جائے

---

### 3. Edit صفحات (نئے routes)

ہر ماڈیول کے لیے `app.<module>.$id.edit.tsx`:
- `app.customers.$id.edit.tsx`
- `app.measurements.$id.edit.tsx` (جدید — فی الحال صرف new ہے)
- `app.orders.$id.edit.tsx`
- `app.workers.$id.edit.tsx`
- `app.inventory.$id.edit.tsx`
- `app.billing.$id.edit.tsx`
- `app.production.$id.edit.tsx`

ہر فارم موجودہ "new" فارم سے ملتا جلتا ہوگا، فرق صرف:
- ابتدائی values DB سے prefill
- save پر `update().eq('id', ...)` (insert کے بجائے)
- redirect واپس detail/list صفحے پر

---

### 4. Trash (ٹریش) سیکشن

**`src/routes/app.trash.tsx`** — ٹیبز کے ساتھ:
- گاہک | پیمائش | آرڈرز | کاریگر | انوینٹری | بلنگ | کھاتہ
- ہر ٹیب میں `deleted_at IS NOT NULL` ریکارڈز
- ہر row پر دو بٹن: **بحال کریں** (restore) اور **مستقل حذف** (hardDelete + double confirm)

**Bottom navigation / dashboard** پر "ٹریش" کا لنک اضافہ۔

---

### 5. List صفحات کی اپڈیٹ

تمام موجودہ list queries میں `.is('deleted_at', null)` فلٹر شامل کیا جائے گا تاکہ trashed ریکارڈز نظر نہ آئیں:
- customers, orders, measurements, workers, inventory, billing, production, ledgers

---

### 6. UI تبدیلیاں

ہر detail صفحے (customers/$id, orders/$id, workers/$id) اور list صفحات پر:
- **ترمیم** (Edit) بٹن — pencil icon
- **حذف** (Delete) بٹن — trash icon + confirmation dialog
- delete کے بعد toast: "حذف ہو گیا — [واپس لائیں]"

Dashboard پر چھوٹا "ٹریش" کارڈ (اگر کچھ trashed ہے تو count دکھائے)۔

---

### تکنیکی تفصیلات

- soft delete pattern — کسی foreign-key cascade کی ضرورت نہیں
- restore سے تمام relationships خود بخود واپس active ہو جاتے ہیں
- `updated_at` ٹرگر سے auto، manual handling کی ضرورت نہیں
- اگر کوئی customer trash میں جائے تو اس کے orders/measurements active رہیں گے (الگ سے delete کرنا ہوں گے) — یہ accidental cascade سے بچاتا ہے

---

### فائلز کی فہرست

**نئی:**
- 1 migration file
- `src/lib/crud.ts`
- `src/components/DeleteButton.tsx`
- `src/components/EditButton.tsx`
- 7 edit route files
- `src/routes/app.trash.tsx`

**ترمیم شدہ:**
- تمام list/detail routes (delete+edit بٹن، deleted_at فلٹر)
- `src/components/BottomNav.tsx` یا `app.index.tsx` (ٹریش لنک)
