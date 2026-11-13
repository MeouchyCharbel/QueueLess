-- The application permits one business per owner. Run after the initial
-- migration; fail rather than silently delete pre-existing duplicates.
-- IF NOT EXISTS supports staging where the index already exists from seed.
CREATE UNIQUE INDEX IF NOT EXISTS "Business_ownerId_key"
  ON "Business" ("ownerId");
