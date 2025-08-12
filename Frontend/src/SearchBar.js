import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Navigation, X, RotateCcw } from 'lucide-react';
import '../styles/SearchBar.css';

const SearchBar = ({ onPickupSelect, onDropSelect, pickupLocation, dropLocation }) => {
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropQuery, setDropQuery] = useState('');
  const [pickupResults, setPickupResults] = useState([]);
  const [dropResults, setDropResults] = useState([]);
  const [activeField, setActiveField] = useState('');
  const [showPickupResults, setShowPickupResults] = useState(false);
  const [showDropResults, setShowDropResults] = useState(false);

  const pickupInputRef = useRef();
  const dropInputRef = useRef();
  const pickupResultsRef = useRef();
  const dropResultsRef = useRef();

  useEffect(() => {
    if (pickupLocation) setPickupQuery(pickupLocation.name);
  }, [pickupLocation]);

  useEffect(() => {
    if (dropLocation) setDropQuery(dropLocation.name);
  }, [dropLocation]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!pickupResultsRef.current?.contains(e.target) &&
          !pickupInputRef.current?.contains(e.target)) {
        setShowPickupResults(false);
      }
      if (!dropResultsRef.current?.contains(e.target) &&
          !dropInputRef.current?.contains(e.target)) {
        setShowDropResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query) => {
    try {
      const res = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  };

  const handlePickupChange = async (e) => {
    const q = e.target.value;
    setPickupQuery(q);
    setActiveField('pickup');
    if (q.length > 0) {
      const results = await searchLocations(q);
      setPickupResults(results);
      setShowPickupResults(true);
    } else {
      setPickupResults([]);
      setShowPickupResults(false);
    }
  };

  const handleDropChange = async (e) => {
    const q = e.target.value;
    setDropQuery(q);
    setActiveField('drop');
    if (q.length > 0) {
      const results = await searchLocations(q);
      setDropResults(results);
      setShowDropResults(true);
    } else {
      setDropResults([]);
      setShowDropResults(false);
    }
  };

  const selectPickup = (loc) => {
    setPickupQuery(loc.name);
    setShowPickupResults(false);
    onPickupSelect(loc);
  };

  const selectDrop = (loc) => {
    setDropQuery(loc.name);
    setShowDropResults(false);
    onDropSelect(loc);
  };

  const clearPickup = () => {
    setPickupQuery('');
    setPickupResults([]);
    setShowPickupResults(false);
    onPickupSelect(null);
  };

  const clearDrop = () => {
    setDropQuery('');
    setDropResults([]);
    setShowDropResults(false);
    onDropSelect(null);
  };

  const swapLocations = () => {
    if (pickupLocation && dropLocation) {
      const temp = pickupQuery;
      setPickupQuery(dropQuery);
      setDropQuery(temp);
      onPickupSelect(dropLocation);
      onDropSelect(pickupLocation);
    }
  };

  return (
    <div className="glass-search-container">
      <div className="glass-search-bar">
        {/* Pickup Field */}
        <div className="glass-search-field">
          <MapPin className="field-icon pickup-icon" size={18} />
          <input
            ref={pickupInputRef}
            type="text"
            placeholder="Where from?"
            value={pickupQuery}
            onChange={handlePickupChange}
            onFocus={() => setActiveField('pickup')}
          />
          {pickupQuery && (
            <button onClick={clearPickup} className="clear-btn">
              <X size={14} />
            </button>
          )}
          {showPickupResults && pickupResults.length > 0 && (
            <div ref={pickupResultsRef} className="search-dropdown">
              {pickupResults.map((loc, i) => (
                <div
                  key={i}
                  className="dropdown-item"
                  onClick={() => selectPickup(loc)}
                >
                  <MapPin size={14} />
                  <span>{loc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <button
          onClick={swapLocations}
          className={`swap-btn ${pickupLocation && dropLocation ? 'active' : ''}`}
          disabled={!pickupLocation || !dropLocation}
        >
          <RotateCcw size={16} />
        </button>

        {/* Drop Field */}
        <div className="glass-search-field">
          <Navigation className="field-icon drop-icon" size={18} />
          <input
            ref={dropInputRef}
            type="text"
            placeholder="Where to?"
            value={dropQuery}
            onChange={handleDropChange}
            onFocus={() => setActiveField('drop')}
          />
          {dropQuery && (
            <button onClick={clearDrop} className="clear-btn">
              <X size={14} />
            </button>
          )}
          {showDropResults && dropResults.length > 0 && (
            <div ref={dropResultsRef} className="search-dropdown">
              {dropResults.map((loc, i) => (
                <div
                  key={i}
                  className="dropdown-item"
                  onClick={() => selectDrop(loc)}
                >
                  <Navigation size={14} />
                  <span>{loc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="quick-suggestions">
        {['Airport', 'Railway Station', 'Mall', 'Hospital'].map((place, i) => (
          <button
            key={i}
            className="suggestion-chip"
            onClick={() => {
              if (activeField === 'pickup') {
                handlePickupChange({ target: { value: place } });
              } else {
                handleDropChange({ target: { value: place } });
              }
            }}
          >
            {place}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
