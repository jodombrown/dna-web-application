-- B1 Composer: enums.
-- anchor_kind is the one shared polymorphic reference type (CLAUDE.md). It also types
-- posts.created_object_kind, so the two created objects that are not anchors in the brief
-- (connection_request, story) are added here rather than inventing a second reference shape.

create type public.c_category as enum ('connect', 'convene', 'collaborate', 'contribute', 'convey', 'system');
create type public.anchor_kind as enum ('member', 'space', 'event', 'opportunity', 'connection_request', 'story');
create type public.audience as enum ('everyone', 'connections', 'anchored');
create type public.post_status as enum ('draft', 'published');
create type public.contribute_instrument as enum ('time', 'skills', 'in_kind');
create type public.event_mode as enum ('in_person', 'virtual', 'hybrid');
create type public.ticket_kind as enum ('free', 'paid');
create type public.space_status as enum ('active', 'paused', 'completed');
create type public.space_role as enum ('lead', 'member');
create type public.space_role_status as enum ('active', 'invited', 'left');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
