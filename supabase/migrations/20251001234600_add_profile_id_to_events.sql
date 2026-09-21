ALTER TABLE events
ADD COLUMN profile_id UUID REFERENCES profiles(id);