-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- User scoring for recommendation system
  reputation_score INTEGER DEFAULT 0,
  total_events_posted INTEGER DEFAULT 0,
  total_events_attended INTEGER DEFAULT 0
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  venue TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  city TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  max_attendees INTEGER,
  image_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  -- Geographic coordinates for map view
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  -- Event status and metadata
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  featured BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  -- User who created the event
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table for event interactions
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For nested replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_attendees table for tracking who's attending
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'attending', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create user_event_ratings table for recommendation system
CREATE TABLE IF NOT EXISTS public.user_event_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create user_preferences table for recommendation system
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  max_price DECIMAL(10,2),
  max_distance_km INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create event_recommendations table to store calculated recommendations
CREATE TABLE IF NOT EXISTS public.event_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  score DECIMAL(5,3) NOT NULL, -- Recommendation score 0.000 to 1.000
  reason TEXT, -- Why this was recommended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_recommendations ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events(location);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON public.comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_user_id ON public.event_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_score ON public.event_recommendations(score DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
