# Безопасная запись в Supabase: мини‑бэкенд и Edge Function

Чтобы не хранить Service Role Key в клиенте и безопасно выполнять операции записи (replaceAll/push из админки), используйте один из вариантов ниже.

Важно: на клиенте храните только anon key для чтения. Все записи — через прокси (ваш бэкенд или Edge Function), защищённый секретом/аутентификацией.

## Пример схемы таблицы (рекомендуемые типы)

Или создайте таблицу, или приведите существующую к следующей структуре. Для составных полей используем JSONB.

```sql
-- Явное создание таблицы
create table if not exists public.products (
  id text primary key,
  sku text unique,
  categories jsonb not null default '[]'::jsonb,
  name jsonb not null default '{}'::jsonb,
  shortDesc jsonb not null default '{}'::jsonb,
  fullDesc jsonb not null default '{}'::jsonb,
  price numeric not null default 0,
  oldPrice numeric null,
  inStock boolean not null default true,
  stockCount int null,
  flags jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  attributes jsonb null,
  seo jsonb null,
  createdAt timestamptz null,
  updatedAt timestamptz null
);

-- Если таблица уже есть, можно добавить недостающие колонки
alter table public.products add column if not exists categories jsonb default '[]'::jsonb;
alter table public.products add column if not exists name jsonb default '{}'::jsonb;
alter table public.products add column if not exists shortDesc jsonb default '{}'::jsonb;
alter table public.products add column if not exists fullDesc jsonb default '{}'::jsonb;
alter table public.products add column if not exists price numeric default 0;
alter table public.products add column if not exists oldPrice numeric;
alter table public.products add column if not exists inStock boolean default true;
alter table public.products add column if not exists stockCount int;
alter table public.products add column if not exists flags jsonb default '{}'::jsonb;
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products add column if not exists specs jsonb default '[]'::jsonb;
alter table public.products add column if not exists attributes jsonb;
alter table public.products add column if not exists seo jsonb;
alter table public.products add column if not exists createdAt timestamptz;
alter table public.products add column if not exists updatedAt timestamptz;
```

## 1) Мини‑бэкенд на Node.js (Express)

Пример REST‑эндпойнта `/products/sync`, который принимает массив продуктов и полностью заменяет таблицу `products` (DELETE + UPSERT). Использует Service Role Key из переменных окружения.

```js
// server.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // хранить только на сервере!
const TABLE = process.env.PRODUCTS_TABLE || 'products';
const SCHEMA = process.env.PRODUCTS_SCHEMA || 'public';
const ADMIN_TOKEN = process.env.ADMIN_SYNC_TOKEN; // ваш секрет для клиента (например, отправляется в заголовке)

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { db: { schema: SCHEMA } });

// Белый список полей (как в ProductSchema)
const ALLOWED = ['id','sku','categories','name','shortDesc','fullDesc','price','oldPrice','inStock','stockCount','flags','images','specs','attributes','seo','createdAt','updatedAt'];
const sanitize = (obj, allowId = true) => {
  const out = {};
  for (const k of ALLOWED) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  if (!allowId) delete out.id;
  return out;
};

app.post('/products/sync', async (req, res) => {
  try {
    if (!ADMIN_TOKEN || req.headers['x-admin-sync-token'] !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const list = Array.isArray(req.body) ? req.body.map(p => sanitize(p, true)) : [];
    // Транзакции нет в REST, поэтому делаем последовательность операций
    // 1) Удаляем все
    const { error: delErr } = await sb.from(TABLE).delete().gt('id', null);
    if (delErr) throw delErr;
    // 2) Вставляем / upsert
    if (list.length) {
      const { error: upErr } = await sb.from(TABLE).upsert(list, { onConflict: 'id' });
      if (upErr) throw upErr;
    }
    res.json({ ok: true, count: list.length });
  } catch (e) {
    console.error('sync error:', e);
    res.status(400).json({ error: String(e.message || e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
```

Запуск локально:

```bash
npm i express @supabase/supabase-js
export SUPABASE_URL=...  # https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...  # из Project Settings → API
export ADMIN_SYNC_TOKEN=your-long-secret
node server.js
```

Клиент (админка) отправляет данные так:

