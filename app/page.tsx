"use client";

import { useRef } from "react";
import DrawingTool, { DrawingToolRef } from "@/components/DrawingTool";

export default function Page() {
  const drawingRef = useRef<DrawingToolRef>(null);

  return (
    <div className="max-h-screen flex flex-col items-center justify-center">
      <DrawingTool ref={drawingRef} />
    </div>
  );
}
