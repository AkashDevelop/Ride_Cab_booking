import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Clock, Star } from 'lucide-react';


const DEFAULT_TYPES = [
  {
    id: 'economy',
    name: 'RideEco',
    description: 'Affordable rides',
    price: '₹180',
    eta: '3 min',
    seats: 4,
    rating: 4.8,
    features: ['AC', 'Music'],
    icon: '🚗',
  },
  {
    id: 'premium',
    name: 'RidePremium',
    description: 'Comfortable & stylish',
    price: '₹240',
    eta: '2 min',
    seats: 4,
    rating: 4.9,
    features: ['AC', 'Music', 'WiFi'],
    icon: '🚙',
  },
  {
    id: 'suv',
    name: 'RideSUV',
    description: 'Spacious for groups',
    price: '₹320',
    eta: '5 min',
    seats: 6,
    rating: 4.7,
    features: ['AC', 'Music', 'Extra Space'],
    icon: '🚐',
  },
];

const CarTypes = ({
  onCarSelect,
  selectedCar,
  pickupLocation,
  dropLocation,
  options = null,
}) => {
  const carTypes = useMemo(() => options ?? DEFAULT_TYPES, [options]);
  const isSelectionEnabled = Boolean(pickupLocation && dropLocation);

  const [loadingId, setLoadingId] = useState(null);

  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Keep focusIndex in range if carTypes length changes
  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, carTypes.length - 1)));
  }, [carTypes.length]);

  // When selectedCar changes from parent, scroll it into view and focus
  useEffect(() => {
    if (!selectedCar) return;
    const idx = carTypes.findIndex((c) => c.id === selectedCar.id);
    if (idx >= 0) {
      setFocusIndex(idx);
      const el = itemRefs.current[idx];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        el.focus({ preventScroll: true });
      }
    }
  }, [selectedCar?.id, carTypes]);

  const moveFocus = useCallback(
    (delta) => {
      setFocusIndex((prev) => {
        const next = Math.min(Math.max(prev + delta, 0), carTypes.length - 1);
        const el = itemRefs.current[next];
        if (el) el.focus();
        return next;
      });
    },
    [carTypes.length]
  );

  const handleSelect = useCallback(
    (car) => {
      if (!isSelectionEnabled) return;
      if (loadingId) return; // already processing another card
      setLoadingId(car.id);
      const delay = 450;
      const timer = setTimeout(() => {
        try {
          onCarSelect?.(car);
        } finally {
          setLoadingId(null);
        }
      }, delay);
      return () => clearTimeout(timer);
    },
    [isSelectionEnabled, loadingId, onCarSelect]
  );

  // keyboard handlers for each card
  const handleKeyDown = (e, idx, car) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(car);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusIndex(0);
      itemRefs.current[0]?.focus();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusIndex(carTypes.length - 1);
      itemRefs.current[carTypes.length - 1]?.focus();
      return;
    }
  };

  return (
    <div className="car-types-container" role="group" aria-label="Available car types">
      <div className="car-types-header">
        <h3>Choose your ride</h3>
        {!isSelectionEnabled ? (
          <p className="selection-hint">Select pickup and drop locations first</p>
        ) : (
          <p className="selection-hint">Tap a card to choose — use arrow keys to navigate</p>
        )}
      </div>

      <div
        className="car-types-list"
        ref={listRef}
        role="listbox"
        aria-label="Car type options"
        aria-activedescendant={carTypes[focusIndex]?.id ?? undefined}
        tabIndex={-1}
      >
        {carTypes.map((car, idx) => {
          const isSelected = selectedCar?.id === car.id;
          const isDisabled = !isSelectionEnabled;
          const isLoading = loadingId === car.id;
          const classes = [
            'car-type-card',
            isSelected ? 'selected' : '',
            isDisabled ? 'disabled' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={car.id}
              id={car.id}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              ref={(el) => (itemRefs.current[idx] = el)}
              onKeyDown={(e) => handleKeyDown(e, idx, car)}
              onClick={() => !isDisabled && handleSelect(car)}
              className={classes}
              style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {/* top row: icon + basic info */}
              <div className="car-info">
                <div className="car-icon" aria-hidden="true" title={car.name}>
                  <span style={{ fontSize: 20 }}>{car.icon}</span>
                </div>

                <div className="car-details">
                  <div className="car-name-row">
                    <h4>{car.name}</h4>
                    <div className="car-rating" aria-hidden="true">
                      <Star size={12} fill="currentColor" />
                      <span style={{ marginLeft: 6, fontWeight: 700 }}>{car.rating}</span>
                    </div>
                  </div>

                  <p className="car-description">{car.description}</p>

                  <div className="car-meta">
                    <span className="car-capacity" title={`${car.seats} seats`}>
                      <Users size={12} />
                      <span style={{ marginLeft: 6 }}>{car.seats} seats</span>
                    </span>

                    <span className="car-eta" title={`ETA ${car.eta}`}>
                      <Clock size={12} />
                      <span style={{ marginLeft: 6 }}>{car.eta}</span>
                    </span>
                  </div>

                  <div className="car-features" style={{ marginTop: 8 }}>
                    {car.features.map((f, i) => (
                      <span key={i} className="feature-tag" aria-hidden="true">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* price area */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                <div className="car-price">
                  <span className="price">{car.price}</span>
                </div>
                <div className="price-label">Est. fare</div>
              </div>

              {/* overlay loading spinner when selecting */}
              {isLoading && (
                <div className="car-loading" aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <div className="loading-spinner small" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* selected summary */}
      {selectedCar && isSelectionEnabled && (
        <div className="selected-car-summary" style={{ marginTop: 12 }}>
          <div className="summary-content" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="summary-icon" style={{ fontSize: 26 }}>{selectedCar.icon}</div>
            <div className="summary-details" style={{ flex: 1 }}>
              <h4 style={{ margin: 0 }}>{selectedCar.name}</h4>
              <div className="small text-muted">Estimated arrival: {selectedCar.eta}</div>
            </div>
            <div className="summary-price" style={{ textAlign: 'right', fontWeight: 800 }}>
              {selectedCar.price}
            </div>
          </div>
        </div>
      )}

      <div className="pricing-note" style={{ marginTop: 12 }}>
        <p className="small">💡 Prices may vary based on distance, time and demand</p>
      </div>
    </div>
  );
};

export default CarTypes;