```js
await fetch('https://your-api.example.com/products/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Sync-Token': 'your-long-secret' },
  body: JSON.stringify(productsArray)
});
```

Советы:
- Разрешайте доступ только из админки (секрет/доп. аутентификация).
- Ограничьте IP, включите HTTPS.

## 2) Supabase Edge Function (Deno)

Edge Function выполняется рядом с БД, не раскрывая Service Role Key клиенту. Вы можете проверять JWT пользователя (роль) или использовать собственный секрет.

`supabase/functions/products-sync/index.ts`:

```ts
// Deno Deploy runtime
// supabase functions deploy products-sync --no-verify-jwt  (если используете кастомный секрет)
// или без --no-verify-jwt и тогда проверяйте user/роль через supabase auth
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!; // в облаке доступен по умолчанию
// Важно: секреты не должны начинаться с SUPABASE_. Используйте, напр., SERVICE_ROLE_KEY
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const TABLE = Deno.env.get('PRODUCTS_TABLE') ?? 'products';
const SCHEMA = Deno.env.get('PRODUCTS_SCHEMA') ?? 'public';
const ADMIN_SYNC_TOKEN = Deno.env.get('ADMIN_SYNC_TOKEN');

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: SCHEMA } });
const ALLOWED = ['id','sku','categories','name','shortDesc','fullDesc','price','oldPrice','inStock','stockCount','flags','images','specs','attributes','seo','createdAt','updatedAt'];
const sanitize = (obj: Record<string, unknown>, allowId = true) => {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  if (!allowId) delete out.id;
  return out;
};

serve(async (req) => {
  try {
    if (ADMIN_SYNC_TOKEN && req.headers.get('x-admin-sync-token') !== ADMIN_SYNC_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const body = await req.json();
    const list = Array.isArray(body) ? body.map((p) => sanitize(p, true)) : [];

    const del = await sb.from(TABLE).delete().gt('id', null);
    if (del.error) throw del.error;

    if (list.length) {
      const up = await sb.from(TABLE).upsert(list, { onConflict: 'id' });
      if (up.error) throw up.error;
    }

    return new Response(JSON.stringify({ ok: true, count: list.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
```

Деплой:

```bash
# Установите supabase cli
brew install supabase/tap/supabase
supabase login

# В каталоге проекта, где есть supabase/, создайте функцию и задеплойте
supabase functions deploy products-sync --project-ref <your-project-ref> --no-verify-jwt

# Добавьте переменные окружения для функции
# ВАЖНО: названия секретов не должны начинаться с SUPABASE_.
# Для SERVICE ROLE ключа используйте, например, SERVICE_ROLE_KEY
supabase secrets set --env-file ./edge.env --project-ref <your-project-ref>
# edge.env должен содержать (пример):
# SERVICE_ROLE_KEY=...
# PRODUCTS_TABLE=products
# PRODUCTS_SCHEMA=public
# ADMIN_SYNC_TOKEN=your-long-secret

# Примечание: SUPABASE_URL и SUPABASE_ANON_KEY доступны в Edge Function автоматически.
# Для локального serve можно оставить SUPABASE_URL в edge.env, но при загрузке секретов он будет пропущен.
```

Вызов из клиента:

```js
await fetch('https://<project-ref>.functions.supabase.co/products-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Sync-Token': 'your-long-secret' },
  body: JSON.stringify(productsArray)
});
```

## Политики RLS

- Для анонимного чтения: создайте политику `SELECT` для роли `anon` на таблице `products`.
- Для записи через сервисный ключ политика не требуется (он обходит RLS), но используйте только на серверной стороне (бэкенд/Edge Function).

## Сопоставление схемы

Убедитесь, что столбцы таблицы соответствуют полям ProductSchema. Если каких‑то нет — либо добавьте их в БД, либо оставьте как JSONB (например, `name`, `images`, `flags`, `specs`, `seo`). Очистка в клиенте уже удаляет поля вроде `originalId`, чтобы не падать на `column does not exist`.

Подсказка: после изменения схемы иногда требуется сбросить кэш PostgREST (в Project Settings → API → кнопка Purge Cache) для мгновенной видимости новых колонок.
