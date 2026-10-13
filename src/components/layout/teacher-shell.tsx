"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TeacherHeader } from "./teacher-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { FullScreenChat } from "@/components/chat/fullscreen-chat";
import { PublicFaqChat } from "@/components/chat/public-faq-chat";
import { useIsNativeApp } from "@/lib/native/app";
import type { SubscriptionState } from "./subscription-badge";

export interface TeacherShellProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  userName?: string;
  userRole?: string;
  subscriptionState?: SubscriptionState;
  subscriptionDaysLeft?: number;
}

/**
 * Unified teacher-facing app shell with top header, desktop marketing support,
 * and native app bottom navigation when in the APK.
 */
export function TeacherShell({
  children,
  isLoggedIn = false,
  userName,
  userRole,
  subscriptionState = "none",
  subscriptionDaysLeft,
}: TeacherShellProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const isNative = useIsNativeApp();
  const pathname = usePathname();

  const isMarketingPage =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/downloads" ||
    pathname === "/payment-success" ||
    pathname.startsWith("/pricing/");

  useEffect(() => {
    function handleOpenChat() {
      setChatOpen(true);
    }
    window.addEventListener("trb:open-chat", handleOpenChat);
    return () => window.removeEventListener("trb:open-chat", handleOpenChat);
  }, []);

  return (
    <div className={`flex min-h-screen flex-col bg-[#FDFBF7] ${isNative ? "pb-20" : ""}`}>
      <TeacherHeader
        isLoggedIn={isLoggedIn}
        userName={userName}
        userRole={userRole}
        subscriptionState={subscriptionState}
        subscriptionDaysLeft={subscriptionDaysLeft}
      />
      <main className="flex-1">{children}</main>

      {/* Mobile Bottom Navigation only inside native APK or non-marketing routes */}
      {(isNative || (!isMarketingPage && isLoggedIn)) && (
        <MobileBottomNav onOpenChat={() => setChatOpen(true)} />
      )}

      {/* Full screen AI chat view for authenticated app sessions */}
      <FullScreenChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Floating Public FAQ & WhatsApp support widget for web visitors */}
      {!isNative && <PublicFaqChat />}
    </div>
  );
}
