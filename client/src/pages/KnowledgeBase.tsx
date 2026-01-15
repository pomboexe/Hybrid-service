import { useKnowledgeBase, useDeleteKnowledge } from "@/hooks/use-knowledge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddKnowledgeModal } from "@/components/AddKnowledgeModal";
import { BookOpen, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";

export default function KnowledgeBase() {
  const { data: articles, isLoading } = useKnowledgeBase();
  const { mutate: deleteArticle } = useDeleteKnowledge();
  const [search, setSearch] = useState("");

  const filteredArticles = articles?.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage internal documentation and articles for your support team.</p>
        </div>
        <AddKnowledgeModal />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          className="pl-10 max-w-md bg-card border-border/60" 
          placeholder="Search articles..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
             <Card key={i} className="h-48 animate-pulse bg-muted/20" />
          ))
        ) : filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No articles found. Add one to get started.
          </div>
        ) : (
          filteredArticles.map((article) => (
            <Card key={article.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary mb-3">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this article?")) {
                                deleteArticle(article.id);
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                <CardTitle className="line-clamp-1 text-lg">{article.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                        {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {article.createdAt ? format(new Date(article.createdAt), "MMM d, yyyy") : ""}
                    </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {article.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
