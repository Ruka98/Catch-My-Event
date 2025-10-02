-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, preferred_categories, preferred_locations, max_price)
  VALUES (
    NEW.id,
    ARRAY['Music', 'Technology', 'Food']::TEXT[],
    ARRAY['Colombo']::TEXT[],
    5000.00
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update user reputation score
CREATE OR REPLACE FUNCTION public.update_user_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update reputation based on events posted and ratings received
  UPDATE public.profiles 
  SET 
    reputation_score = (
      SELECT COALESCE(
        (COUNT(e.id) * 10) + -- 10 points per event posted
        (COALESCE(AVG(r.rating), 0) * 20), -- Average rating * 20
        0
      )
      FROM public.events e
      LEFT JOIN public.user_event_ratings r ON e.id = r.event_id
      WHERE e.user_id = NEW.user_id
    ),
    total_events_posted = (
      SELECT COUNT(*) FROM public.events WHERE user_id = NEW.user_id
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update reputation when events are created or rated
CREATE TRIGGER update_reputation_on_event_insert
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reputation();

CREATE TRIGGER update_reputation_on_rating_insert
  AFTER INSERT ON public.user_event_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reputation();

-- Function to calculate event recommendations
CREATE OR REPLACE FUNCTION public.calculate_recommendations(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  user_prefs RECORD;
  event_rec RECORD;
  base_score DECIMAL(5,3);
  category_bonus DECIMAL(5,3);
  location_bonus DECIMAL(5,3);
  price_bonus DECIMAL(5,3);
  popularity_bonus DECIMAL(5,3);
  final_score DECIMAL(5,3);
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs 
  FROM public.user_preferences 
  WHERE user_id = target_user_id;
  
  -- Clear existing recommendations
  DELETE FROM public.event_recommendations WHERE user_id = target_user_id;
  
  -- Calculate recommendations for each published event
  FOR event_rec IN 
    SELECT e.*, 
           COUNT(ea.id) as attendee_count,
           COALESCE(AVG(r.rating), 0) as avg_rating
    FROM public.events e
    LEFT JOIN public.event_attendees ea ON e.id = ea.event_id
    LEFT JOIN public.user_event_ratings r ON e.id = r.event_id
    WHERE e.status = 'published' 
      AND e.date >= CURRENT_DATE
      AND e.user_id != target_user_id -- Don't recommend own events
    GROUP BY e.id
  LOOP
    -- Base score
    base_score := 0.3;
    
    -- Category preference bonus
    category_bonus := CASE 
      WHEN event_rec.category = ANY(user_prefs.preferred_categories) THEN 0.3
      ELSE 0.0
    END;
    
    -- Location preference bonus
    location_bonus := CASE 
      WHEN event_rec.location = ANY(user_prefs.preferred_locations) THEN 0.2
      ELSE 0.0
    END;
    
    -- Price preference bonus
    price_bonus := CASE 
      WHEN user_prefs.max_price IS NULL OR event_rec.price <= user_prefs.max_price THEN 0.1
      ELSE -0.2
    END;
    
    -- Popularity bonus (based on attendees and ratings)
    popularity_bonus := LEAST(0.1, (event_rec.attendee_count * 0.01) + (event_rec.avg_rating * 0.02));
    
    -- Calculate final score
    final_score := GREATEST(0.0, LEAST(1.0, 
      base_score + category_bonus + location_bonus + price_bonus + popularity_bonus
    ));
    
    -- Only insert if score is above threshold
    IF final_score >= 0.3 THEN
      INSERT INTO public.event_recommendations (user_id, event_id, score, reason)
      VALUES (
        target_user_id,
        event_rec.id,
        final_score,
        CASE 
          WHEN category_bonus > 0 AND location_bonus > 0 THEN 'Matches your preferred category and location'
          WHEN category_bonus > 0 THEN 'Matches your preferred category'
          WHEN location_bonus > 0 THEN 'In your preferred location'
          WHEN popularity_bonus > 0.05 THEN 'Popular event with good ratings'
          ELSE 'Recommended for you'
        END
      );
    END IF;
  END LOOP;
END;
$$;
