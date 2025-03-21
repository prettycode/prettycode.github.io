"use client";

import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import PortfolioBuilderA from "@/components/PortfolioBuilderA";
import PortfolioBuilderB from "@/components/PortfolioBuilderB";
import PortfolioBuilderC from "@/components/PortfolioBuilderC";
import PortfolioBuilderD from "@/components/PortfolioBuilderD";
import PortfolioBuilderE from "@/components/PortfolioBuilderE";
import PortfolioBuilderF from "@/components/PortfolioBuilderF";
import PortfolioBuilderG from "@/components/PortfolioBuilderG";

type BuilderType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export default function PortfolioPage() {
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderType>("G");

  const portfolioComponents = {
    "A": <PortfolioBuilderA />,
    "B": <PortfolioBuilderB />,
    "C": <PortfolioBuilderC />,
    "D": <PortfolioBuilderD />,
    "E": <PortfolioBuilderE />,
    "F": <PortfolioBuilderF />,
    "G": <PortfolioBuilderG />
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6 px-4">
          <h1 className="text-2xl font-bold">Portfolio Builder</h1>
          <div className="w-48">
            <Select
              value={selectedBuilder}
              onValueChange={(value: BuilderType) => setSelectedBuilder(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a builder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Builder A</SelectItem>
                <SelectItem value="B">Builder B</SelectItem>
                <SelectItem value="C">Builder C</SelectItem>
                <SelectItem value="D">Builder D</SelectItem>
                <SelectItem value="E">Builder E</SelectItem>
                <SelectItem value="F">Builder F</SelectItem>
                <SelectItem value="G">Builder G</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4">
          {portfolioComponents[selectedBuilder]}
        </div>
      </div>
    </div>
  );
} 