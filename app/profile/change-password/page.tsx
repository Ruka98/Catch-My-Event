"use client"

import { createClient } from "@/lib/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-guard"

const passwordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  })

  const onPasswordChangeSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!user) return
    setIsChangingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password updated successfully",
      })
      passwordForm.reset()
    }
    setIsChangingPassword(false)
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          {user?.app_metadata?.provider !== "email" && (
            <p className="text-sm text-slate-500">
              You are logged in with a social provider. You can add a password to your account to log in with email and
              password.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500" disabled={isChangingPassword}>
                  {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}