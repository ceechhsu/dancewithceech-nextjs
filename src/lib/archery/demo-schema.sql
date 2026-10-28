-- Fictional browser-only schema. No production connection, session or credentials.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create table attendance_classes(id uuid primary key,instructor_email text,name text,timezone text default 'America/Los_Angeles',progress_tool text default 'archery',archived boolean default false,start_date date default current_date-90,end_date date default current_date+90);
create table attendance_enrollments(id uuid primary key,class_id uuid references attendance_classes(id),name text,email text,google_sub text,removed_at timestamptz,effective_from date default current_date-90,effective_to date,unique(id,class_id));
insert into attendance_classes(id,instructor_email,name) values('00000000-0000-0000-0000-000000000001','teacher@example.com','Archery · Sample class');
insert into attendance_enrollments(id,class_id,name,email)
select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001',
 (array['Alex Sample','Jordan Example','Casey Demo','Morgan Sample','Riley Demo','Sam Example','Taylor Sample','Jamie Demo','Drew Example','Quinn Sample','Robin Demo','Avery Example'])[i],
 'student'||i||'@example.com' from generate_series(1,12) i;
