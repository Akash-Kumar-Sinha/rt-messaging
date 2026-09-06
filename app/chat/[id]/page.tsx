"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/components/chat/chat-context";
import { MessageList } from "@/components/chat/message-list";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationInfoDrawer } from "@/components/chat/conversation-info-drawer";
import { CommandSearchModal } from "@/components/chat/command-search-modal";
import { ForwardModal } from "@/components/chat/forward-modal";
import { Loader2 } from "lucide-react";

export default function ActiveChatPage() {
  const router = useRouter();
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const {
    currentUser,
    activeConversationId,
    activeConversation,
    conversations,
    messages,
    hasMoreMessages,
    loadingMessages,
    loadingMoreMessages,
    typingUsers,
    socketStatus,
    socketEmit,
    selectConversation,
    loadMoreMessages,
    replyingToMessage,
    setReplyingToMessage,
    forwardingMessage,
    setForwardingMessage,
    forwardMessage,
    reactToMessage,
    deleteMessage,
    sendMessage,
    retryMessage,
  } = useChat();

  if (!activeConversationId) {
    return null;
  }

  const handleBackToSidebar = () => {
    selectConversation(null);
    router.push("/chat");
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      {/* Main Conversation Column */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Active Conversation Top Header */}
        <ChatHeader
          conversation={activeConversation}
          conversationId={activeConversationId}
          typingUsers={typingUsers}
          showInfoDrawer={showInfoDrawer}
          onBack={handleBackToSidebar}
          onOpenSearch={() => setShowSearchModal(true)}
          onToggleInfo={() => setShowInfoDrawer((prev) => !prev)}
        />

        {/* Messages History List */}
        {loadingMessages ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <MessageList
            conversationId={activeConversationId}
            currentUserId={currentUser.id}
            messages={messages}
            hasMore={hasMoreMessages}
            loadingMore={loadingMoreMessages}
            typingUsers={typingUsers}
            onLoadMore={loadMoreMessages}
            onRetry={retryMessage}
            onReact={reactToMessage}
            onReply={setReplyingToMessage}
            onForward={setForwardingMessage}
            onDelete={deleteMessage}
          />
        )}

        {/* Chat Input Surface */}
        <ChatInput
          conversationId={activeConversationId}
          onSendMessage={sendMessage}
          replyingTo={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
          onTypingStart={() =>
            socketEmit("typing:start", { conversationId: activeConversationId })
          }
          onTypingStop={() =>
            socketEmit("typing:stop", { conversationId: activeConversationId })
          }
          disabled={socketStatus !== "CONNECTED" && socketStatus !== "CONNECTING"}
        />
      </div>

      {/* Conversation Information Drawer (Right Side) */}
      {showInfoDrawer && (
        <ConversationInfoDrawer
          isOpen={showInfoDrawer}
          onClose={() => setShowInfoDrawer(false)}
          conversation={activeConversation}
          messages={messages}
          onOpenSearch={() => {
            setShowSearchModal(true);
          }}
        />
      )}

      {/* Forward Message Modal */}
      <ForwardModal
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        message={forwardingMessage}
        conversations={conversations}
        onForward={forwardMessage}
        onSelectConversation={(id) => {
          selectConversation(id);
          setForwardingMessage(null);
        }}
      />

      {/* Global Search Modal */}
      <CommandSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        conversations={conversations}
        onSelectConversation={(id) => {
          selectConversation(id);
          setShowSearchModal(false);
        }}
      />
    </div>
  );
}