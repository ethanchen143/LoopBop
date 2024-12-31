"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Clock, Tag, Volume2, Disc, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const categories = [
  { name: "Song", icon: Music },
  { name: "Artist", icon: User },
  { name: "Album", icon: Disc },
  { name: "Mood", icon: Music },
  { name: "Era", icon: Clock },
  { name: "Genre", icon: Tag },
  { name: "Sound", icon: Volume2 },
];

interface SelectedItem {
  name: string;
  artist ?: string;
  artists ?: string; 
  album ?: string; 
  youtube ?: string; 
  profilePicture ?: string;
  coverImage ?: string;
  description ?: string;
}

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState("Song");
  const [searchResults, setSearchResults] = useState([]); // Holds all search results
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState(""); // Trigger search  
  const limit = 15;
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/explore?page=${page}&limit=${limit}&category=${selectedCategory}&search=${encodeURIComponent(activeSearchTerm)}`
        );
        const result = await response.json();
        setSearchResults(result.results);
        setSelectedItem(null); // Reset selected item on category change
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory, page, activeSearchTerm]); // Depend on activeSearchTerm  

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(1, prev - 1));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-purple-50">
        <p className="text-xl font-semibold text-purple-600">Loading...</p>
      </div>
    );
  }

  const handlePractice = () => {
    if (selectedItem) {
      const practiceUrl = `/practice?song=${encodeURIComponent(selectedItem.name)}&artist=${encodeURIComponent(selectedItem.artist || "")}&album=${encodeURIComponent(selectedItem.album || "")}`;
      router.push(practiceUrl);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white shadow">
        <Music className="h-6 w-6 text-purple-600" />
        <Link className="flex items-center justify-center" href="/">
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
      <main className="flex flex-1 container mx-auto px-4 py-8 gap-4">
        {/* Left Sidebar - Categories */}
        <div className="w-1/6">
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
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setPage(1);
                      }}
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

        {/* Mid-Left Sidebar - Search Results */}
        <div className="w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} // Update searchTerm without triggering fetch
                  className="flex-grow px-4 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => {
                    setActiveSearchTerm(searchTerm); // Trigger fetch only on button click
                    setPage(1); // Reset to the first page
                  }}
                >
                  Search
                </Button>
              </div>
              <ul className="space-y-2">
                {searchResults.map((item: SelectedItem, index) => (
                  <li key={index}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${
                        selectedItem?.name === item.name ? "bg-purple-100" : ""
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>

            <div className="flex justify-between p-4">
              <Button onClick={handlePrevPage} disabled={page === 1}>
                Prev
              </Button>
              <span>Page {page}</span>
              <Button onClick={handleNextPage} disabled={searchResults.length < limit}>Next</Button>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Item Details */}
        <div className="w-2/3">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedItem ? selectedItem.name : "Select an item to view details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <div>
                  {selectedCategory === "Song" && (
                    <>
                      <p>in {`"`+selectedItem.album+ `"`|| "N/A"}</p>
                      <p>by {selectedItem.artist || "N/A"}</p>
                      {selectedItem.youtube && (
                        <div className="mt-4 flex">
                          <iframe
                            width="75%"
                            height="400"
                            src={`https://www.youtube.com/embed/${new URL(selectedItem.youtube).searchParams.get("v")}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                      <Button
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={handlePractice}
                      >
                        Start Practice
                      </Button>
                    </>
                  )}
                  {selectedCategory === "Artist" && (
                    <>
                      <img src={selectedItem.profilePicture} alt={`${selectedItem.name}'s Profile`} className="w-full h-auto rounded-lg mb-4" />
                      <p>{selectedItem.description || "No description available."}</p>
                    </>
                  )}
                  {selectedCategory === "Album" && (
                    <>
                      <img src={selectedItem.coverImage} alt={`${selectedItem.name} Cover`} className="w-full h-auto rounded-lg mb-4" />
                      <p>by {selectedItem.artists || "N/A"}</p>
                      <p>{selectedItem.description || "No description available."}</p>
                    </>
                  )}
                  {["Mood", "Era", "Genre", "Sound"].includes(selectedCategory) && (
                    <>
                      {/* <img src={selectedItem.profilePicture} alt={`${selectedItem.name} Image`} className="w-full h-auto rounded-lg mb-4" /> */}
                      <p> {selectedItem.description || "No description available."}</p>
                    </>
                  )}
                </div>
              ) : (
                <p>Please select an item from the list to see its details here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}