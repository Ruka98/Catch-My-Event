-- Add end_date field to events table for date ranges (carnivals, festivals, etc.)
ALTER TABLE public.events 
ADD COLUMN end_date DATE;

-- Add subcategory field for events (especially for music subcategories)
ALTER TABLE public.events 
ADD COLUMN subcategory TEXT;

-- Create index for end_date for better performance
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON public.events(subcategory);

-- Update existing events to have end_date same as date (single day events)
UPDATE public.events 
SET end_date = date 
WHERE end_date IS NULL;
