"use client";

import { useState } from "react";
import {
  Sparkles,
  BookOpen,
  Heart,
  TrendingUp,
  Layers,
  Zap,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "./SettingsDialog";

interface WelcomePageProps {
  onGetStarted?: () => void;
}

export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Personalization",
      description:
        "The app learns your reading preferences over time. Like articles you enjoy, and the AI builds a profile of your interests to surface relevant content.",
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Story Clustering",
      description:
        "Related articles are automatically grouped into story clusters, helping you follow developing news narratives across multiple sources and time periods.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Smart Ranking",
      description:
        "Articles are scored based on your profile - sections you prefer, topics you follow, and journalists whose work you appreciate.",
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Interaction Tracking",
      description:
        "Like, save, and dismiss articles. Your interactions feed into the ranking algorithm, continuously improving recommendations.",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Multiple Sections",
      description:
        "Browse by section (Politics, Tech, Business, etc.), view your personalized 'For You' feed, or explore saved articles and reading history.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast & Responsive",
      description:
        "Built with Next.js and optimized for performance. Works beautifully on desktop and mobile with gesture support.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-900/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered News Reader
          </div>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="text-gray-900 dark:text-white">The New York Times</span>
            <span className="text-yellow-600 dark:text-yellow-500"> Reader</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            A personalized news reading experience that learns your interests
            and surfaces the stories that matter most to you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setSettingsOpen(true)}
              className="text-lg px-8 py-6 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Get Started
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open("https://github.com/ypargaonkar/nyt-reader", "_blank")}
              className="text-lg px-8 py-6"
            >
              View on GitHub
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tech Stack Badge */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Next.js 16</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">TypeScript</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Tailwind CSS</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">OpenAI GPT-4</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Turso (SQLite)</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">NYT API</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-100 dark:bg-gray-800/50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Add Your API Keys
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get a free NYT API key from developer.nytimes.com and optionally add an OpenAI key for AI features.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Read & Interact
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Browse articles, like ones you enjoy, save for later, and dismiss what doesn't interest you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Get Personalized
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                The app learns your preferences and ranks articles based on your reading profile.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Ready to try it?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
          Set up your API keys to start reading. The NYT API is free (500 calls/day).
          OpenAI is optional for AI-powered preference analysis.
        </p>
        <Button
          size="lg"
          onClick={() => setSettingsOpen(true)}
          className="text-lg px-8 py-6 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          Configure API Keys
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Built by Yash Pargaonkar | McCombs School of Business, UT Austin
          </p>
          <p className="mt-2">
            This is a personal project and is not affiliated with The New York Times.
          </p>
        </div>
      </footer>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
