import { useRoute } from "wouter";
import { useTicket, useUpdateTicket, useAssignTicket, useRequestTransfer, useAcceptTransfer, useUnassignTicket, useRejectTransfer } from "@/hooks/use-tickets";
import { useConversation } from "@/hooks/use-chat";
import { useSendTicketMessage } from "@/hooks/use-ticket-messages";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import { TransferRequestModal } from "@/components/TransferRequestModal";
import { User, Send, CheckCircle, MessageSquare, UserCheck, UserX, ArrowRightLeft, BadgeAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TicketDetail() {
  const [match, params] = useRoute("/tickets/:id");
  const id = parseInt(params?.id || "0");
  const { data: ticket, isLoading } = useTicket(id);
  const { mutate: updateTicket, isPending: isUpdating } = useUpdateTicket();
  const { mutate: assignTicket, isPending: isAssigning } = useAssignTicket();
  const { mutate: requestTransfer, isPending: isRequesting } = useRequestTransfer();
  const { mutate: acceptTransfer, isPending: isAccepting } = useAcceptTransfer();
  const { mutate: unassignTicket, isPending: isUnassigning } = useUnassignTicket();
  const { mutate: rejectTransfer } = useRejectTransfer();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Chat hooks
  const { data: conversation } = useConversation(ticket?.conversationId || null);
  const { mutate: sendMessage, isPending: isSending } = useSendTicketMessage();

  const [messageInput, setMessageInput] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for transfer requests periodically
  useEffect(() => {
    if (ticket && isAdmin && ticket.assignedTo === user?.id) {
      const ticketWithUsers = ticket as any;
      if (ticketWithUsers?.transferRequestToUser) {
        setTransferModalOpen(true);
      }
    } else {
      setTransferModalOpen(false);
    }
  }, [ticket, isAdmin, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (isLoading || !ticket) return <div className="p-8">Loading ticket details...</div>;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !ticket.id) return;

    sendMessage({
      ticketId: ticket.id,
      content: messageInput,
      role: isAdmin ? "agent" : "user",
      conversationId: ticket.conversationId || null,
    });
    setMessageInput("");
  };

  const handleResolve = () => {
    updateTicket({ id, status: "resolved" });
  };

  const handleAssign = () => {
    assignTicket(id);
  };

  const handleRequestTransfer = () => {
    requestTransfer(id);
  };

  const handleUnassign = () => {
    unassignTicket(id);
  };

  const handleRejectTransfer = () => {
    rejectTransfer(id, {
      onSuccess: () => {
        setTransferModalOpen(false);
      },
    });
  };

  // Type assertion for ticket with user info
  const ticketWithUsers = ticket as any;
  const assignedToUser = ticketWithUsers?.assignedToUser;
  const transferRequestToUser = ticketWithUsers?.transferRequestToUser;
  const isAssignedToMe = assignedToUser?.id === user?.id;
  const isAssignedToSomeoneElse = assignedToUser && !isAssignedToMe;
  const hasTransferRequest = transferRequestToUser && isAssignedToMe;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col md:flex-row gap-6 animate-enter">
      {/* Left Column: Ticket Info */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <Card className="flex-1 shadow-lg border-border/60">
          <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="text-xl leading-tight">{ticket.title}</CardTitle>
                <StatusBadge status={ticket.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
                Created on {ticket.createdAt ? format(new Date(ticket.createdAt), "PPP p") : "-"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Customer</span>
                    <span className="font-medium">{ticket.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sentiment</span>
                    <SentimentIndicator sentiment={ticket.sentiment} />
                </div>
                {isAdmin && (
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Em atendimento por</span>
                    <span className="text-sm font-medium">
                      {assignedToUser 
                        ? `${assignedToUser.firstName || ''} ${assignedToUser.lastName || ''}`.trim() || assignedToUser.email
                        : "Ninguém"}
                    </span>
                  </div>
                )}
            </div>

            <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Initial Request</h4>
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/50 p-3 rounded-lg border border-border/50">
                    {ticket.description}
                </p>
            </div>

            {isAdmin && ticket.status !== 'resolved' && (
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {!assignedToUser && (
                  <Button 
                    onClick={handleAssign} 
                    disabled={isAssigning}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {isAssigning ? "Assumindo..." : "Assumir Atendimento"}
                  </Button>
                )}
                
                {isAssignedToMe && (
                  <>
                    {hasTransferRequest && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <BadgeAlert className="w-4 h-4" />
                          <span className="text-sm font-medium">Solicitação de transferência pendente</span>
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={handleUnassign} 
                      disabled={isUnassigning}
                      variant="outline"
                      className="w-full"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      {isUnassigning ? "Liberando..." : "Liberar Atendimento"}
                    </Button>
                  </>
                )}
                
                {isAssignedToSomeoneElse && (
                  <Button 
                    onClick={handleRequestTransfer} 
                    disabled={isRequesting}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    {isRequesting ? "Solicitando..." : "Solicitar Transferência"}
                  </Button>
                )}
                
                {isAssignedToMe && (
                  <Button 
                    onClick={handleResolve} 
                    disabled={isUpdating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Chat Interface */}
      <Card className="w-full md:w-2/3 flex flex-col shadow-lg border-border/60 h-full overflow-hidden">
        <CardHeader className="border-b border-border/50 py-4 bg-muted/20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold">Conversation</h3>
                    <p className="text-xs text-muted-foreground">
                        {isAdmin ? "Chat with customer" : "Chat with support team"}
                    </p>
                </div>
            </div>
        </CardHeader>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {!conversation?.messages?.length ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No messages yet.
                </div>
            ) : (
                conversation.messages.map((msg) => {
                    const isAgent = msg.role === "agent";
                    const isUser = msg.role === "user";
                    
                    // For users: show their messages on right, agent messages on left
                    // For admins: show agent messages on right, user messages on left
                    const showOnRight = isAdmin ? isAgent : isUser;
                    
                    return (
                        <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", showOnRight ? "ml-auto flex-row-reverse" : "")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                                isAgent 
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-indigo-100 text-indigo-600"
                            )}>
                                {isAgent ? <MessageSquare className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm shadow-sm",
                                isAgent 
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-indigo-600 text-white rounded-tr-none"
                            )}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <span className="text-[10px] opacity-70 mt-1 block text-white/70">
                                    {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : ""}
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <div className="p-4 bg-white border-t border-border">
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={
                      isAdmin ? "Type your reply as agent..." : "Type your message..."
                    }
                    className="flex-1"
                    disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
      </Card>

      {/* Transfer Request Modal */}
      {isAdmin && hasTransferRequest && (
        <TransferRequestModal
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          ticketId={id}
          requestingUser={transferRequestToUser}
          onAccept={() => {
            acceptTransfer(id);
          }}
          onReject={handleRejectTransfer}
        />
      )}
    </div>
  );
}
