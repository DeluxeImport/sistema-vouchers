import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Props {
  voucherId: string;
  alt?: string;
  className?: string;
}

// Carga imagenes protegidas (requieren Authorization) como blob.
export default function AuthImage({ voucherId, alt, className }: Props) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let activo = true;
    let objectUrl = "";
    api
      .get(`/vouchers/${voucherId}/image`, { responseType: "blob" })
      .then(({ data }) => {
        if (!activo) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [voucherId]);

  if (!url) {
    return <div className={`bg-slate-100 animate-pulse ${className ?? ""}`} />;
  }
  return <img src={url} alt={alt ?? voucherId} className={className} />;
}
