import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { Button } from "@/components/ui/button";
import { Ticket, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import { useMyTickets } from "@/hooks/use-tickets";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserTickets() {
  const { data: tickets, isLoading } = useMyTickets();
  const [search, setSearch] = useState("");

  const filteredTickets = tickets?.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-enter">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">My Support Tickets</h1>
          <p className="text-muted-foreground mt-1">View and manage your support requests.</p>
        </div>
        <CreateTicketModal />
      </div>

      {tickets && tickets.length > 0 && (
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm max-w-md">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <Input
            placeholder="Search tickets..."
            className="border-none shadow-none focus-visible:ring-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filteredTickets.length === 0 && !isLoading ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first support ticket to get started
              </p>
              <CreateTicketModal />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="shadow-lg border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      #{ticket.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{ticket.title}</div>
                      {ticket.description && (
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                          {ticket.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {ticket.createdAt
                        ? format(new Date(ticket.createdAt), "MMM d, yyyy")
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
