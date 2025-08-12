// src/components/Map.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { Car, MapPin, Navigation } from 'lucide-react';
import '../styles/Map.css';


const FALLBACK_CARS = [
  { id: 'c1', type: 'economy', lat: 10.792, lng: 78.703, driver: 'Anu', color: '#8B5CF6' },
  { id: 'c2', type: 'premium', lat: 10.791, lng: 78.706, driver: 'Ravi', color: '#F59E0B' },
  { id: 'c3', type: 'suv', lat: 10.789, lng: 78.705, driver: 'Sita', color: '#EF4444' },
];


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


const useIconFactories = () =>
  useMemo(() => {
    const createCarIcon = (type, color) =>
      L.divIcon({
        html: `<div class="car-marker" style="background: ${color || '#8B5CF6'}"></div>`,
        className: 'custom-car-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

    const createLocationIcon = (isPickup) =>
      L.divIcon({
        html: `<div class="location-marker" style="background: ${
          isPickup ? 'linear-gradient(180deg,#10B981,#059669)' : 'linear-gradient(180deg,#ef4444,#f97316)'
        }"></div>`,
        className: 'custom-location-icon',
        iconSize: [46, 56],
        iconAnchor: [23, 56],
      });

    return { createCarIcon, createLocationIcon };
  }, []);


const MapUpdater = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom, { animate: true, duration: 0.7 });
    }
  }, [center, zoom, map]);
  return null;
};



const clusterNearby = (points, distanceMeters = 200) => {
  if (!points || points.length <= 1) return points.map((p) => [p]);

  const clusters = [];
  const used = new Set();

  const haversine = (a, b) => {
    // returns approximate meters
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const aa = sinDlat * sinDlat + sinDlon * sinDlon * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(aa));
  };

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    const base = points[i];
    const cluster = [base];
    used.add(i);
    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      const p = points[j];
      if (haversine(base, p) <= distanceMeters) {
        cluster.push(p);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
};

/* -------------------------
   Main Map component
   ------------------------- */
