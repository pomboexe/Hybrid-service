import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Ticket, 
  BookOpen, 
  LogOut,
  HeadphonesIcon,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { href: "/", label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: "/tickets", label: t.sidebar.tickets, icon: Ticket },
    { href: "/knowledge", label: t.sidebar.knowledgeBase, icon: BookOpen },
  ];

  const userLinks = [
    { href: "/", label: t.sidebar.myTickets, icon: Ticket },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HeadphonesIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-none">AutoSupport</h1>
              <p className="text-xs text-muted-foreground mt-1">Support Desk</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Globe className="h-4 w-4" />
                <span className="sr-only">{t.common.language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLanguage("en")}
                className={cn(language === "en" && "bg-accent")}
              >
                <span className={cn("mr-2", language === "en" && "font-bold")}>{t.common.english}</span>
                {language === "en" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage("pt")}
                className={cn(language === "pt" && "bg-accent")}
              >
                <span className={cn("mr-2", language === "pt" && "font-bold")}>{t.common.portuguese}</span>
                {language === "pt" && "✓"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {user?.firstName?.[0] || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t.common.signOut}
        </button>
      </div>
    </div>
  );
}
