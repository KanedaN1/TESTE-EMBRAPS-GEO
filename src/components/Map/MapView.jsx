import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import './MapView.css';
import 'leaflet-polylinedecorator';

// Fix for default marker icons missing in Leaflet + Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons based on our colors
const createCustomIcon = (colorClass) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="${colorClass}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const PolylineDecorator = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    const polyline = L.polyline(positions, { color: '#0056b3', weight: 3 }).addTo(map);
    
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: 25,
          repeat: 50,
          symbol: L.Symbol.arrowHead({
            pixelSize: 15,
            polygon: false,
            pathOptions: { stroke: true, weight: 3, color: '#0056b3' }
          })
        }
      ]
    }).addTo(map);

    return () => {
      map.removeLayer(polyline);
      map.removeLayer(decorator);
    };
  }, [map, positions]);

  return null;
};

const iconGreen = createCustomIcon('marker-green');
const iconRed = createCustomIcon('marker-red');
const iconBlue = createCustomIcon('marker-blue');

// Heatmap Sub-component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    const heatPoints = points.map(p => [p.lat, p.lng, 1]); // intensity 1 for each incident
    
    // Create heat layer with better aesthetics
    const heatOptions = {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.4: '#3B82F6', // Blue
        0.6: '#F59E0B', // Yellow
        1.0: '#EF4444'  // Red
      }
    };
    const heat = L.heatLayer(heatPoints, heatOptions).addTo(map);
    
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
};

export const MapView = ({ 
  posts, 
  heatmapActive, 
  routeSupervisor, 
  filteredSupervisor,
  traffic = []
}) => {
  // Center Baixada Santista
  const center = [-23.9554, -46.3312];
  const zoom = 11;

  // Prepare points for heatmap (only those with incidents: red markers)
  const heatmapPoints = heatmapActive ? posts.filter(p => p.color === 'red') : [];

  // Prepare polyline for supervisor route if active
  const routePoints = routeSupervisor && filteredSupervisor 
    ? posts.filter(p => p.supDay.toLowerCase().includes(filteredSupervisor.toLowerCase()) || p.supNight.toLowerCase().includes(filteredSupervisor.toLowerCase()))
           .map(p => [p.lat, p.lng]) 
    : [];

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        {/* Carto Dark tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {heatmapActive && <HeatmapLayer points={heatmapPoints} />}

        {routePoints.length > 1 && (
          <PolylineDecorator positions={routePoints} />
        )}

        {traffic && traffic.map((inc, i) => (
          <CircleMarker 
            key={`traffic-${inc.id || i}`}
            center={[inc.p.y, inc.p.x]}
            radius={10}
            pathOptions={{ color: '#ff9900', fillColor: '#ff9900', fillOpacity: 0.8, weight: 2 }}
          >
            <Popup>
              <div className="popup-details">
                <h3 style={{ marginBottom: '8px', color: '#ff9900' }}>⚠️ Engarrafamento</h3>
                <p>{inc.d || "Lentidão detectada"}</p>
                {inc.l && <p><strong>Extensão:</strong> {inc.l} metros</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {posts.map(post => {
          let icon = iconGreen;
          if (post.color === 'red') icon = iconRed;
          if (post.color === 'blue') icon = iconBlue;

          return (
            <Marker key={post.id} position={[post.lat, post.lng]} icon={icon}>
              <Popup>
                <div className="popup-details">
                  <h3 style={{ marginBottom: '8px' }}>{post.name}</h3>
                  <p><strong>Bairro:</strong> {post.neighborhood}</p>
                  <p><strong>Turno:</strong> {post.shift}</p>
                  <p><strong>Sup. Diurno:</strong> {post.supDay}</p>
                  <p><strong>Sup. Noturno:</strong> {post.supNight}</p>
                  <p><strong>Status:</strong> <span style={{ color: `var(--status-${post.color})`, fontWeight: 'bold' }}>{post.status}</span></p>
                  <p><strong>Comporta:</strong> {post.comporta ? 'Sim' : 'Não'}</p>
                  <hr style={{ margin: '8px 0' }}/>
                  <p><strong>Faltas:</strong> {post.metrics.absences}</p>
                  <p><strong>Demissões:</strong> {post.metrics.dismissals}</p>
                  <p><strong>Pós-Venda Neg:</strong> {post.metrics.postSales}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
