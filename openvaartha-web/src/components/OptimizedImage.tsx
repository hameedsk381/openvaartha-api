import { useState } from "react";
import { cn, handleImageFallback } from "@/lib/utils";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export default function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = "aspect-video",
  ...props
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted/60", aspectRatio, className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/40 to-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true);
          handleImageFallback(e);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
