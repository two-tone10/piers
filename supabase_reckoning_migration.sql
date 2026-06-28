-- Add reckoning fields to voyages
alter table piers_voyages add column if not exists reckoning text;
alter table piers_voyages add column if not exists reckoning_at timestamptz;
