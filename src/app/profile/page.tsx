"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  BookOpen,
  Heart,
  XCircle,
  TrendingUp,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";

interface ProfileData {
  topSections: { name: string; score: number }[];
  topTopics: { name: string; score: number }[];
  topReporters: { name: string; score: number }[];
  topOrganizations: { name: string; score: number }[];
  topLocations: { name: string; score: number }[];
  topMaterialTypes: { name: string; score: number }[];
  stats: {
    totalRead: number;
    totalLiked: number;
    totalDismissed: number;
    likeRate: number;
  };
  lastAnalyzed: string | null;
  aiInsights: string | null;
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [followedJournalists, setFollowedJournalists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { settings } = useAppStore();

  const fetchProfile = async () => {
    try {
      const [profileRes, journalistsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/journalists"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfileData(data);
      }

      if (journalistsRes.ok) {
        const data = await journalistsRes.json();
        setFollowedJournalists(data.journalists || []);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollowJournalist = async (name: string) => {
    try {
      await fetch("/api/journalists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action: "unfollow" }),
      });
      setFollowedJournalists((prev) => prev.filter((j) => j !== name));
    } catch (error) {
      console.error("Failed to unfollow journalist:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAnalyze = async () => {
    if (!settings.openaiApiKey) {
      alert("Please add your OpenAI API key in settings first.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: settings.openaiApiKey }),
      });

      if (res.ok) {
        await fetchProfile();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to analyze preferences");
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const maxScore = (items: { score: number }[]) =>
    Math.max(...items.map((i) => i.score), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Your Reading Profile</h1>
            <div className="ml-auto">
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !settings.openaiApiKey}
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : profileData ? (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {profileData.stats.totalRead}
                      </p>
                      <p className="text-sm text-gray-500">Articles Read</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                      <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {profileData.stats.totalLiked}
                      </p>
                      <p className="text-sm text-gray-500">Liked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {profileData.stats.totalDismissed}
                      </p>
                      <p className="text-sm text-gray-500">Dismissed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.round(profileData.stats.likeRate * 100)}%
                      </p>
                      <p className="text-sm text-gray-500">Like Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            {profileData.aiInsights && (
              <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {profileData.aiInsights}
                  </p>
                  {profileData.lastAnalyzed && (
                    <p className="text-xs text-gray-500 mt-3">
                      Last analyzed:{" "}
                      {new Date(profileData.lastAnalyzed).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preferences Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sections */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileData.topSections.length > 0 ? (
                    profileData.topSections.slice(0, 8).map((section) => (
                      <div key={section.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{section.name}</span>
                          <span className="text-gray-500">{section.score}</span>
                        </div>
                        <Progress
                          value={
                            (section.score /
                              maxScore(profileData.topSections)) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Like some articles to build your profile
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  {profileData.topTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileData.topTopics.slice(0, 15).map((topic) => (
                        <Badge
                          key={topic.name}
                          variant="secondary"
                          className="text-sm"
                        >
                          {topic.name}
                          <span className="ml-1 text-gray-500">
                            ({topic.score})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Like some articles to see your topic preferences
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Followed Reporters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Followed Reporters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {followedJournalists.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {followedJournalists.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="text-sm py-1.5 px-3 gap-2"
                        >
                          {name}
                          <button
                            onClick={() => handleUnfollowJournalist(name)}
                            className="hover:text-red-500 transition-colors"
                            title={`Unfollow ${name}`}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Follow reporters from article cards to see them here
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Material Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileData.topMaterialTypes.length > 0 ? (
                    profileData.topMaterialTypes.slice(0, 8).map((type) => (
                      <div key={type.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{type.name}</span>
                          <span className="text-gray-500">{type.score}</span>
                        </div>
                        <Progress
                          value={
                            (type.score /
                              maxScore(profileData.topMaterialTypes)) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No content type preferences yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Geographic Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  {profileData.topLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileData.topLocations.slice(0, 12).map((loc) => (
                        <Badge
                          key={loc.name}
                          variant="outline"
                          className="text-sm"
                        >
                          {loc.name}
                          <span className="ml-1 text-gray-500">
                            ({loc.score})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No location preferences yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Organizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Organizations of Interest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profileData.topOrganizations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileData.topOrganizations.slice(0, 12).map((org) => (
                        <Badge
                          key={org.name}
                          variant="outline"
                          className="text-sm"
                        >
                          {org.name}
                          <span className="ml-1 text-gray-500">
                            ({org.score})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No organization preferences yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">
              Start reading and liking articles to build your profile.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