const Map = ({
  pickupLocation = null,
  dropLocation = null,
  onMapClick = null,
  carsApi = 'http://localhost:5000/api/cars',
  pollIntervalMs = 8000,
  enableClustering = true,
}) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.7905, 78.7047]); // default
  const [selectedDriver, setSelectedDriver] = useState(null); // for driver preview card
  const pollRef = useRef(null);

  const { createCarIcon, createLocationIcon } = useIconFactories();

  /* safe fetch with fallback to mock data */
  const fetchCars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(carsApi, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // normalize to shape we expect
      const normalized = (Array.isArray(data) ? data : []).map((c, i) => ({
        id: c.id ?? `car_${i}`,
        type: c.type ?? 'economy',
        lat: Number(c.lat) ?? 0,
        lng: Number(c.lng) ?? 0,
        driver: c.driver ?? c.name ?? 'Driver',
        color: c.color ?? (c.type === 'premium' ? '#F59E0B' : c.type === 'suv' ? '#EF4444' : '#8B5CF6'),
        meta: c.meta ?? {},
      }));
      if (normalized.length === 0) throw new Error('no-cars');
      setCars(normalized);
    } catch (err) {
      console.warn('cars API failed, using fallback', err);
      setCars(FALLBACK_CARS);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [carsApi]);

  /* initial fetch + polling */
  useEffect(() => {
    fetchCars();
    if (pollIntervalMs > 1000) {
      pollRef.current = setInterval(fetchCars, pollIntervalMs);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchCars, pollIntervalMs]);

  /* center map when pickup location changes */
  useEffect(() => {
    if (pickupLocation && pickupLocation.lat && pickupLocation.lng) {
      setMapCenter([pickupLocation.lat, pickupLocation.lng]);
    }
  }, [pickupLocation]);

  /* when user clicks a cluster, optionally zoom-in */
  const onClusterClick = useCallback((cluster) => {
    if (!cluster || cluster.length <= 1) return;
    const avgLat = cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
    const avgLng = cluster.reduce((s, p) => s + p.lng, 0) / cluster.length;
    // set center — MapUpdater will animate the view
    setMapCenter([avgLat, avgLng]);
  }, []);

  /* map click handler wrapper */
  const handleMapClick = useCallback(
    (e) => {
      if (typeof onMapClick === 'function') onMapClick(e.latlng);
      // close open driver preview
      setSelectedDriver(null);
    },
    [onMapClick]
  );

  /* cluster grouping if enabled */
  const carClusters = useMemo(() => {
    if (!enableClustering) return cars.map((c) => [c]);
    return clusterNearby(cars, 150); // 150m grouping
  }, [cars, enableClustering]);

  /* safe marker components (avoid inline function recreation where possible) */
  const renderClusters = () =>
    carClusters.map((cluster, idx) => {
      if (!cluster || cluster.length === 0) return null;

      // single marker
      if (cluster.length === 1) {
        const car = cluster[0];
        const icon = createCarIcon(car.type, car.color);
        return (
          <Marker
            key={car.id}
            position={[car.lat, car.lng]}
            icon={icon}
            eventHandlers={{
              click: () => setSelectedDriver(car),
            }}
          >
            <Popup>
              <div className="car-popup" aria-live="polite">
                <Car size={18} />
                <div style={{ marginLeft: 8 }}>
                  <strong>{car.type?.toUpperCase()}</strong>
                  <p style={{ margin: 0 }}>Driver: {car.driver}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      }

      // cluster marker: show count and a small summary
      const lat = cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
      const lng = cluster.reduce((s, p) => s + p.lng, 0) / cluster.length;
      const label = `${cluster.length} cars`;

      const clusterHtml = `
        <div class="car-marker cluster-marker">
          <div class="cluster-count">${cluster.length}</div>
        </div>
      `;
      const clusterIcon = L.divIcon({
        html: clusterHtml,
        className: 'cluster-div-icon',
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      return (
        <Marker
          key={`cluster_${idx}`}
          position={[lat, lng]}
          icon={clusterIcon}
          eventHandlers={{
            click: () => onClusterClick(cluster),
          }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong>{label}</strong>
              <p style={{ margin: 0, fontSize: 13 }}>Tap to zoom in</p>
            </div>
          </Popup>
        </Marker>
      );
    });

  /* marker for pickup/drop */
  const pickupIcon = useMemo(() => createLocationIcon(true), [createLocationIcon]);
  const dropIcon = useMemo(() => createLocationIcon(false), [createLocationIcon]);

  return (
    <div className="map-container" role="region" aria-label="Map area">
      {loading && (
        <div className="map-loading" aria-hidden="false">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Loading map data…</p>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200 }}>
          <div className="glass-card" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} />
            <div style={{ fontSize: 13 }}>Using offline car data</div>
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={14}
        className="leaflet-map"
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          // ensure mobile-friendly tile retina handling
          map.invalidateSize();
        }}
        onClick={handleMapClick}
        zoomControl={false}
      >
        <MapUpdater center={mapCenter} zoom={14} />
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* render clusters / cars */}
        {renderClusters()}

        {/* pickup marker */}
        {pickupLocation && pickupLocation.lat && pickupLocation.lng && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="location-popup pickup">
                <MapPin size={18} />
                <div>
                  <strong>Pickup</strong>
                  <p style={{ margin: 0 }}>{pickupLocation.name}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* drop marker */}
        {dropLocation && dropLocation.lat && dropLocation.lng && (
          <Marker position={[dropLocation.lat, dropLocation.lng]} icon={dropIcon}>
            <Popup>
              <div className="location-popup drop">
                <Navigation size={18} />
                <div>
                  <strong>Destination</strong>
                  <p style={{ margin: 0 }}>{dropLocation.name}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend" aria-hidden="true">
        <div className="legend-item">
          <div className="legend-icon car-economy" />
          <span>Available Cars</span>
        </div>

        {pickupLocation && (
          <div className="legend-item">
            <div className="legend-icon pickup" />
            <span>Pickup</span>
          </div>
        )}

        {dropLocation && (
          <div className="legend-item">
            <div className="legend-icon drop" />
            <span>Destination</span>
          </div>
        )}
      </div>

      {/* Driver preview drawer (small card) */}
      {selectedDriver && (
        <div className="glass-card" style={{ position: 'absolute', right: 14, bottom: 14, zIndex: 1500, width: 300 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: selectedDriver.color || '#8b5cf6', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
              {selectedDriver.driver?.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{selectedDriver.driver}</div>
              <div className="small text-muted">{selectedDriver.type?.toUpperCase()} • {selectedDriver.id}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => alert('Navigate to driver / start tracking (stub)')}>Track</button>
                <button className="btn btn-ghost" onClick={() => setSelectedDriver(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
