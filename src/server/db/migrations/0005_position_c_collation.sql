-- Custom migration: order `position` columns byte by byte.
--
-- Fractional-index positions (CLAUDE.md §3) mix upper and lower case letters and digits, and
-- they only sort correctly when compared byte by byte, which is what the JavaScript library
-- does. The database default collation (for example en_US.utf8) compares case-insensitively,
-- so ORDER BY position could disagree with the library. The "C" collation fixes that.
ALTER TABLE "lists" ALTER COLUMN "position" TYPE text COLLATE "C";
--> statement-breakpoint
ALTER TABLE "sections" ALTER COLUMN "position" TYPE text COLLATE "C";
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "position" TYPE text COLLATE "C";
