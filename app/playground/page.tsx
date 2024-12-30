"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Mic } from 'lucide-react';
import { useRouter } from "next/navigation";

const tagCategories = [
  { name: "Sound", tags: ["guitar", "drum", "piano", "bass"] },
  { name: "Era", tags: ["60s", "70s", "80s", "90s", "2000s", "2010s", "2020s"] },
  { name: "Mood", tags: ["happy", "sad", "energetic"] },
  { name: "Genre", tags: ["rock", "pop", "hip hop", "jazz"] },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement music generation functionality here
    console.log("Generating music with prompt:", prompt);
  };

  const addTagToPrompt = (tag: string) => {
    setPrompt((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white">
        <Link className="flex items-center justify-center" href="/dashboard">
          <Music className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button
            variant="link"
            onClick={() => {
              router.push("/dashboard");
            }}
          >
            Back to Dashboard
          </Button>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Music Generation Playground (coming soon...)</h1>
        <form onSubmit={handleGenerate} className="mb-8 max-w-2xl mx-auto">
          <Textarea
            placeholder="Describe the music you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mb-4 bg-purple-100 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
            rows={4}
          />
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Mic className="mr-2 h-4 w-4" />
            Generate Music
          </Button>
        </form>
        <div className="max-w-4xl mx-auto">
          {tagCategories.map((category) => (
            <Card key={category.name} className="mb-4">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.tags.map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => addTagToPrompt(tag)}
                      className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 bg-white">
        © 2024 LoopBop. All rights reserved.
      </footer>
    </div>
  );
}