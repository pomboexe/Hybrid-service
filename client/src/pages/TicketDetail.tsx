import { useRoute } from "wouter";
import { useTicket, useUpdateTicket } from "@/hooks/use-tickets";
import { useConversation, useSendMessage } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import { Bot, User, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TicketDetail() {
  const [match, params] = useRoute("/tickets/:id");
  const id = parseInt(params?.id || "0");
  const { data: ticket, isLoading } = useTicket(id);
  const { mutate: updateTicket, isPending: isUpdating } = useUpdateTicket();
  
  // Chat hooks
  const { data: conversation } = useConversation(ticket?.conversationId || null);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (isLoading || !ticket) return <div className="p-8">Loading ticket details...</div>;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !ticket.conversationId) return;

    sendMessage({
        conversationId: ticket.conversationId,
        content: messageInput
    });
    setMessageInput("");
  };

  const handleTakeover = () => {
    updateTicket({ id, isAiActive: false, status: "open" });
  };

  const handleResolve = () => {
    updateTicket({ id, status: "resolved" });
  };

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
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">AI Agent</span>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded", ticket.isAiActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {ticket.isAiActive ? "ACTIVE" : "PAUSED"}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Initial Request</h4>
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/50 p-3 rounded-lg border border-border/50">
                    {ticket.description}
                </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {ticket.isAiActive ? (
                    <Button 
                        onClick={handleTakeover} 
                        disabled={isUpdating}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Takeover Chat (Stop AI)
                    </Button>
                ) : (
                    <Button 
                        onClick={() => updateTicket({ id, isAiActive: true })} 
                        disabled={isUpdating}
                        variant="outline"
                        className="w-full"
                    >
                        <Bot className="w-4 h-4 mr-2" />
                        Re-activate AI Agent
                    </Button>
                )}
                
                {ticket.status !== 'resolved' && (
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
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Chat Interface */}
      <Card className="w-full md:w-2/3 flex flex-col shadow-lg border-border/60 h-full overflow-hidden">
        <CardHeader className="border-b border-border/50 py-4 bg-muted/20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold">Live Conversation</h3>
                    <p className="text-xs text-muted-foreground">
                        {ticket.isAiActive ? "AI is responding automatically" : "Human agent has control"}
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
                    const isUser = msg.role === "user";
                    return (
                        <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", isUser ? "ml-auto flex-row-reverse" : "")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                                isUser ? "bg-indigo-100 text-indigo-600" : "bg-green-100 text-green-600"
                            )}>
                                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm shadow-sm",
                                isUser ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                            )}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <span className={cn("text-[10px] opacity-70 mt-1 block", isUser ? "text-indigo-100" : "text-gray-400")}>
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
                    placeholder={ticket.isAiActive ? "Takeover to send a message..." : "Type your reply..."}
                    className="flex-1"
                    disabled={ticket.isAiActive || isSending}
                />
                <Button type="submit" size="icon" disabled={ticket.isAiActive || isSending}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
            {ticket.isAiActive && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Disable AI to send manual messages
                </p>
            )}
        </div>
      </Card>
    </div>
  );
}
