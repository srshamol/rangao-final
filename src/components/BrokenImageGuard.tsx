import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

interface BrokenImageGuardProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackUrl?: string;
  className?: string;
}

export default function BrokenImageGuard({
  src,
  alt,
  fallbackUrl = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80", // Premium default wood placeholder
  className = "",
  ...props
}: BrokenImageGuardProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (src) {
      setImgSrc(src);
      setError(false);
    } else {
      setError(true);
    }
  }, [src]);

  const handleError = () => {
    if (!error) {
      setError(true);
      setImgSrc(fallbackUrl);
    }
  };

  if (error && !fallbackUrl) {
    return (
      <div className={`flex items-center justify-center bg-secondary/30 rounded-lg text-muted-foreground border border-dashed ${className}`}>
        <ImageIcon className="h-6 w-6 stroke-1.5" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc || fallbackUrl}
      alt={alt || "Media assets fallback"}
      onError={handleError}
      className={`object-cover ${className}`}
      {...props}
    />
  );
}
