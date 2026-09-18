-- Convene Pass 4: the host's own map link, stored opaquely (P4-SPEC section 7; rulings 815, 816).
-- Committed before it is applied (ruling 225); reaches the canonical project by `supabase db push`
-- from the founder's machine, never by apply_migration (rulings 553, 269). Until that push the
-- `live` job's drift arm reads `in the tree as 20260918120000_p4_convene_map_link.sql, not recorded
-- on the project` and exits 1, which is the ordering 225 requires and not a defect in this change.
--
-- One nullable column on an existing table. No default, so ruling 564's two-statement form is not
-- engaged: there is no missing value to stamp onto the existing rows and every one of them reads
-- back null, which is what a link nobody pasted should read as.
--
-- What "opaque" means here, and what the constraint is not. 816 is explicit that member content is
-- never parsed or plotted: nothing in the app or in this function reads this value for a point, a
-- place or a zone, and no geocoder, no Mapbox call and no time-zone lookup ever sees it. The check
-- below is neither a parse nor a lookup — it is the shape an `href` must have before a surface may
-- render it, which is the same guard the meeting link already carries in publish_post, and without
-- it the column would accept `javascript:` and the first surface to render it would be the hole.
-- It derives nothing. A future need to READ the link is a ruling, not an implementation detail.
--
-- RLS: `event_delivery` already carries it, with policies for every persona (the physical-row
-- reader, the host, the admin, service_role). A column added to a table under RLS inherits them,
-- and this one rides the physical row every reader of the event already sees, which is exactly who
-- the host pasted it for.

alter table public.event_delivery add column map_link text;

alter table public.event_delivery add constraint event_delivery_map_link_shape check (
  map_link is null
  or (kind = 'physical' and map_link ~* '^https?://' and length(map_link) <= 2048)
);

comment on column public.event_delivery.map_link is
  'Ruling 815: the host''s own link to a map, kept as an opaque string. Never parsed, geocoded, plotted, or used to derive a point, a place or a zone (816). The pin carries where the venue is; this carries nothing but itself.';
