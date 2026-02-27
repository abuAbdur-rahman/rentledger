import { createServerClient } from "@/lib/supabase/server"

export async function createNotification({
  userId,
  title,
  message,
  type = "system",
}: {
  userId: string
  title: string
  message?: string
  type?: "payment" | "system" | "message"
}) {
  const supabase = await createServerClient()
  
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
  })

  if (error) {
    console.error("Failed to create notification:", error)
  }
}
