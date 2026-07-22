-- The questionnaire's closed answers now store canonical tokens. When someone
-- picks "other", the free text they type goes into a companion detail column,
-- keeping the main columns comparable across languages.

alter table public.contacts
  add column country_other text,
  add column preferred_language_other text,
  add column used_platforms_other text,
  add column preferred_platform_other text;
