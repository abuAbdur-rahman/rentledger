"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "2349037884153";

export function FloatingSupport() {
  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsApp}
      className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200 hover:shadow-green-300 transition-all hover:scale-110 active:scale-95 lg:bottom-6"
      size="icon"
    >
      <MessageCircle className="w-6 h-6 text-white" />
      <span className="sr-only">Contact Support on WhatsApp</span>
    </Button>
  );
}
