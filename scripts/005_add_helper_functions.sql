-- Function to increment event views
CREATE OR REPLACE FUNCTION increment_event_views(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.events 
  SET views = COALESCE(views, 0) + 1
  WHERE id = event_id;
END;
$$;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats(event_id UUID)
RETURNS TABLE(
  attendee_count BIGINT,
  interested_count BIGINT,
  average_rating NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(ea.id) FILTER (WHERE ea.status = 'attending') as attendee_count,
    COUNT(ea.id) FILTER (WHERE ea.status = 'interested') as interested_count,
    COALESCE(AVG(r.rating), 0) as average_rating
  FROM public.events e
  LEFT JOIN public.event_attendees ea ON e.id = ea.event_id
  LEFT JOIN public.user_event_ratings r ON e.id = r.event_id
  WHERE e.id = event_id
  GROUP BY e.id;
END;
$$;

-- Function to get user's event interaction history
CREATE OR REPLACE FUNCTION get_user_event_history(target_user_id UUID)
RETURNS TABLE(
  event_id UUID,
  interaction_type TEXT,
  interaction_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.event_id,
    'attendance'::TEXT as interaction_type,
    ea.status as interaction_value,
    ea.created_at
  FROM public.event_attendees ea
  WHERE ea.user_id = target_user_id
  
  UNION ALL
  
  SELECT 
    r.event_id,
    'rating'::TEXT as interaction_type,
    r.rating::TEXT as interaction_value,
    r.created_at
  FROM public.user_event_ratings r
  WHERE r.user_id = target_user_id
  
  ORDER BY created_at DESC;
END;
$$;

-- Enhanced recommendation function with better scoring
CREATE OR REPLACE FUNCTION public.calculate_recommendations(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  user_prefs RECORD;
  event_rec RECORD;
  user_history RECORD;
  base_score DECIMAL(5,3);
  category_bonus DECIMAL(5,3);
  location_bonus DECIMAL(5,3);
  price_bonus DECIMAL(5,3);
  popularity_bonus DECIMAL(5,3);
  creator_reputation_bonus DECIMAL(5,3);
  recency_bonus DECIMAL(5,3);
  final_score DECIMAL(5,3);
  user_categories TEXT[];
  user_locations TEXT[];
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs 
  FROM public.user_preferences 
  WHERE user_id = target_user_id;
  
  -- If no preferences exist, create default ones
  IF user_prefs IS NULL THEN
    INSERT INTO public.user_preferences (user_id, preferred_categories, preferred_locations, max_price)
    VALUES (
      target_user_id,
      ARRAY['Music', 'Technology', 'Food']::TEXT[],
      ARRAY['Colombo']::TEXT[],
      5000.00
    );
    
    SELECT * INTO user_prefs 
    FROM public.user_preferences 
    WHERE user_id = target_user_id;
  END IF;
  
  -- Analyze user's interaction history to infer preferences
  SELECT 
    array_agg(DISTINCT e.category) FILTER (WHERE ea.status IN ('attending', 'interested')),
    array_agg(DISTINCT e.location) FILTER (WHERE ea.status IN ('attending', 'interested'))
  INTO user_categories, user_locations
  FROM public.event_attendees ea
  JOIN public.events e ON ea.event_id = e.id
  WHERE ea.user_id = target_user_id;
  
  -- Merge inferred preferences with explicit preferences
  user_categories := COALESCE(user_categories, ARRAY[]::TEXT[]) || COALESCE(user_prefs.preferred_categories, ARRAY[]::TEXT[]);
  user_locations := COALESCE(user_locations, ARRAY[]::TEXT[]) || COALESCE(user_prefs.preferred_locations, ARRAY[]::TEXT[]);
  
  -- Clear existing recommendations
  DELETE FROM public.event_recommendations WHERE user_id = target_user_id;
  
  -- Calculate recommendations for each published event
  FOR event_rec IN 
    SELECT e.*, 
           COUNT(ea.id) FILTER (WHERE ea.status = 'attending') as attendee_count,
           COUNT(ea.id) FILTER (WHERE ea.status = 'interested') as interested_count,
           COALESCE(AVG(r.rating), 0) as avg_rating,
           p.reputation_score as creator_reputation,
           EXTRACT(EPOCH FROM (e.date - CURRENT_DATE)) / 86400 as days_until_event
    FROM public.events e
    LEFT JOIN public.event_attendees ea ON e.id = ea.event_id
    LEFT JOIN public.user_event_ratings r ON e.id = r.event_id
    LEFT JOIN public.profiles p ON e.user_id = p.id
    WHERE e.status = 'published' 
      AND e.date >= CURRENT_DATE
      AND e.user_id != target_user_id -- Don't recommend own events
      AND NOT EXISTS ( -- Don't recommend events user is already attending/interested
        SELECT 1 FROM public.event_attendees ea2 
        WHERE ea2.event_id = e.id AND ea2.user_id = target_user_id
      )
    GROUP BY e.id, p.reputation_score
  LOOP
    -- Base score
    base_score := 0.2;
    
    -- Category preference bonus (higher weight for inferred preferences)
    category_bonus := CASE 
      WHEN event_rec.category = ANY(user_categories) THEN 0.4
      WHEN event_rec.category = ANY(user_prefs.preferred_categories) THEN 0.3
      ELSE 0.0
    END;
    
    -- Location preference bonus
    location_bonus := CASE 
      WHEN event_rec.location = ANY(user_locations) THEN 0.3
      WHEN event_rec.location = ANY(user_prefs.preferred_locations) THEN 0.2
      ELSE 0.0
    END;
    
    -- Price preference bonus
    price_bonus := CASE 
      WHEN user_prefs.max_price IS NULL OR event_rec.price <= user_prefs.max_price THEN 0.1
      WHEN event_rec.price = 0 THEN 0.15 -- Free events get extra bonus
      ELSE -0.3
    END;
    
    -- Popularity bonus (based on attendees and ratings)
    popularity_bonus := LEAST(0.15, 
      (event_rec.attendee_count * 0.01) + 
      (event_rec.interested_count * 0.005) + 
      (event_rec.avg_rating * 0.03)
    );
    
    -- Creator reputation bonus
    creator_reputation_bonus := LEAST(0.1, COALESCE(event_rec.creator_reputation, 0) * 0.001);
    
    -- Recency bonus (events happening sooner get slight boost, but not too soon)
    recency_bonus := CASE 
      WHEN event_rec.days_until_event BETWEEN 3 AND 14 THEN 0.05
      WHEN event_rec.days_until_event BETWEEN 1 AND 30 THEN 0.02
      ELSE 0.0
    END;
    
    -- Calculate final score
    final_score := GREATEST(0.0, LEAST(1.0, 
      base_score + category_bonus + location_bonus + price_bonus + 
      popularity_bonus + creator_reputation_bonus + recency_bonus
    ));
    
    -- Only insert if score is above threshold
    IF final_score >= 0.3 THEN
      INSERT INTO public.event_recommendations (user_id, event_id, score, reason)
      VALUES (
        target_user_id,
        event_rec.id,
        final_score,
        CASE 
          WHEN category_bonus >= 0.3 AND location_bonus >= 0.2 THEN 'Perfect match: your favorite category in your preferred location'
          WHEN category_bonus >= 0.3 THEN 'Matches your interests in ' || event_rec.category
          WHEN location_bonus >= 0.2 THEN 'Happening in your preferred area: ' || event_rec.location
          WHEN event_rec.price = 0 THEN 'Free event you might enjoy'
          WHEN popularity_bonus >= 0.1 THEN 'Popular event with great reviews'
          WHEN creator_reputation_bonus >= 0.05 THEN 'From a highly-rated event organizer'
          ELSE 'Recommended based on your activity'
        END
      );
    END IF;
  END LOOP;
END;
$$;
