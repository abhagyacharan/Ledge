-- List icons became minimal line icons (2026-11-11): each list stores an icon key, not an emoji.
-- The emojis the app used to offer map to their line icon; General loses its emoji. Data only.
UPDATE "lists" SET "icon" = NULL WHERE "is_inbox" = true AND "icon" IN ('📋', '📥');
--> statement-breakpoint
UPDATE "lists" SET "icon" = CASE "icon"
  WHEN '🏠' THEN 'house'
  WHEN '💼' THEN 'briefcase'
  WHEN '🌱' THEN 'sprout'
  WHEN '🧾' THEN 'receipt'
  WHEN '📚' THEN 'book-open'
  WHEN '💪' THEN 'dumbbell'
  WHEN '✈️' THEN 'plane'
  WHEN '🛒' THEN 'shopping-cart'
  WHEN '💡' THEN 'lightbulb'
  WHEN '🎯' THEN 'target'
  WHEN '🎨' THEN 'palette'
  WHEN '❤️' THEN 'heart'
  ELSE "icon"
END
WHERE "icon" IN ('🏠', '💼', '🌱', '🧾', '📚', '💪', '✈️', '🛒', '💡', '🎯', '🎨', '❤️');
