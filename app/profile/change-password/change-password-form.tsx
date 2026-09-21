"use client"

import { useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react"

const passwordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

interface ChangePasswordFormProps {
  profilePath: string
  provider: string | null
}

export default function ChangePasswordForm({ profilePath, provider }: ChangePasswordFormProps) {
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    setIsSaving(true)

    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password updated",
        description: "Your password was changed successfully.",
      })
      form.reset()
    }

    setIsSaving(false)
  }

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2">
        <Button variant="ghost" asChild className="w-fit px-0 text-slate-600 hover:text-slate-900">
          <Link href={profilePath}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to profile
          </Link>
        </Button>
        <div>
          <CardTitle className="text-2xl font-semibold text-slate-900">Update password</CardTitle>
          <CardDescription>
            Create a strong password to keep your EventLK account secure.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {provider && provider !== "email" && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldCheck className="h-5 w-5" />
            <p>
              You originally signed in with {provider}. Setting a password lets you log in with email in the future.
            </p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save password
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
