-- A teacher-uploaded course (AI-generated from their notes). Null = built-in algebra course.
-- Contains answer keys; only Patch's server reads it.
alter table public.classes add column course jsonb;
