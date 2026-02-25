"use client"

import { useState } from "react"
import { ChatWidget, ChatButton } from "@/components/chat/chat-widget"
import { useSessionUser } from "@/components/auth/auth-context"

export function ChatProvider() {
  const user = useSessionUser()
  const [isOpen, setIsOpen] = useState(false)

  // Only show chat for landlords
  if (user.role !== "landlord") {
    return null
  }

  return (
    <>
      <ChatButton onClick={() => setIsOpen(true)} />
      <ChatWidget isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
