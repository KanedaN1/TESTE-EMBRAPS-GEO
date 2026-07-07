import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat'; // Heatmap plugin

// Fix default icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for Business Rules
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const greenIcon = createCustomIcon('green');
const redIcon = createCustomIcon('red');
const blueIcon = createCustomIcon('blue');

// Heatmap Layer Component
function HeatmapLayer({ data, active }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    const points = data.map(p => [p.lat, p.lng, 1]); // intensidade
    heatLayerRef.current = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 17,
      gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, data, active]);

  return null;
}

export default function MapComponent({ postos, heatmapActive, routeActive, tomTomRouteCoords, trafficActive, weatherActive }) {
  const baixadaSantista = [-23.9608, -46.3336]; // Santos center

  // Supervisor routing logic
  const routePositions = routeActive && tomTomRouteCoords ? tomTomRouteCoords : [];

  return (
    <div className="map-container glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <MapContainer center={baixadaSantista} zoom={12} style={{ height: '100%', width: '100%' }}>
        {/* Carto Light Style requested for clean/white look */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Traffic Simulation Layer (TomTom) */}
        {trafficActive && (
          <>
            {/* Fluxo de Trânsito */}
            <TileLayer
               url="https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=xy4ApeHYbU4NZ11HyiiWkFxFHJuvWYsN"
               opacity={0.7}
               zIndex={10}
            />
            {/* Incidentes de Trânsito */}
            <TileLayer
               url="https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=xy4ApeHYbU4NZ11HyiiWkFxFHJuvWYsN"
               opacity={1}
               zIndex={11}
            />
          </>
        )}

        <HeatmapLayer data={postos} active={heatmapActive} />

        {routeActive && (
          <Polyline positions={routePositions} color="var(--primary-blue)" weight={4} dashArray="10, 10" />
        )}

        {postos.map(posto => {
          let icon = greenIcon;
          if (posto.status === 'Alerta') icon = redIcon;
          if (posto.status === 'Clima' || (weatherActive && posto.comporta)) icon = blueIcon;

          return (
            <Marker key={posto.id} position={[posto.lat, posto.lng]} icon={icon}>
              <Popup>
                <div className="popup-content">
                  <h3>{posto.nome}</h3>
                  <p><strong>Bairro:</strong> {posto.bairro}</p>
                  <p><strong>Turno:</strong> {posto.turno}</p>
                  <p><strong>Telefone:</strong> {posto.telefone || 'Não informado'}</p>
                  <p><strong>Sup. Diurno:</strong> {posto.supervisorDiurno}</p>
                  <p><strong>Sup. Noturno:</strong> {posto.supervisorNoturno}</p>
                  <p><strong>Comporta:</strong> {posto.comporta ? 'Sim' : 'Não'}</p>
                  <span className={`status-badge ${posto.status.toLowerCase()}`}>
                    {posto.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
