import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Share2, Sparkles, Check } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteText: string;
  articleTitle: string;
  authorName: string;
  categoryName?: string;
}

export default function QuoteCardModal({
  open,
  onOpenChange,
  quoteText,
  articleTitle,
  authorName,
  categoryName = "News",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Dark Maroon / Noir)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#2a0505");
    gradient.addColorStop(0.5, "#150303");
    gradient.addColorStop(1, "#0a0101");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Accent Top Border Strip
    ctx.fillStyle = "#800000";
    ctx.fillRect(0, 0, width, 16);

    // Subtle Grid / Accent Circle Effect
    ctx.fillStyle = "rgba(128, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.arc(width - 100, 150, 300, 0, Math.PI * 2);
    ctx.fill();

    // Brand Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillText(BRAND.name.toUpperCase(), 80, 110);

    ctx.fillStyle = "#800000";
    ctx.font = "bold 20px 'Inter', sans-serif";
    ctx.fillText(`• ${categoryName.toUpperCase()}`, 340, 108);

    // Quotation Mark Symbol
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.font = "bold 240px Georgia, serif";
    ctx.fillText("“", 65, 340);

    // Quote Text Wrapping
    ctx.fillStyle = "#ffffff";
    ctx.font = "italic 44px Georgia, serif";

    const maxQuoteWidth = width - 160;
    const quoteWords = quoteText.trim().split(" ");
    let line = "";
    let y = 320;
    const lineHeight = 64;
    const maxLines = 7;
    let lineCount = 0;

    for (let n = 0; n < quoteWords.length; n++) {
      const testLine = line + quoteWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxQuoteWidth && n > 0) {
        ctx.fillText(line.trim(), 80, y);
        line = quoteWords[n] + " ";
        y += lineHeight;
        lineCount++;
        if (lineCount >= maxLines) {
          ctx.fillText(line.trim() + "...", 80, y);
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (lineCount < maxLines && line.trim()) {
      ctx.fillText(line.trim(), 80, y);
    }

    // Article Title Box Footer
    const footerY = height - 200;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, footerY);
    ctx.lineTo(width - 80, footerY);
    ctx.stroke();

    // Headline
    ctx.fillStyle = "#d1d5db";
    ctx.font = "bold 26px 'Inter', sans-serif";
    let titleText = articleTitle;
    if (ctx.measureText(titleText).width > width - 160) {
      while (ctx.measureText(titleText + "...").width > width - 160 && titleText.length > 0) {
        titleText = titleText.slice(0, -1);
      }
      titleText += "...";
    }
    ctx.fillText(titleText, 80, footerY + 50);

    // Author & Website Link
    ctx.fillStyle = "#9ca3af";
    ctx.font = "22px 'Inter', sans-serif";
    ctx.fillText(`By ${authorName}  |  openvaartha.com`, 80, footerY + 95);
  };

  useEffect(() => {
    if (open) {
      setTimeout(drawCard, 100);
    }
  }, [open, quoteText, articleTitle, authorName]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `openvaartha-quote-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Quote card downloaded!");
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        toast.success("Quote card copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      toast.error("Failed to copy image to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Share Quote Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border border-border shadow-lg bg-black">
            <canvas ref={canvasRef} className="w-full aspect-square object-contain" />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleDownload} className="flex-1 gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button type="button" variant="outline" onClick={handleCopyImage} className="flex-1 gap-2">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Image"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
