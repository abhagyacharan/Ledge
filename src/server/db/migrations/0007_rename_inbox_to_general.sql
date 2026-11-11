-- Inbox became "General" (2026-11-11): rename each default list that still has its old name and icon.
-- Data only; lists the user renamed themselves are left alone.
UPDATE "lists" SET "name" = 'General' WHERE "is_inbox" = true AND "name" = 'Inbox';
--> statement-breakpoint
UPDATE "lists" SET "icon" = '📋' WHERE "is_inbox" = true AND "icon" = '📥';
