-- The website collects a player's display name, not their legal name, so the
-- column is renamed to display_name to reflect what it actually holds.
alter table public.contacts rename column name to display_name;
