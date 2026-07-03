-- Add optional journal note to daily pulses (max 200 chars)
alter table piers_pulses add column if not exists note text check (char_length(note) <= 200);
