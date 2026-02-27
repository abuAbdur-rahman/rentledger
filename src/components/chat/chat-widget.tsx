"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSessionUser } from "@/components/auth/auth-context"
import axios from "axios"
import { MessageSquare, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Conversation {
  id: string
  otherUser: {
    id: string
    name: string
  }
  lastMessage: string | null
  lastMessageAt: string | null
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

interface ChatWidgetProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
  const user = useSessionUser()
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (!activeConversation) return

    fetchMessages(activeConversation)

    const channel = supabase
      .channel(`messages:${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversation, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get("/api/conversations")
      setConversations(data.conversations ?? [])
    } catch {
      // Silently fail
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/messages?conversation_id=${conversationId}`)
      setMessages(data.messages ?? [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return

    setSending(true)
    try {
      await axios.post("/api/messages", {
        conversation_id: activeConversation,
        content: newMessage.trim(),
      })
      setNewMessage("")
    } catch {
      // Silently fail
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-gray-900">Messages</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      {!activeConversation ? (
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a chat from your tenants page</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{conv.otherUser.name}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Back button + recipient */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => setActiveConversation(null)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Back
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-900">
              {conversations.find((c) => c.id === activeConversation)?.otherUser.name}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {!loading && messages.map((msg) => {
              const isMe = msg.sender_id === user.id
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="h-10 rounded-full border-gray-200 focus-visible:border-blue-500"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                size="icon"
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition-all hover:scale-105"
    >
      <MessageSquare className="w-6 h-6 text-white" />
    </button>
  )
}
