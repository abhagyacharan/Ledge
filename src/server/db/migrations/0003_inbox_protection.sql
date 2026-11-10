-- Custom migration: the Inbox list cannot be deleted or turned into a normal list.
-- (CLAUDE.md §6.1: every user has an undeletable Inbox.)
--
-- Deleting a user still works: by the time the cascade reaches their lists the user row is
-- already gone, so the "user still exists" check below is false and the delete is allowed.
CREATE FUNCTION lists_protect_inbox() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_inbox AND EXISTS (SELECT 1 FROM "user" WHERE id = OLD.user_id) THEN
      RAISE EXCEPTION 'the Inbox list cannot be deleted'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: is_inbox is fixed at creation.
  IF NEW.is_inbox IS DISTINCT FROM OLD.is_inbox THEN
    RAISE EXCEPTION 'is_inbox cannot be changed after a list is created'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER lists_protect_inbox_trg
  BEFORE UPDATE OR DELETE ON lists
  FOR EACH ROW EXECUTE FUNCTION lists_protect_inbox();
