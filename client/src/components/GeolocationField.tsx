import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, MapPinOff, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  label: string;
  /** Plain-text helper rendered under the label (optional). */
  helper?: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onChange: (lat: number | null, lng: number | null) => void;
};

/**
 * Compact form field for capturing a lat/lng coordinate. Uses the browser
 * geolocation API to autofill; user can also clear it. No map UI yet — that's
 * a bigger lift; this gives matching-by-distance enough signal to work.
 */
export default function GeolocationField({
  label,
  helper,
  latitude,
  longitude,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const hasCoords = latitude != null && longitude != null;

  const pickFromBrowser = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        toast.success("Localização capturada.");
        setLoading(false);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Você precisa autorizar a localização no navegador."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Não consegui pegar sua localização agora."
              : "Tempo esgotado tentando pegar localização.";
        toast.error(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div>
      <Label>{label}</Label>
      {helper && <p className="text-xs text-muted-foreground mt-0.5">{helper}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hasCoords ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground bg-brand-light/20 border border-brand-light/40 rounded-md px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <span className="tabular-nums">
              {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 border border-border rounded-md px-2.5 py-1">
            <MapPinOff className="h-3.5 w-3.5" />
            Sem localização
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFromBrowser}
          disabled={loading}
        >
          <Target className="h-4 w-4" />
          {loading ? "Capturando..." : hasCoords ? "Atualizar" : "Usar localização atual"}
        </Button>
        {hasCoords && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null, null)}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
