alter table public.attendance_enrollments
 add column if not exists first_name text,
 add column if not exists last_name text,
 add column if not exists photo_url text;

-- Extend existing import/edit handling, preserving the deployed QR/auth logic.
do $$ declare definition text; old_insert text; new_insert text; begin
 definition := pg_get_functiondef('public.attendance_api(text,text,boolean,text,text,jsonb)'::regprocedure);
 old_insert := 'insert into attendance_enrollments(class_id,name,college_id,email,effective_from) values(c.id,trim(rowdata->>''name''),';
 new_insert := 'insert into attendance_enrollments(class_id,name,first_name,last_name,college_id,email,effective_from) values(c.id,trim(rowdata->>''name''),nullif(trim(rowdata->>''first_name''),''''),nullif(trim(rowdata->>''last_name''),''''),';
 if position(old_insert in definition)=0 then raise exception 'Expected enrollment import not found'; end if;
 definition := replace(definition,old_insert,new_insert);
 definition := replace(definition,'update attendance_enrollments set name=coalesce(p_body->>''name'',name),',
 'update attendance_enrollments set first_name=case when p_body ? ''first_name'' then nullif(trim(p_body->>''first_name''),'''') else first_name end, last_name=case when p_body ? ''last_name'' then nullif(trim(p_body->>''last_name''),'''') else last_name end, name=coalesce(p_body->>''name'',name),');
 execute definition;
end $$;
