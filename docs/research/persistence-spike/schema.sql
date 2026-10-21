drop schema if exists w cascade;
drop role if exists app_request; drop role if exists app_dispatch;
create role app_request nologin; create role app_dispatch nologin;
create schema w;
create function w.acct() returns uuid language sql stable as $$ select nullif(current_setting('app.account_id', true),'')::uuid $$;

create table w.account(id uuid primary key);
create table w.project(account_id uuid not null references w.account(id), id uuid not null, primary key (id), unique (account_id,id));
create table w.object(account_id uuid not null, project_id uuid not null, id uuid not null, kind text not null,
  primary key (id), unique (account_id,project_id,id),
  foreign key (account_id,project_id) references w.project(account_id,id));
create table w.revision(account_id uuid not null, project_id uuid not null, object_id uuid not null, seq int not null,
  content jsonb not null, slice_hash jsonb not null, cause text not null, at timestamptz not null default now(),
  primary key (object_id, seq),
  foreign key (account_id,project_id,object_id) references w.object(account_id,project_id,id));
create table w.unit_head(account_id uuid not null, project_id uuid not null, object_id uuid not null, slice text not null, rev_seq int not null, fingerprint text not null,
  primary key (object_id, slice),
  foreign key (account_id,project_id,object_id) references w.object(account_id,project_id,id));
create table w.attempt(account_id uuid not null, project_id uuid not null, id uuid not null primary key, slot_id uuid not null, generation_id uuid,
  unique (account_id,project_id,id),
  foreign key (account_id,project_id,slot_id) references w.object(account_id,project_id,id));
create table w.slot_state(account_id uuid not null, project_id uuid not null, slot_id uuid primary key, shot_id uuid not null, chosen_attempt_id uuid,
  foreign key (account_id,project_id,slot_id) references w.object(account_id,project_id,id));
create table w.capture(account_id uuid not null, project_id uuid not null, dependant_id uuid not null, unit_object_id uuid not null, slice text not null, fingerprint text not null,
  primary key (dependant_id, unit_object_id, slice),
  foreign key (account_id,project_id,unit_object_id) references w.object(account_id,project_id,id));
create index capture_unit on w.capture(unit_object_id, slice);
create table w.ack(account_id uuid not null, project_id uuid not null, dependant_id uuid not null, unit_object_id uuid not null, slice text not null, fingerprint text not null,
  primary key (dependant_id, unit_object_id, slice, fingerprint));
create index slot_shot on w.slot_state(shot_id);
create table w.job(account_id uuid not null, id uuid primary key, not_before timestamptz not null default now(), lease_until timestamptz, state text not null default 'queued', payload jsonb);

do $$ declare t text; begin
 foreach t in array array['project','object','revision','unit_head','attempt','slot_state','capture','ack','job'] loop
  execute format('alter table w.%I enable row level security', t);
  execute format('alter table w.%I force row level security', t);
  execute format('create policy tenant on w.%I using (account_id = w.acct()) with check (account_id = w.acct())', t);
 end loop; end $$;
alter table w.account enable row level security; alter table w.account force row level security;
create policy tenant on w.account using (id = w.acct()) with check (id = w.acct());
grant usage on schema w to app_request, app_dispatch;
grant select, insert on w.account, w.project, w.object, w.revision, w.attempt, w.capture, w.ack to app_request;
grant select, insert, update on w.unit_head, w.slot_state, w.job to app_request;
grant execute on function w.acct() to app_request, app_dispatch;
-- append-only guard for the owner too
create function w.no_mutate() returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' and current_setting('app.purging', true) = old.project_id::text then return old; end if;
  raise exception 'append-only: % on %', tg_op, tg_table_name; end $$;
create trigger revision_append_only before update or delete on w.revision for each row execute function w.no_mutate();
create trigger attempt_append_only before update or delete on w.attempt for each row execute function w.no_mutate();
-- dispatcher: ids only, via definer function
create function w.claim_job() returns table(job_id uuid, account_id uuid) language sql security definer set search_path = w, pg_temp as $$
  update w.job set state='claimed', lease_until=now()+interval '60 s' where id = (select id from w.job where state='queued' and not_before<=now() order by not_before for update skip locked limit 1)
  returning id, account_id $$;
revoke all on function w.claim_job() from public; grant execute on function w.claim_job() to app_dispatch;
