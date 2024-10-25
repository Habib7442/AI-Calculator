"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ProcessedResult } from "@/types";
import "katex/dist/katex.min.css";
import katex from "katex";
import { Calculator, Eraser, Maximize2, Palette } from "lucide-react";

const COLORS = [
  "#000000", // Black
  "#FF0000", // Red
  "#0000FF", // Blue
  "#008000", // Green
  "#800080", // Purple
  "#FFA500", // Orange,
];

const DrawingCalculator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState<ProcessedResult[]>([]);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = 800;
      canvas.height = 600;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    updateCanvasSize();
    setContext(ctx);
  }, [currentColor]);

  useEffect(() => {
    if (context) {
      context.strokeStyle = currentColor;
    }
  }, [currentColor, context]);

  const renderLatex = (text: string | number | null): string => {
    const textStr = String(text);
    try {
      const hasLatex = /[\\\{\}^\$_]/.test(textStr);
      if (!hasLatex) {
        return textStr;
      }

      return katex.renderToString(textStr, {
        throwOnError: false,
        displayMode: false,
        output: "html",
      });
    } catch (error) {
      console.error("LaTeX rendering error:", error);
      return textStr;
    }
  };

  const formatResult = (item: ProcessedResult): string => {
    try {
      const expr =
        typeof item.expr === "string" ? item.expr : String(item.expr);
      const result =
        typeof item.result === "string" ? item.result : String(item.result);

      const renderedExpr = renderLatex(expr);
      const renderedResult = renderLatex(result);

      return `<span class="katex-container">${renderedExpr} = ${renderedResult}</span>`;
    } catch (error) {
      console.error("Formatting error:", error);
      return `${item.expr} = ${item.result}`;
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!context || !canvasRef.current) return;

    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x =
      (("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left) *
      scaleX;
    const y =
      (("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x =
      (("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left) *
      scaleX;
    const y =
      (("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setResult([]);
  };

  const calculateResult = async () => {
    if (!canvasRef.current) return;

    try {
      setIsLoading(true);

      const canvas = canvasRef.current;
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.fillStyle = "white";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);

      const base64Image = tempCanvas.toDataURL("image/jpeg", 1.0);

      const response = await fetch("/api/drawing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          dict_of_vars: {},
        }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setResult(data.data);
      } else {
        console.error("Error:", data.message);
        setResult([{ expr: "Error", result: data.message, assign: false }]);
      }
    } catch (error) {
      console.error("Error processing equation:", error);
      setResult([
        { expr: "Error", result: "Failed to process equation", assign: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`relative ${
        isFullscreen ? "fixed inset-0 bg-white z-50" : "w-full h-full"
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "calc(100vh - 80px)",
          touchAction: "none",
          border: "1px solid #ccc",
        }}
        className="bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        <div className="text-2xl font-bold">
          {isLoading
            ? "Processing..."
            : result.map((item, index) => (
                <div
                  key={index}
                  className="py-1"
                  dangerouslySetInnerHTML={{ __html: formatResult(item) }}
                />
              ))}
        </div>
        <div className="space-x-2 flex items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Palette className="h-4 w-4" style={{ color: currentColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-2">
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map((color) => (
                  <div
                    key={color}
                    className={`w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                      color === currentColor
                        ? "ring-2 ring-offset-2 ring-black"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={clearCanvas}>
            <Eraser className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={calculateResult}
            disabled={isLoading}
          >
            <Calculator className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                How to Use
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Instructions</DialogTitle>
                <DialogDescription>
                  1. Choose a color from the palette.
                  <br />
                  2. Draw your expression on the canvas.
                  <br />
                  3. Click on the calculator icon to calculate.
                  <br />
                  4. Use the eraser icon to clear the canvas.
                  <br />
                  5. Click on the maximize icon to enter fullscreen mode.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default DrawingCalculator;
