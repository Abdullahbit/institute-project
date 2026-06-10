"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Send, MessageSquare, User, Loader2, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  fullName: string;
  role: "admin" | "teacher" | "student";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export function MessagingContainer() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Queries & Mutations
  const { data: contacts = [], refetch: refetchContacts } = trpc.messages.getContactList.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000, // Poll contact list updates every 5 seconds
  });

  const { data: messages = [], refetch: refetchMessages } = trpc.messages.getMessages.useQuery(
    { otherUserId: selectedContact?.id || "" },
    {
      enabled: !!user && !!selectedContact,
      refetchInterval: 5000, // Poll messages every 5 seconds when chat is open
    }
  );

  const sendMessageMutation = trpc.messages.sendMessage.useMutation();
  const markAsReadMutation = trpc.messages.markAsRead.useMutation();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Mark as read when selecting a contact or when new messages arrive
  useEffect(() => {
    if (selectedContact) {
      markAsReadMutation.mutate(
        { senderId: selectedContact.id },
        {
          onSuccess: () => {
            refetchContacts();
          },
        }
      );
    }
  }, [selectedContact, messages?.length]);

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) =>
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || isSending) return;

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        receiverId: selectedContact.id,
        content: newMessage.trim(),
      });
      setNewMessage("");
      refetchMessages();
      refetchContacts();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          label: language === "tr" ? "Yönetici" : "Admin",
          classes: "bg-purple-50 text-purple-700 border-purple-200/50",
        };
      case "teacher":
        return {
          label: language === "tr" ? "Öğretmen" : "Teacher",
          classes: "bg-blue-50 text-blue-700 border-blue-200/50",
        };
      case "student":
        return {
          label: language === "tr" ? "Öğrenci" : "Student",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
        };
      default:
        return {
          label: role,
          classes: "bg-slate-50 text-slate-700 border-slate-200/50",
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md h-[calc(100vh-12rem)] flex overflow-hidden">
      {/* Sidebar: Contacts list */}
      <div
        className={cn(
          "w-full md:w-80 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 shrink-0",
          selectedContact ? "hidden md:flex" : "flex"
        )}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === "tr" ? "Kişi ara..." : "Search contact..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition-all bg-slate-50/50"
            />
          </div>
        </div>

        {/* Contacts Roster */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {language === "tr" ? "Kullanıcı bulunamadı." : "No contacts found."}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const badge = getRoleBadge(contact.role);
              const isSelected = selectedContact?.id === contact.id;

              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                    isSelected
                      ? "bg-primary text-white shadow-sm"
                      : "hover:bg-slate-100 text-slate-800"
                  )}
                >
                  {/* Initials Avatar */}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border shadow-sm",
                      isSelected
                        ? "bg-white/20 border-white/10 text-white"
                        : "bg-white border-slate-200/80 text-primary"
                    )}
                  >
                    {getInitials(contact.fullName)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-white" : "text-slate-900"
                        )}
                      >
                        {contact.fullName}
                      </span>
                      {contact.lastMessageAt && (
                        <span
                          className={cn(
                            "text-[10px] shrink-0",
                            isSelected ? "text-white/70" : "text-slate-400"
                          )}
                        >
                          {formatTime(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      {/* Last message preview */}
                      <span
                        className={cn(
                          "text-xs truncate max-w-[140px]",
                          isSelected
                            ? "text-white/80"
                            : contact.unreadCount > 0
                            ? "font-semibold text-slate-900"
                            : "text-slate-500"
                        )}
                      >
                        {contact.lastMessage || (language === "tr" ? "Henüz mesaj yok" : "No messages yet")}
                      </span>

                      {/* Badge / Unread indicator */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {contact.unreadCount > 0 && (
                          <span className="bg-red-500 text-white font-extrabold text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center animate-pulse">
                            {contact.unreadCount}
                          </span>
                        )}
                        {!isSelected && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-md border font-medium",
                              badge.classes
                            )}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Panel: Messages stream */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors mr-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                  {getInitials(selectedContact.fullName)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedContact.fullName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md border font-medium inline-block",
                        getRoleBadge(selectedContact.role).classes
                      )}
                    >
                      {getRoleBadge(selectedContact.role).label}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span className="text-[10px] text-slate-400">
                      {language === "tr" ? "Çevrimiçi" : "Online"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-12">
                  <MessageSquare className="h-12 w-12 opacity-30 mb-2" />
                  <p>{language === "tr" ? "Sohbeti başlatmak için bir mesaj yazın." : "Send a message to start the conversation."}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.senderId === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex flex-col max-w-[75%]", isSelf ? "ml-auto items-end" : "mr-auto items-start")}
                    >
                      <div
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                          isSelf
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-200/50 rounded-bl-none"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white shadow-md">
              <div className="flex gap-2.5 items-center">
                <input
                  type="text"
                  placeholder={language === "tr" ? "Mesajınızı buraya yazın..." : "Type your message here..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white bg-slate-50/50 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-primary hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold h-10 w-10 rounded-xl shadow-sm transition-all flex items-center justify-center shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400/80 p-8 text-center">
            <div className="h-16 w-16 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm mb-4">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              {language === "tr" ? "Okul İçi Mesajlaşma" : "In-School Messaging"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {language === "tr"
                ? "Sohbet etmek, sorular sormak ve duyurular iletmek için sol taraftaki listeden bir yönetici, öğretmen veya öğrenci seçin."
                : "Select an administrator, teacher, or student from the left-side list to chat, ask questions, or deliver announcements."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
