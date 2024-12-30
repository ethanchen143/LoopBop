"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Search, Music, Clock, Tag, Volume2, Disc, User } from 'lucide-react';

const categories = [
  { name: "Song", icon: Music },
  { name: "Artist", icon: User },
  { name: "Album", icon: Disc },
  { name: "Mood", icon: Music },
  { name: "Era", icon: Clock },
  { name: "Genre", icon: Tag },
  { name: "Sound", icon: Volume2 },
];

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    // For now, we'll just set some dummy results
    setSearchResults(["Result 1", "Result 2", "Result 3"]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white">
        <Link className="flex items-center justify-center" href="/dashboard">
          <Globe className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
            <Input
              type="text"
              placeholder="Search for songs, artists, or tags"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow bg-purple-100 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
            />
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Categories */}
          <div className="w-full md:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.name}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          selectedCategory === category.name ? "bg-purple-100" : ""
                        }`}
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        <category.icon className="mr-2 h-4 w-4" />
                        {category.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {/* Middle Sidebar - Search Results */}
          <div className="w-full md:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {searchResults.map((result, index) => (
                    <li key={index}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          selectedItem === result ? "bg-purple-100" : ""
                        }`}
                        onClick={() => setSelectedItem(result)}
                      >
                        {result}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content Area */}
          <div className="w-full md:w-2/4">
            <Card>
              <CardHeader>
                <CardTitle>{selectedItem || "Select an item to view details"}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <p>
                    This is where the detailed description for {selectedItem} would appear. 
                    In a full implementation, this would include comprehensive information 
                    about the selected item, such as its history, characteristics, and 
                    relevance to music theory or practice.
                  </p>
                ) : (
                  <p>
                    Select a category from the left sidebar and an item from the search 
                    results to view its detailed description here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 bg-white">
        © 2024 LoopBop. All rights reserved.
      </footer>
    </div>
  );
}

