// @ts-nocheck
// Deno Deploy runtime
// supabase functions deploy products-sync --no-verify-jwt  (если используете кастомный секрет)
// или без --no-verify-jwt и тогда проверяйте user/роль через supabase auth
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!; // В облаке доступна по умолчанию, секрет задавать не нужно
// ВАЖНО: Названия секретов не должны начинаться с SUPABASE_. Используйте, например, SERVICE_ROLE_KEY
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

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-admin-sync-token'
  } as const;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    if (ADMIN_SYNC_TOKEN && req.headers.get('x-admin-sync-token') !== ADMIN_SYNC_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const body = await req.json();
    const list = Array.isArray(body) ? body.map((p) => sanitize(p, true)) : [];

    const del = await sb.from(TABLE).delete().gt('id', null);
    if (del.error) throw del.error;

    if (list.length) {
      const up = await sb.from(TABLE).upsert(list, { onConflict: 'id' });
      if (up.error) throw up.error;
    }

    return new Response(JSON.stringify({ ok: true, count: list.length }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    const err: any = e as any;
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});