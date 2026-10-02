import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import L from "leaflet";
import { toast } from "sonner";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function MapPicker({ onConfirm, onClose }) {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try to get current position on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition({ lat: 11.5564, lng: 104.9282 }) // Default to Phnom Penh
      );
    } else {
      setPosition({ lat: 11.5564, lng: 104.9282 });
    }
  }, []);

  const handleConfirm = async () => {
    if (!position) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
      const data = await res.json();
      onConfirm({
        lat: position.lat,
        lng: position.lng,
        address: data.display_name,
        city: data.address?.city || data.address?.state || data.address?.province || "Phnom Penh"
      });
    } catch (e) {
      toast.error("Failed to fetch address from map");
      onConfirm({
        lat: position.lat,
        lng: position.lng,
        address: "",
        city: "Phnom Penh"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!position) {
    return (
      <div className="flex items-center justify-center h-64 bg-secondary/50 rounded-xl">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground text-center">Tap on the map to pin your location.</p>
      <div className="h-[300px] sm:h-[400px] w-full rounded-xl overflow-hidden relative z-0">
        <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        {onClose && <Button variant="ghost" onClick={onClose}>Cancel</Button>}
        <Button onClick={handleConfirm} disabled={loading || !position}>
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <MapPin className="size-4 mr-2" />}
          Confirm Location
        </Button>
      </div>
    </div>
  );
}
