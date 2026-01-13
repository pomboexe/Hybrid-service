import { useTickets } from "@/hooks/use-tickets";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Ticket, AlertCircle, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { data: tickets, isLoading } = useTickets();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const ticketList = tickets || [];

  // Calculate stats
  const total = ticketList.length;
  const open = ticketList.filter(t => t.status === "open").length;
  const resolved = ticketList.filter(t => t.status === "resolved").length;
  const escalated = ticketList.filter(t => t.status === "escalated").length;

  const sentimentData = [
    { name: "Positive", value: ticketList.filter(t => t.sentiment?.toLowerCase() === "positive").length, color: "#16a34a" },
    { name: "Neutral", value: ticketList.filter(t => t.sentiment?.toLowerCase() === "neutral").length, color: "#ca8a04" },
    { name: "Negative", value: ticketList.filter(t => t.sentiment?.toLowerCase() === "negative").length, color: "#dc2626" },
  ];

  const priorityData = [
    { name: "Low", tickets: ticketList.filter(t => t.priority === "low").length },
    { name: "Medium", tickets: ticketList.filter(t => t.priority === "medium").length },
    { name: "High", tickets: ticketList.filter(t => t.priority === "high").length },
  ];

  return (
    <div className="space-y-8 animate-enter">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of support performance and ticket metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Ticket} label="Total Tickets" value={total} color="bg-blue-500" />
        <StatCard icon={AlertCircle} label="Open Tickets" value={open} color="bg-yellow-500" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolved} color="bg-green-500" />
        <StatCard icon={Users} label="Escalated" value={escalated} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Ticket Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Customer Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
                {sentimentData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow border-border/50">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="text-2xl font-bold font-display">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-8">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
