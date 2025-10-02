-- RLS Policies for profiles table
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for events table
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING (status = 'published');
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments table
CREATE POLICY "Anyone can view comments on published events" ON public.comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = comments.event_id AND events.status = 'published'
  )
);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for event_attendees table
CREATE POLICY "Anyone can view attendee counts" ON public.event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can manage own attendance" ON public.event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.event_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own attendance" ON public.event_attendees FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_event_ratings table
CREATE POLICY "Users can view all ratings" ON public.user_event_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON public.user_event_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.user_event_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.user_event_ratings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_preferences table
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for event_recommendations table
CREATE POLICY "Users can view own recommendations" ON public.event_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert recommendations" ON public.event_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update recommendations" ON public.event_recommendations FOR UPDATE USING (true);
CREATE POLICY "System can delete recommendations" ON public.event_recommendations FOR DELETE USING (true);
