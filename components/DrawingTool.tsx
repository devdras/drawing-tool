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
import { Save, RotateCcw, Minus, Plus, Move, Undo, Redo } from "lucide-react";
import BrushSizePicker from "@/components/BrushSizePicker";
import ColourPicker from "@/components/ColourPicker";

export interface DrawingToolRef {
  getImageData: () => string | null;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BORDER_SIZE = 20;

const DrawingTool = forwardRef<DrawingToolRef, {}>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColour, setBrushColour] = useState("#000000");
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
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;

      const context = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: false,
      });

      if (context) {
        context.scale(dpr, dpr);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        setCtx(context);
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Save the initial blank state
        const initialState = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        setHistory([initialState]);
        setHistoryIndex(0);
      }
    }
  }, []);

  // Center the canvas
  useEffect(() => {
    if (ctx && viewportRef.current && !isInitialized) {
      const viewport = viewportRef.current;
      const viewportRect = viewport.getBoundingClientRect();
      const initialX = (viewportRect.width - CANVAS_WIDTH) / 2;
      const initialY = (viewportRect.height - CANVAS_HEIGHT) / 2;
      setPanOffset({ x: initialX, y: initialY });
      setIsInitialized(true);
    }
  }, [ctx, isInitialized]);

  // Update brush properties
  useEffect(() => {
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColour;
    }
  }, [ctx, brushSize, brushColour]);

  // Helper functions
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
  }, []);

  // Drawing functions
  const drawSmoothLine = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!ctx) return;
      if (lastPointRef.current === null) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else {
        const lastPoint = lastPointRef.current;
        const controlPoint = lastPoint;
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
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midPoint.x, midPoint.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      lastPointRef.current = end;
    },
    [ctx]
  );

  const startDrawing = useCallback(
    (event: React.PointerEvent) => {
      if (ctx && !isPanMode) {
        const coords = getCanvasCoordinates(event.clientX, event.clientY);
        lastPointRef.current = coords;
        setIsDrawing(true);
        updateDrawBounds(coords.x, coords.y);

        // Draw the initial dot
        ctx.beginPath();
        ctx.fillStyle = brushColour;
        ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [
      ctx,
      isPanMode,
      getCanvasCoordinates,
      updateDrawBounds,
      brushColour,
      brushSize,
    ]
  );

  const draw = useCallback(
    (event: React.PointerEvent) => {
      if (isDrawing && ctx && !isPanMode) {
        const newCoords = getCanvasCoordinates(event.clientX, event.clientY);
        ctx.lineWidth = brushSize;
        if (lastPointRef.current) {
          drawSmoothLine(lastPointRef.current, newCoords);
          setHasDrawn(true);
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
    if (isDrawing && ctx) {
      setIsDrawing(false);
      lastPointRef.current = null;

      if (hasDrawn) {
        // Save the current state after drawing
        const imageData = ctx.getImageData(
          0,
          0,
          ctx.canvas.width,
          ctx.canvas.height
        );
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), imageData]);
        setHistoryIndex((prev) => prev + 1);
        setHasDrawn(false);
      }
    }
  }, [isDrawing, ctx, historyIndex, hasDrawn]);

  // Panning functions
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

  // Zooming function
  const handleZoom = useCallback(
    (delta: number) => {
      if (!viewportRef.current) return;
      const viewport = viewportRef.current;
      const viewportRect = viewport.getBoundingClientRect();
      const viewportCenterX = viewportRect.width / 2;
      const viewportCenterY = viewportRect.height / 2;
      const canvasCenterX = (viewportCenterX - panOffset.x) / scale;
      const canvasCenterY = (viewportCenterY - panOffset.y) / scale;
      const newScale = Math.min(Math.max(scale + delta * 0.1, 0.1), 3);
      const newOffsetX = viewportCenterX - canvasCenterX * newScale;
      const newOffsetY = viewportCenterY - canvasCenterY * newScale;
      setScale(newScale);
      setPanOffset({ x: newOffsetX, y: newOffsetY });
    },
    [scale, panOffset]
  );

  // Undo and Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0 && ctx) {
      setHistoryIndex((prev) => prev - 1);
      const imageData = history[historyIndex - 1];
      ctx.putImageData(imageData, 0, 0);
    }
  }, [history, historyIndex, ctx]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && ctx) {
      setHistoryIndex((prev) => prev + 1);
      const imageData = history[historyIndex + 1];
      ctx.putImageData(imageData, 0, 0);
    }
  }, [history, historyIndex, ctx]);

  // Canvas data functions
  const getCanvasData = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && ctx) {
      const minX = Math.max(0, drawBounds.minX - BORDER_SIZE);
      const minY = Math.max(0, drawBounds.minY - BORDER_SIZE);
      const maxX = Math.min(canvas.width, drawBounds.maxX + BORDER_SIZE);
      const maxY = Math.min(canvas.height, drawBounds.maxY + BORDER_SIZE);
      const width = maxX - minX;
      const height = maxY - minY;
      if (
        width <= 0 ||
        height <= 0 ||
        drawBounds.minX === Number.POSITIVE_INFINITY ||
        drawBounds.minY === Number.POSITIVE_INFINITY
      ) {
        alert("There's nothing to save. Please draw something first.");
        return;
      }
      const saveCanvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;

      saveCanvas.width = width * dpr;
      saveCanvas.height = height * dpr;
      const saveCtx = saveCanvas.getContext("2d", { alpha: false });
      if (saveCtx) {
        saveCtx.scale(dpr, dpr);
        saveCtx.fillStyle = "white";
        saveCtx.fillRect(0, 0, width, height);
        saveCtx.drawImage(
          canvas,
          minX,
          minY,
          width,
          height,
          0,
          0,
          width,
          height
        );
        return saveCanvas;
      }
    }
  }, [drawBounds, ctx]);

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
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const viewportRect = viewport.getBoundingClientRect();
      const centerX =
        (viewportRect.width - ctx.canvas.width / window.devicePixelRatio) / 2;
      const centerY =
        (viewportRect.height - ctx.canvas.height / window.devicePixelRatio) / 2;
      setPanOffset({ x: centerX, y: centerY });
      setScale(1);
      setDrawBounds({
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      });
      lastPointRef.current = null;
      setHasDrawn(false);

      // Reset the history to the initial blank state
      const initialState = ctx.getImageData(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  };

  // Wheel event handler for zoom
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
  }, [getCanvasData]);

  useImperativeHandle(ref, () => ({
    getImageData: getCanvasImageData,
  }));

  return (
    <div className="w-full max-w-2xl mx-auto p-4 overscroll-contain">
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <button
          onClick={saveCanvas}
          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center"
        >
          <Save className="w-6 h-6" />
        </button>
        <BrushSizePicker value={brushSize} onChange={setBrushSize} />
        <ColourPicker value={brushColour} onChange={setBrushColour} />

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
        <button
          onClick={undo}
          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
          disabled={historyIndex <= 0}
        >
          <Undo
            className={`w-6 h-6 ${historyIndex <= 0 ? "text-gray-300" : ""}`}
          />
        </button>
        <button
          onClick={redo}
          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
          disabled={historyIndex >= history.length - 1}
        >
          <Redo
            className={`w-6 h-6 ${
              historyIndex >= history.length - 1 ? "text-gray-300" : ""
            }`}
          />
        </button>
        <button
          onClick={resetCanvas}
          className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>
      <div
        ref={viewportRef}
        className="relative w-full aspect-square overflow-hidden border-2 border-gray-400 rounded-lg bg-slate-300 overscroll-contain"
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
