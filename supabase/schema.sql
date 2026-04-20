-- =============================================================================
-- Supabase SQL エディタ（SQL）で実行してください
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public.users
-- id / email / plan / analysis_count_total / analysis_count_month / created_at
-- ＋ 月次カウンタ用 usage_month（UTC の YYYY-MM。月初に analysis_count_month をリセットするため）
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  analysis_count_total integer not null default 0 check (analysis_count_total >= 0),
  analysis_count_month integer not null default 0 check (analysis_count_month >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  usage_month text not null default (to_char(timezone('utc', now()), 'YYYY-MM'))
);

create index if not exists users_plan_idx on public.users (plan);

alter table public.users enable row level security;

-- 自分の行のみ参照可（クライアントでプラン表示用）
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- 新規サインアップ時に users 行を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 分析成功時に原子的に +1（API は service_role で実行）
create or replace function public.increment_user_analysis_counts(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ym text := to_char(timezone('utc', now()), 'YYYY-MM');
begin
  update public.users u
  set
    analysis_count_total = u.analysis_count_total + 1,
    analysis_count_month = case
      when u.usage_month = ym then u.analysis_count_month + 1
      else 1
    end,
    usage_month = ym
  where u.id = p_user_id;
end;
$$;

revoke all on function public.increment_user_analysis_counts(uuid) from public;
grant execute on function public.increment_user_analysis_counts(uuid) to service_role;

-- ヒーロー用: 全ユーザーの累計分析数の合計
create or replace function public.get_total_analysis_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(u.analysis_count_total), 0)::bigint from public.users u;
$$;

revoke all on function public.get_total_analysis_count() from public;
grant execute on function public.get_total_analysis_count() to service_role;
