"use client";

import React from "react";
import { useChat } from "./chat-context";
import { ConversationSidebar } from "./conversation-sidebar";
import { TopNavbar } from "./top-navbar";
import { NotificationToast } from "./notification-toast";

export function ChatLayoutShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser,
    conversations,
    activeConversationId,
    selectConversation,
    fetchConversations,
    socketEmit,
    notification,
    dismissNotification,
  } = useChat();

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden font-sans relative">
      {/* Real-Time Notification Toast */}
      <NotificationToast
        notification={notification}
        onOpen={(convId) => {
          fetchConversations();
          selectConversation(convId);
        }}
        onDismiss={dismissNotification}
      />

      {/* Top Application Header */}
      <TopNavbar />

      {/* Persistent Sidebar + Active Chat Viewport with Mobile Responsiveness */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar: Visible on mobile when no chat is active; on desktop always visible */}
        <div
          className={`h-full shrink-0 ${
            activeConversationId
              ? "hidden md:flex md:w-72 lg:w-80 border-r border-border/40"
              : "w-full md:w-72 lg:w-80 border-r border-border/40 flex"
          }`}
        >
          <ConversationSidebar
            currentUser={currentUser}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            socketEmit={socketEmit}
            onConversationCreated={(conv) => {
              fetchConversations();
              selectConversation(conv.id);
            }}
          />
        </div>

        {/* Dynamic Route Content (/chat or /chat/[id]) */}
        <div
          className={`flex-1 flex-col h-full bg-background overflow-hidden ${
            activeConversationId ? "flex w-full" : "hidden md:flex"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


