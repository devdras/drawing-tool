"use client";

import { useRef } from "react";
import DrawingTool, { DrawingToolRef } from "@/components/DrawingTool";

export default function Page() {
  const drawingRef = useRef<DrawingToolRef>(null);

  return (
    <div>
      <DrawingTool ref={drawingRef} />
    </div>
  );
}
