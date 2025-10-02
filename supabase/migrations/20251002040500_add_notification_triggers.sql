-- This migration adds triggers to generate notifications for event likes and attendance.

-- 1) Function to create a notification on new like
create or replace function public.handle_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_owner_id uuid;
begin
  -- Get the user_id of the event owner
  select user_id into event_owner_id from public.events where id = new.event_id;

  -- Only send a notification if the liker is not the event owner
  if new.user_id <> event_owner_id then
    insert into public.notifications (user_id, actor_id, event_id, type, payload)
    values (
      event_owner_id,
      new.user_id,
      new.event_id,
      'event_like',
      jsonb_build_object(
        'event_id', new.event_id,
        'actor_id', new.user_id
      )
    );
  end if;

  return new;
end;
$$;

-- 2) Trigger to call the function on new like
drop trigger if exists on_new_like on public.likes;
create trigger on_new_like
  after insert on public.likes
  for each row execute procedure public.handle_new_like();

-- 3) Function to create a notification on new attendee
create or replace function public.handle_new_attendee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_owner_id uuid;
begin
  -- Get the user_id of the event owner
  select user_id into event_owner_id from public.events where id = new.event_id;

  -- Only send a notification if the attendee is not the event owner and their status is 'attending' or 'both'
  if new.user_id <> event_owner_id and new.status in ('attending', 'both') then
    insert into public.notifications (user_id, actor_id, event_id, type, payload)
    values (
      event_owner_id,
      new.user_id,
      new.event_id,
      'event_attendance',
      jsonb_build_object(
        'event_id', new.event_id,
        'actor_id', new.user_id,
        'status', new.status
      )
    );
  end if;

  return new;
end;
$$;

-- 4) Trigger to call the function on new attendee
drop trigger if exists on_new_attendee on public.event_attendees;
create trigger on_new_attendee
  after insert or update on public.event_attendees
  for each row execute procedure public.handle_new_attendee();