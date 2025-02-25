"use client";

import type React from "react";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Save, RotateCcw, Minus, Plus, Move } from "lucide-react";
import BrushSizePicker from "./BrushSizePicker";
import ColorPicker from "@/components/ColourPicker";

export interface DrawingToolRef {
  getImageData: () => string | null;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BORDER_SIZE = 20; // Size of white border around the drawn area

const DrawingTool = forwardRef<DrawingToolRef, {}>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState("#000000");
  const [isPanMode, setIsPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [lastPointerPosition, setLastPointerPosition] = useState({
    x: 0,
    y: 0,
  });

  const [drawBounds, setDrawBounds] = useState({
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null); // Initialize canvas with high-resolution support

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      // Get device pixel ratio

      const dpr = window.devicePixelRatio || 1; // Set canvas dimensions accounting for device pixel ratio

      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr; // Set the display size (CSS pixels)
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;

      const context = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: false,
      });

      if (context) {
        // Scale context according to device pixel ratio

        context.scale(dpr, dpr); // Set high quality settings
        context.lineCap = "round";
        context.lineJoin = "round";
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        setCtx(context); // Fill with white background
        context.fillStyle = "white";
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }, []); // Center the canvas once after initialization

  useEffect(() => {
    if (ctx && viewportRef.current && !isInitialized) {
      const viewport = viewportRef.current;
      const viewportRect = viewport.getBoundingClientRect(); // Center the canvas initially

      const initialX = (viewportRect.width - CANVAS_WIDTH) / 2;
      const initialY = (viewportRect.height - CANVAS_HEIGHT) / 2;

      setPanOffset({ x: initialX, y: initialY });
      setIsInitialized(true);
    }
  }, [ctx, isInitialized]);

  useEffect(() => {
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColor;
    }
  }, [ctx, brushSize, brushColor]);

  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const viewport = viewportRef.current;

      if (!canvas || !viewport) return { x: 0, y: 0 };

      const rect = viewport.getBoundingClientRect();

      const x = (clientX - rect.left - panOffset.x) / scale;
      const y = (clientY - rect.top - panOffset.y) / scale;

      return { x, y };
    },

    [scale, panOffset]
  );

  const updateDrawBounds = useCallback((x: number, y: number) => {
    setDrawBounds((prev) => ({
      minX: Math.min(prev.minX, x),
      minY: Math.min(prev.minY, y),
      maxX: Math.max(prev.maxX, x),
      maxY: Math.max(prev.maxY, y),
    }));
  }, []); // Quadratic curve interpolation for smoother lines

  const drawSmoothLine = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!ctx) return; // If this is the first point after starting a new line

      if (lastPointRef.current === null) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else {
        // Use quadratic curve for smoothing
        const lastPoint = lastPointRef.current; // Control point is the last point
        const controlPoint = lastPoint; // Calculate midpoint for smooth transition
        const midPoint = {
          x: (lastPoint.x + end.x) / 2,
          y: (lastPoint.y + end.y) / 2,
        };

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.quadraticCurveTo(
          controlPoint.x,
          controlPoint.y,
          midPoint.x,
          midPoint.y
        );
        ctx.stroke(); // Continue to end point
        ctx.beginPath();
        ctx.moveTo(midPoint.x, midPoint.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } // Store the current endpoint for the next segment

      lastPointRef.current = end;
    },

    [ctx]
  );

  const startDrawing = useCallback(
    (event: React.PointerEvent) => {
      if (ctx && !isPanMode) {
        const coords = getCanvasCoordinates(event.clientX, event.clientY);

        lastPointRef.current = coords;

        ctx.beginPath(); // Draw a single dot if the user just clicks without moving
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();

        setIsDrawing(true);
        updateDrawBounds(coords.x, coords.y);
      }
    },

    [
      ctx,
      isPanMode,
      getCanvasCoordinates,
      updateDrawBounds,
      brushColor,
      brushSize,
    ]
  );

  const draw = useCallback(
    (event: React.PointerEvent) => {
      if (isDrawing && ctx && !isPanMode) {
        const newCoords = getCanvasCoordinates(event.clientX, event.clientY); // Use pressure sensitivity if available

        // if (event.pressure && event.pressure > 0 && event.pressure <= 1) {
        //   const pressureSize = brushSize * (0.5 + event.pressure * 0.5);

        //   ctx.lineWidth = pressureSize;
        // }
        ctx.lineWidth = brushSize;

        if (lastPointRef.current) {
          drawSmoothLine(lastPointRef.current, newCoords);
        }

        updateDrawBounds(newCoords.x, newCoords.y);
      }
    },

    [
      isDrawing,
      ctx,
      isPanMode,
      getCanvasCoordinates,
      updateDrawBounds,
      drawSmoothLine,
      brushSize,
    ]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);

    lastPointRef.current = null;
  }, []);

  const startPanning = useCallback(
    (event: React.PointerEvent) => {
      if (isPanMode) {
        setIsPanning(true);
        setLastPointerPosition({ x: event.clientX, y: event.clientY });
      }
    },

    [isPanMode]
  );

  const pan = useCallback(
    (event: React.PointerEvent) => {
      if (isPanning) {
        const dx = event.clientX - lastPointerPosition.x;
        const dy = event.clientY - lastPointerPosition.y;

        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPointerPosition({ x: event.clientX, y: event.clientY });
      }
    },

    [isPanning, lastPointerPosition]
  );

  const stopPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleZoom = useCallback(
    (delta: number) => {
      if (!viewportRef.current) return;

      const viewport = viewportRef.current;
      const viewportRect = viewport.getBoundingClientRect(); // Get the center point of the viewport
      const viewportCenterX = viewportRect.width / 2;
      const viewportCenterY = viewportRect.height / 2; // Calculate where the center point is on the canvas
      const canvasCenterX = (viewportCenterX - panOffset.x) / scale;
      const canvasCenterY = (viewportCenterY - panOffset.y) / scale; // Calculate the new scale
      const newScale = Math.min(Math.max(scale + delta * 0.1, 0.1), 3);
      //const scaleFactor = newScale / scale; // Calculate the new offset to keep the center point at the same position
      const newOffsetX = viewportCenterX - canvasCenterX * newScale;
      const newOffsetY = viewportCenterY - canvasCenterY * newScale;

      setScale(newScale);
      setPanOffset({ x: newOffsetX, y: newOffsetY });
    },

    [scale, panOffset]
  );

  const getCanvasData = () => {
    const canvas = canvasRef.current;

    if (canvas && ctx) {
      // Add padding to the draw bounds
      const minX = Math.max(0, drawBounds.minX - BORDER_SIZE);
      const minY = Math.max(0, drawBounds.minY - BORDER_SIZE);
      const maxX = Math.min(CANVAS_WIDTH, drawBounds.maxX + BORDER_SIZE);
      const maxY = Math.min(CANVAS_HEIGHT, drawBounds.maxY + BORDER_SIZE);
      const width = maxX - minX;
      const height = maxY - minY; // Check if there's anything drawn

      if (
        width <= 0 ||
        height <= 0 ||
        drawBounds.minX === Number.POSITIVE_INFINITY ||
        drawBounds.minY === Number.POSITIVE_INFINITY
      ) {
        alert("There's nothing to save. Please draw something first.");

        return;
      } // Create a new canvas with the drawn area

      const saveCanvas = document.createElement("canvas"); // Use high resolution for exported image

      const dpr = window.devicePixelRatio || 1;

      saveCanvas.width = width * dpr;
      saveCanvas.height = height * dpr;

      const saveCtx = saveCanvas.getContext("2d", {
        alpha: false,
      });

      if (saveCtx) {
        // Scale according to device pixel ratio
        saveCtx.scale(dpr, dpr); // Fill with white background
        saveCtx.fillStyle = "white";
        saveCtx.fillRect(0, 0, width, height); // Draw the content
        saveCtx.drawImage(
          canvas,
          minX * dpr,
          minY * dpr,
          width * dpr,
          height * dpr,
          0,
          0,
          width,
          height
        ); // Convert to data URL and trigger download

        return saveCanvas;
      }
    }
  };

  const saveCanvas = () => {
    const canvasData = getCanvasData();

    const dataUrl = canvasData?.toDataURL("image/png");

    if (!dataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = dataUrl;
    link.click();
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;

    if (canvas && ctx && viewport) {
      //const dpr = window.devicePixelRatio || 1;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Re-center the canvas

      const viewportRect = viewport.getBoundingClientRect();
      const centerX = (viewportRect.width - CANVAS_WIDTH) / 2;
      const centerY = (viewportRect.height - CANVAS_HEIGHT) / 2;

      setPanOffset({ x: centerX, y: centerY });

      setScale(1);

      setDrawBounds({
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      });

      lastPointRef.current = null;
    }
  }; // Add wheel event handler for zoom

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const delta = -Math.sign(e.deltaY) * 0.5;

      handleZoom(delta);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [handleZoom]);

  const getCanvasImageData = useCallback(() => {
    const canvasData = getCanvasData();

    return canvasData?.toDataURL("image/png") || null;
  }, [canvasRef, ctx, drawBounds]);

  useImperativeHandle(ref, () => ({
    // Expose functions to the parent
    getImageData: getCanvasImageData,
  }));

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <BrushSizePicker value={brushSize} onChange={setBrushSize} />

        <ColorPicker value={brushColor} onChange={setBrushColor} />

        <button
          onClick={saveCanvas}
          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center"
        >
          <Save className="w-6 h-6" />
        </button>

        <button
          onClick={resetCanvas}
          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleZoom(-1)}
          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
        >
          <Minus className="w-6 h-6" />
        </button>

        <button
          onClick={() => handleZoom(1)}
          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button
          onClick={() => setIsPanMode(!isPanMode)}
          className={`w-8 h-8 border border-gray-300 rounded flex items-center justify-center ${
            isPanMode
              ? "bg-gray-800 text-white hover:bg-gray-800 hover:text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <Move className="w-6 h-6" />
        </button>
      </div>
      <div
        ref={viewportRef}
        className="relative w-3/4 aspect-square overflow-hidden border-2 border-gray-400 rounded-lg bg-slate-300 overscroll-none"
        onPointerDown={isPanMode ? startPanning : startDrawing}
        onPointerMove={isPanMode ? pan : draw}
        onPointerUp={isPanMode ? stopPanning : stopDrawing}
        onPointerLeave={isPanMode ? stopPanning : stopDrawing}
        style={{
          cursor: isPanMode ? (isPanning ? "grabbing" : "grab") : "crosshair",
        }}
      >
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          }}
        >
          <canvas ref={canvasRef} className="border border-gray-300" />
        </div>
      </div>
    </div>
  );
});

DrawingTool.displayName = "DrawingTool";

export default DrawingTool;
