"use client"

import type { FC } from "react"
import { createClient } from "@/lib/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/components/auth-guard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import InteractiveCalendar from "@/app/calendar/InteractiveCalendar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import type { Event, Profile, EventWithCounts } from "@/types/events"
import { Edit2Icon, Loader2, SaveIcon, UploadCloudIcon, UserIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { EventCard } from "@/components/EventCard"
import { z } from "zod"
import Link from "next/link"

const profileFormSchema = z.object({
  user_name: z.string().min(3, "Username must be at least 3 characters long"),
  mobile_number: z.string().optional().or(z.literal("")),
  full_name: z.string().optional().or(z.literal("")),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
})

interface ProfilePageProps {
  profile: Profile;
  isOwner: boolean;
  initialEvents: (Event | EventWithCounts)[];
  initialAttendingEvents: Event[];
}

const ProfilePage: FC<ProfilePageProps> = ({
  profile,
  isOwner,
  initialEvents,
  initialAttendingEvents,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState<(Event | EventWithCounts)[]>(initialEvents);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>(
    initialAttendingEvents
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      user_name: profile.user_name || "",
      full_name: profile.full_name || "",
      mobile_number: profile.mobile_number || "",
      website: profile.website || "",
    },
  });

  // Effects

  useEffect(() => {
    form.reset({
      user_name: profile.user_name || "",
      full_name: profile.full_name || "",
      mobile_number: profile.mobile_number || "",
      website: profile.website || "",
    })
  }, [form, profile.full_name, profile.mobile_number, profile.user_name, profile.website])

  useEffect(() => {
    setAvatarUrl(profile.avatar_url)
  }, [profile.avatar_url])

  // Handlers
  const handleEditToggle = () => {
    if (isEditing) {
      form.reset()
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return

    setIsSaving(true)

    const cleanedValues = {
      user_name: values.user_name.trim(),
      full_name: values.full_name.trim() || null,
      mobile_number: values.mobile_number.trim() || null,
      website: values.website.trim() || null,
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(cleanedValues)
      .eq("id", user.id)

    if (profileError) {
      toast({
        title: "Error updating profile",
        description: profileError.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Profile updated successfully",
      })
      form.reset({
        user_name: cleanedValues.user_name,
        full_name: cleanedValues.full_name ?? "",
        mobile_number: cleanedValues.mobile_number ?? "",
        website: cleanedValues.website ?? "",
      })
      setIsEditing(false)
      router.refresh()
    }

    setIsSaving(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return

    if (!user) {
      toast({
        title: "Please wait",
        description: "Your account information is still loading. Try again in a moment.",
      })
      event.target.value = ""
      return
    }

    const file = event.target.files[0]
    const fileExt = file.name.split(".").pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    setIsUploading(true)
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      toast({
        title: "Upload Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      })
    } else {
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const newAvatarUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newAvatarUrl }).eq("id", user.id)

      if (updateError) {
        toast({
          title: "Update Error",
          description: "Failed to update profile with new avatar.",
          variant: "destructive",
        })
      } else {
        setAvatarUrl(newAvatarUrl)
        toast({
          title: "Avatar updated!",
        })
        router.refresh()
      }
    }
    event.target.value = ""
    setIsUploading(false)
  }

  // Render
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
            <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 md:mx-0">
              <Avatar className="h-full w-full">
                <AvatarImage src={avatarUrl ?? undefined} alt={profile.user_name ?? ""} />
                <AvatarFallback>
                  <UserIcon className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              {isOwner && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full border border-slate-200 shadow"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || loading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloudIcon className="h-4 w-4" />}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploading || loading}
              />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-2xl font-semibold text-slate-900">{profile.full_name || profile.user_name}</h1>
              <p className="text-sm text-slate-500">@{profile.user_name}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 md:justify-start">
                {profile.mobile_number && <span>{profile.mobile_number}</span>}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-500"
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
          {isOwner && (
            <div className="flex flex-col items-center gap-2 md:flex-row">
              {isEditing && (
                <Button type="button" variant="ghost" onClick={handleEditToggle}>
                  <XIcon className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    void form.handleSubmit(onSubmit)()
                  } else {
                    setIsEditing(true)
                  }
                }}
                disabled={isSaving}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isEditing ? (
                  <span className="flex items-center">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        Save changes
                      </>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Edit2Icon className="mr-2 h-4 w-4" />
                    Edit details
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
        <Separator />
        <div className="p-6">
          {isOwner ? (
            isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="user_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500" disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save changes
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</h3>
                  <p className="mt-1 text-base text-slate-800">{profile.user_name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</h3>
                  <p className="mt-1 text-base text-slate-800">{profile.full_name || "Not added yet"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile</h3>
                  <p className="mt-1 text-base text-slate-800">{profile.mobile_number || "Not added yet"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</h3>
                  {profile.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-base text-sky-600 hover:text-sky-500"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    <p className="mt-1 text-base text-slate-800">Not added yet</p>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</h3>
                <p className="mt-1 text-base text-slate-800">{profile.user_name}</p>
              </div>
              {profile.website && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</h3>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex text-base text-sky-600 hover:text-sky-500"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isOwner && (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            {user?.app_metadata?.provider !== "email" && (
              <p className="text-sm text-slate-500">
                You are logged in with a social provider. You can add a password to your account to log in with email
                and password.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Update your password.</p>
              <Link href="/profile/change-password" passHref>
                <Button className="bg-sky-600 text-white hover:bg-sky-500">Change Password</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,350px),1fr]">
        {isOwner && (
          <div className="space-y-6">
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">My calendar</CardTitle>
                <p className="text-sm text-slate-500">
                  Events you are going to.
                </p>
              </CardHeader>
              <CardContent>
                <InteractiveCalendar events={attendingEvents} />
              </CardContent>
            </Card>
          </div>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isOwner ? "My events" : `${profile.full_name || profile.user_name}'s events`}
            </h2>
            <p className="text-sm text-slate-500">
              {isOwner ? "Your latest posts appear here." : "Events shared by this organizer."}
            </p>
          </div>
          {events.length > 0 ? (
            <div className="space-y-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  user={user}
                  onUpdate={() => router.refresh()}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-3xl border border-dashed border-slate-300 bg-slate-50">
              <CardContent className="py-10 text-center text-slate-500">
                {isOwner ? "You haven't posted any events yet." : "No events published yet."}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
