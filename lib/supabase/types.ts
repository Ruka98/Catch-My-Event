// lib/supabase/types.ts

export type EventAttendee = {
  id: string;
  event_id: string;
  user_id: string;
  status: "interested" | "attending" | "both" | "not_attending";
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url?: string | null;
  } | null;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  location: string;
  city: string | null;
  address: string | null;
  venue: string | null;
  date: string; // ISO or yyyy-mm-dd
  time: string | null;
  price: number | null;
  max_attendees: number | null;
  image_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "draft" | "published" | "cancelled" | "completed";
  featured: boolean | null;
  views: number | null;
  user_id: string | null;
  created_at: string | null;
  updated_at?: string | null;
  event_attendees?: EventAttendee[];
  like_count?: number;
  comments?: { count: number }[];
  user_has_liked?: boolean;
};

export type EventWithProfile = EventRow & {
  profiles?: {
    display_name: string | null;
    avatar_url?: string | null;
    reputation_score?: number | null;
  } | null;
};

export type Recommendation = {
  score: number;
  reason?: string | null;
  events: EventWithProfile;
};

export type Profile = {
  display_name: string;
  avatar_url?: string;
};

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  event_id: string;
  profiles: Profile | null;
  comment_likes: Array<{ user_id: string }>;
  replies?: Comment[];
}
