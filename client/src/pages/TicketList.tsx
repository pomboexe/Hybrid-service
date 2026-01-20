import { useTickets } from "@/hooks/use-tickets";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, AlertCircle } from "lucide-react";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { useState } from "react";

export default function TicketList() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: result, isLoading, error } = useTickets(page, limit);
  const [search, setSearch] = useState("");

  const tickets = result?.tickets || [];
  const pagination = result?.pagination;

  // Filtrar tickets na página atual (a busca no GLPI seria ideal, mas por enquanto filtra localmente)
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar tickets</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Não foi possível carregar os tickets. Por favor, tente novamente mais tarde."}
          </AlertDescription>
        </Alert>
      )}

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
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    {error instanceof Error ? error.message : "Erro ao carregar tickets"}
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No tickets found.</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.glpiId || ticket.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      {ticket.glpiId ? `#GLPI-${ticket.glpiId}` : `#${ticket.id}`}
                    </td>
                    <td className="px-6 py-4 font-medium">{ticket.customerName || "Unknown"}</td>
                    <td className="px-6 py-4 text-foreground/80">{ticket.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="px-6 py-4"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-6 py-4"><SentimentIndicator sentiment={ticket.sentiment} /></td>
                    <td className="px-6 py-4 text-muted-foreground">
                        {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/tickets/${ticket.glpiId || ticket.id}`} className="inline-block">
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

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, pagination.total)} de {pagination.total} tickets
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* Botões de página */}
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                
                // Se houver poucas páginas, mostrar todas
                if (pagination.totalPages <= 7) {
                  for (let i = 1; i <= pagination.totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Sempre mostrar primeira página
                  pages.push(1);
                  
                  // Determinar range de páginas ao redor da página atual
                  let showStartEllipsis = false;
                  let showEndEllipsis = false;
                  
                  let start: number;
                  let end: number;
                  
                  if (page <= 3) {
                    // Página no início: mostrar 1, 2, 3, 4, ..., última
                    start = 2;
                    end = 4;
                    showEndEllipsis = true;
                  } else if (page >= pagination.totalPages - 2) {
                    // Página no fim: mostrar 1, ..., penúltima-2, penúltima-1, penúltima, última
                    start = pagination.totalPages - 3;
                    end = pagination.totalPages - 1;
                    showStartEllipsis = true;
                  } else {
                    // Página no meio: mostrar 1, ..., página-1, página, página+1, ..., última
                    start = page - 1;
                    end = page + 1;
                    showStartEllipsis = true;
                    showEndEllipsis = true;
                  }
                  
                  // Adicionar ellipsis inicial se necessário
                  if (showStartEllipsis) {
                    pages.push('ellipsis');
                  }
                  
                  // Adicionar páginas do meio
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }
                  
                  // Adicionar ellipsis final se necessário
                  if (showEndEllipsis) {
                    pages.push('ellipsis');
                  }
                  
                  // Sempre mostrar última página
                  pages.push(pagination.totalPages);
                }
                
                // Renderizar botões de página
                return pages.map((pageItem, index) => {
                  // Evitar duplicatas de ellipsis consecutivos
                  if (pageItem === 'ellipsis') {
                    // Verificar se o item anterior também era ellipsis
                    if (index > 0 && pages[index - 1] === 'ellipsis') {
                      return null;
                    }
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  const pageNum = pageItem as number;
                  // Evitar duplicatas de números
                  if (index > 0 && pages[index - 1] === pageNum) {
                    return null;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isActive={pageNum === page}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }).filter(Boolean); // Remover nulls
              })()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < pagination.totalPages) setPage(page + 1);
                  }}
                  className={page === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
