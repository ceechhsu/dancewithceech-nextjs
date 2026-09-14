-- Ten-minute rolling QR lifetime for preview testing; attendance end remains authoritative.
do $patch$
declare definition text;
begin
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='attendance_api';
 if position('floor(extract(epoch from n)/60)::bigint' in definition)=0 then raise exception 'Unexpected QR implementation'; end if;
 definition:=replace(definition,'m.token_slot<>floor(extract(epoch from n)/60)::bigint','(m.token_slot is null or n>=to_timestamp(m.token_slot)+interval ''10 minutes'')');
 definition:=replace(definition,'m.token_slot<>floor(extract(epoch from clock_timestamp())/60)::bigint','(m.token_slot is null or clock_timestamp()>=to_timestamp(m.token_slot)+interval ''10 minutes'')');
 definition:=replace(definition,'token_slot=floor(extract(epoch from n)/60)::bigint','token_slot=floor(extract(epoch from n))::bigint');
 definition:=replace(definition,'to_timestamp((m.token_slot+1)*60)','to_timestamp(m.token_slot)+interval ''10 minutes''');
 definition:=replace(definition,'abs(extract(epoch from (n-m.location_timestamp)))>60','abs(extract(epoch from (n-m.location_timestamp)))>630');
 definition:=replace(definition,'abs(extract(epoch from (clock_timestamp()-m.location_timestamp)))>60','abs(extract(epoch from (clock_timestamp()-m.location_timestamp)))>630');
 execute definition;
end $patch$;
