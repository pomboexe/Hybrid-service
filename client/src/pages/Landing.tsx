import { Button } from "@/components/ui/button";
import { HeadphonesIcon, CheckCircle2, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary text-primary-foreground rounded-lg">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">AutoSupport</span>
          </div>
          <a href="/api/login">
            <Button>Sign In</Button>
          </a>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative overflow-hidden pt-16 pb-24">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground mb-6">
                    Support your customers <br />
                    <span className="text-primary">at the speed of AI.</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                    A hybrid support desk that combines the efficiency of generative AI with the empathy of human agents. Automate 80% of queries, escalate the rest.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/api/login">
                        <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                            Get Started Now
                        </Button>
                    </a>
                </div>
            </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Zap}
                    title="AI-First Responses"
                    description="Generative AI answers customer queries instantly using your knowledge base."
                />
                <FeatureCard 
                    icon={Shield}
                    title="Seamless Takeover"
                    description="Agents can jump into any conversation seamlessly when complex issues arise."
                />
                <FeatureCard 
                    icon={CheckCircle2}
                    title="Smart Analytics"
                    description="Track sentiment, resolution times, and AI performance in real-time."
                />
            </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
            © 2024 AutoSupport. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
    return (
        <div className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors shadow-lg hover:shadow-xl">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
