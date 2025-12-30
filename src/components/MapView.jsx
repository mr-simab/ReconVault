import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ location }) {
  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={6}
      className="h-64 rounded-xl border border-cyan-500 glow"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[location.lat, location.lng]}>
        <Popup>{location.label}</Popup>
      </Marker>
    </MapContainer>
  );
}
