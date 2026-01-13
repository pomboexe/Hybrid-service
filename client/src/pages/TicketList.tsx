import { useTickets } from "@/hooks/use-tickets";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import { format } from "date-fns";
import { useState } from "react";

export default function TicketList() {
  const { data: tickets, isLoading } = useTickets();
  const [search, setSearch] = useState("");

  const filteredTickets = tickets?.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.customerName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to customer support requests.</p>
        </div>
        <CreateTicketModal />
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm max-w-md">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search tickets..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="shadow-lg border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Sentiment</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading tickets...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No tickets found.</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">#{ticket.id}</td>
                    <td className="px-6 py-4 font-medium">{ticket.customerName || "Unknown"}</td>
                    <td className="px-6 py-4 text-foreground/80">{ticket.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="px-6 py-4"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-6 py-4"><SentimentIndicator sentiment={ticket.sentiment} /></td>
                    <td className="px-6 py-4 text-muted-foreground">
                        {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/tickets/${ticket.id}`} className="inline-block">
                        <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
