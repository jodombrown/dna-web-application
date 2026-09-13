do $do$
declare
  src text := pg_get_functiondef('public.profile_view(text, boolean)'::regprocedure);
  out text;
begin
  out := replace(src,
$q$  -- Ruling 187: the label for this member's segment, read from the one vocabulary table.
  v_segment_label text;$q$,
$q$  -- Ruling 187: the label for this member's segment, read from the one vocabulary table.
  v_segment_label text;
  -- Ruling 198: a blocked pair, in either direction. private.is_blocked is symmetric.
  v_blocked boolean := false;
  -- The viewer the audience rules see. It is v_viewer for everyone except a blocked viewer, who is
  -- scoped to the anonymous rule: the lowest audience, the same rows a signed-out stranger gets.
  v_scope uuid;$q$);

  out := replace(out,
$q$  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;$q$,
$q$  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  -- Ruling 198: the block drops the viewer's scope; it does not hide the page. Hiding it would
  -- disclose the block (a page that opened yesterday and 404s today says exactly what happened) and
  -- be circumvented by signing out anyway. So the gate below still reads v_viewer, and a blocked
  -- member who could open this profile before can still open it, seeing what the public sees.
  v_blocked := v_caller is not null and v_caller <> m.id and private.is_blocked(v_caller, m.id);
  v_scope := case when v_blocked then null else v_viewer end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;$q$);

  out := regexp_replace(out,
    'private\.admit_section\(m\.id, ''([a-z]+)'', v_viewer\)',
    'private.admit_section(m.id, ''\1'', v_scope)', 'g');

  out := replace(out,
    'private.third_party_label(am.id, a.attester_role, v_viewer is null)',
    'private.third_party_label(am.id, a.attester_role, v_scope is null)');

  out := replace(out,
$q$'role', case when v_viewer is not null or private.named_publicly(am.id) then a.attester_role end,$q$,
$q$'role', case when v_scope is not null or private.named_publicly(am.id) then a.attester_role end,$q$);

  out := replace(out,
$q$|| case when v_viewer is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,$q$,
$q$|| case when v_scope is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,$q$);

  out := replace(out,
$q$  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136).
  if v_viewer is not null and not v_owner then$q$,
$q$  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136), and
  -- never for a blocked pair (ruling 198): no Connect action, no follow, no mutual name, no shared
  -- Space, no anchored qualification and no DIA line, in either direction. The relationship object
  -- is absent rather than 'none', so the surface renders no action at all.
  if v_viewer is not null and not v_owner and not v_blocked then$q$);

  out := replace(out,
$q$    'relationship', case when v_viewer is not null and not v_owner then jsonb_build_object('state', v_rel, 'following', v_following) end,$q$,
$q$    'relationship', case when v_viewer is not null and not v_owner and not v_blocked
                         then jsonb_build_object('state', v_rel, 'following', v_following) end,$q$);

  if out = src then raise exception 'profile_view: no substitution applied'; end if;
  if position('v_scope' in out) = 0 then raise exception 'profile_view: scope not introduced'; end if;
  if (select count(*) from regexp_matches(out, 'admit_section\(m\.id, ''[a-z]+'', v_viewer\)', 'g')) > 0 then
    raise exception 'profile_view: a section gate still reads the identity, not the scope';
  end if;
  execute out;
end
$do$;
