-- Cofre: execute uma vez no SQL Editor de um projeto Supabase novo.
-- A mesma migração está em migrations/202610130001_initial.sql para supabase db push.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, avatar_url text, created_at timestamptz not null default now()
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 200), category text not null default 'Pessoal',
 priority text not null default 'medium' check (priority in ('low','medium','high')),
 completed boolean not null default false, due_date date, created_at timestamptz not null default now()
);
create table public.finances (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 description text not null check (length(trim(description)) between 1 and 200),
 amount numeric(14,2) not null check (amount > 0 and amount < 1000000000000),
 type text not null check (type in ('income','expense')), category text not null default 'Outros',
 date date not null default current_date, created_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 200), description text not null default '',
 progress integer not null default 0 check (progress between 0 and 100),
 status text not null default 'active' check (status in ('active','paused','completed')),
 deadline date, created_at timestamptz not null default now()
);
create table public.notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 200 and title !~ E'[\\[\\]\\n]'),
 content text not null default '' check (length(content) <= 1000000), category text not null default 'Pessoal', tags text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id,user_id)
);
create unique index notes_user_title on public.notes(user_id, lower(trim(title)));
create table public.note_links (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 source_note_id uuid not null, target_note_id uuid not null, created_at timestamptz not null default now(),
 foreign key (source_note_id,user_id) references public.notes(id,user_id) on delete cascade,
 foreign key (target_note_id,user_id) references public.notes(id,user_id) on delete cascade,
 unique (source_note_id,target_note_id), check (source_note_id <> target_note_id)
);
create table public.pomodoro_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 duration_minutes integer not null default 25 check (duration_minutes = 25),
 completed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
-- Indexa os filtros RLS e as consultas mais comuns.
create index tasks_user_date on public.tasks(user_id,due_date);
create index finances_user_date on public.finances(user_id,date);
create index projects_user on public.projects(user_id);
create index notes_user_updated on public.notes(user_id,updated_at desc);
create index links_user_target on public.note_links(user_id,target_note_id);
create index sessions_user_date on public.pomodoro_sessions(user_id,completed_at);

alter table public.profiles enable row level security;
create policy "own_profile" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
do $$ declare tab text; begin
 foreach tab in array array['tasks','finances','projects','notes','note_links','pomodoro_sessions'] loop
  execute format('alter table public.%I enable row level security', tab);
  execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',tab);
 end loop;
end $$;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.profiles, public.tasks, public.finances, public.projects, public.notes, public.note_links, public.pomodoro_sessions to authenticated;
revoke all on public.profiles, public.tasks, public.finances, public.projects, public.notes, public.note_links, public.pomodoro_sessions from anon;

-- Somente este trigger tem SECURITY DEFINER, para criar o perfil no cadastro.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,full_name,avatar_url) values(new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
 return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,full_name,avatar_url) select id,raw_user_meta_data->>'full_name',raw_user_meta_data->>'avatar_url' from auth.users on conflict (id) do nothing;

create function public.touch_note() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.title := trim(new.title); return new; end $$;
create trigger touch_note before insert or update on public.notes for each row execute function public.touch_note();

-- Executado na mesma transação da nota, com os privilégios/RLS de quem salvou.
-- Reconstrói os links do proprietário: resolve referências futuras, renomes e exclusões.
-- Títulos são únicos por usuário, sem distinguir maiúsculas/minúsculas.
create function public.sync_note_links() returns trigger language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid;
begin
 owner_id := case when TG_OP = 'DELETE' then old.user_id else new.user_id end;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
 delete from public.note_links where user_id = owner_id;
 insert into public.note_links(user_id,source_note_id,target_note_id)
 select distinct owner_id, source.id, target.id
 from public.notes source
 cross join lateral regexp_matches(source.content, E'\\[\\[([^\\[\\]\\n]+)\\]\\]', 'g') as mention(parts)
 join public.notes target on target.user_id = owner_id and lower(trim(target.title)) = lower(trim(mention.parts[1]))
 where source.user_id = owner_id and source.id <> target.id
 on conflict (source_note_id,target_note_id) do nothing;
 return null;
end $$;
revoke all on function public.touch_note(), public.sync_note_links() from public, anon, authenticated;
create trigger sync_note_links after insert or update or delete on public.notes for each row execute function public.sync_note_links();
commit;
