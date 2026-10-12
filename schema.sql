create table if not exists items(id text primary key, user_id uuid not null default auth.uid() references auth.users, data jsonb not null, updated bigint not null);
alter table items enable row level security;
create policy "own" on items for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
alter publication supabase_realtime add table items;
