-- ============================================================
--  FutBattles — Card image storage (run AFTER supabase-schema.sql)
--  Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Optional column for cards created before storage was added
alter table public.user_cards
  add column if not exists image_url text;

-- ── Storage bucket ───────────────────────────────────────────
-- Free tier: keep images small (512 KB cap enforced in app + bucket)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Storage policies ───────────────────────────────────────
-- Path format: {user_id}/{card_id}.jpg

create policy "card-images: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'card-images');

create policy "card-images: user upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "card-images: user update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "card-images: user delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
