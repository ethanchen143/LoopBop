"use client";

import { Suspense } from "react";
import PracticePage from "@/components/PracticePage";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <PracticePage />
    </Suspense>
  );
}