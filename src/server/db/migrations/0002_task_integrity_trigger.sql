-- Custom migration: rules that a CHECK constraint or foreign key cannot express.
-- (CLAUDE.md §6.2: subtasks one level deep, "enforce in code and DB constraint".)
--
-- A task row is rejected when:
--   * its parent is itself a subtask (more than one level deep)
--   * it has subtasks of its own and is being made a subtask
--   * its parent belongs to another user or to another list
--   * its section belongs to another user or to another list
--   * its recurrence origin belongs to another user
-- Cross-user links for lists and tags are already blocked by composite foreign keys.
CREATE FUNCTION tasks_validate() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_parent uuid;
  parent_user uuid;
  parent_list uuid;
  section_list uuid;
  section_user uuid;
  origin_user uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT parent_id, user_id, list_id
      INTO parent_parent, parent_user, parent_list
      FROM tasks WHERE id = NEW.parent_id;
    IF FOUND THEN
      IF parent_parent IS NOT NULL THEN
        RAISE EXCEPTION 'subtasks can only be one level deep'
          USING ERRCODE = 'check_violation';
      END IF;
      IF parent_user <> NEW.user_id THEN
        RAISE EXCEPTION 'a subtask must belong to the same user as its parent'
          USING ERRCODE = 'check_violation';
      END IF;
      IF parent_list <> NEW.list_id THEN
        RAISE EXCEPTION 'a subtask must be in the same list as its parent'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM tasks WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'a task that has subtasks cannot become a subtask'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.section_id IS NOT NULL THEN
    SELECT list_id, user_id INTO section_list, section_user
      FROM sections WHERE id = NEW.section_id;
    IF FOUND AND (section_list <> NEW.list_id OR section_user <> NEW.user_id) THEN
      RAISE EXCEPTION 'a task''s section must belong to the same list'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.recurrence_origin_id IS NOT NULL THEN
    SELECT user_id INTO origin_user FROM tasks WHERE id = NEW.recurrence_origin_id;
    IF FOUND AND origin_user <> NEW.user_id THEN
      RAISE EXCEPTION 'a recurrence origin must belong to the same user'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tasks_validate_trg
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_validate();
