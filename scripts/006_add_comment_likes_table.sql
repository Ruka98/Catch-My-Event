-- Create comment_likes table for liking comments
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_likes
CREATE POLICY "Users can view all comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get comment with like counts and user like status
CREATE OR REPLACE FUNCTION get_comments_with_likes(target_event_id UUID, target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID,
  event_id UUID,
  user_id UUID,
  likes_count BIGINT,
  user_liked BOOLEAN,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.created_at,
    c.parent_id,
    c.event_id,
    c.user_id,
    COALESCE(like_counts.likes_count, 0) as likes_count,
    CASE 
      WHEN target_user_id IS NOT NULL AND user_likes.comment_id IS NOT NULL THEN true
      ELSE false
    END as user_liked,
    p.display_name,
    p.avatar_url
  FROM public.comments c
  LEFT JOIN public.profiles p ON c.user_id = p.id
  LEFT JOIN (
    SELECT comment_id, COUNT(*) as likes_count
    FROM public.comment_likes
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN (
    SELECT comment_id
    FROM public.comment_likes
    WHERE user_id = target_user_id
  ) user_likes ON c.id = user_likes.comment_id
  WHERE c.event_id = target_event_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_comments_with_likes TO authenticated;
