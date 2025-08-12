import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import CarTypes from './components/Cartypes';
import BookButton from './components/BookButton';
import { LogOut, Menu, X } from 'lucide-react';
import './styles/App.css';

const makeBookingId = () =>
  `RD-${Date.now().toString(36).slice(-6).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

const MainApp = () => {
  const { user, logout, loading: authLoading } = useAuth();

  // core booking state
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);

  // ui state
  const [showSidebar, setShowSidebar] = useState(false);
  const [booking, setBooking] = useState({ status: 'idle', bookingId: null, message: null });

  // derived: can user book?
  const canBook = Boolean(pickupLocation && dropLocation && selectedCar && booking.status !== 'loading');

  // close sidebar on Escape, trap body scroll while open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showSidebar) setShowSidebar(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = showSidebar ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showSidebar]);

  // simple toast auto-dismiss after success
  useEffect(() => {
    if (booking.status === 'success' || booking.status === 'error') {
      const t = setTimeout(() => setBooking({ status: 'idle', bookingId: null, message: null }), 4200);
      return () => clearTimeout(t);
    }
  }, [booking.status]);

  const handlePickupSelect = (location) => {
    setPickupLocation(location);
    setSelectedCar(null);
  };

  const handleDropSelect = (location) => {
    setDropLocation(location);
    setSelectedCar(null);
  };

  const handleCarSelect = (car) => {
    setSelectedCar(car);
  };

  const handleBookRide = async (extra = {}) => {
    if (!canBook) return;
    setBooking({ status: 'loading', bookingId: null, message: null });

    try {
      await new Promise((res) => setTimeout(res, 1100));
      const bookingId = makeBookingId();
      setBooking({
        status: 'success',
        bookingId,
        message: `Booked ${selectedCar?.name ?? selectedCar ?? 'Ride'}`,
      });
      setSelectedCar(null);
      console.log('Ride booked:', { bookingId, pickupLocation, dropLocation, selectedCar, extra });
    } catch (err) {
      setBooking({ status: 'error', bookingId: null, message: 'Booking failed. Try again.' });
      console.error('Booking error', err);
    }
  };

  const handleMapClick = (latlng) => {
    console.log('Map clicked at:', latlng);
  };

  const handleLogout = () => {
    logout();
    setPickupLocation(null);
    setDropLocation(null);
    setSelectedCar(null);
    setBooking({ status: 'idle', bookingId: null, message: null });
  };

  // ----- IMPORTANT: compute initials with plain JS (no hooks here) -----
  const initials = (user && user.name)
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // ----- Loading / Auth gating -----
  if (authLoginOrUndefinedCheck(authLoading)) {
    return (
      <div className="app-loading center" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="small">Loading RideCab…</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="app" role="application" aria-label="Ride Cab">
      {/* Header */}
      <header className={`app-header ${showSidebar ? 'scrolled' : ''}`}>
        <div className="header-left">
          <button
            className="menu-btn"
            aria-expanded={showSidebar}
            aria-controls="sidebar"
            aria-label="Open menu"
            onClick={() => setShowSidebar(s => !s)}
          >
            <Menu size={20} />
          </button>

          <div className="app-logo" aria-hidden="true">RideCab</div>
        </div>

        <div className="header-right">
          <div className="user-info" title={user?.email || ''} aria-hidden="false">
            <div
              style={{
                width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center',
                background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(34,197,94,0.06))',
                fontWeight: 700, color: 'white', fontSize: 13
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <span style={{ marginLeft: 8 }}>Hi, {user.name.split(' ')[0]}</span>
          </div>

          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside id="sidebar" className={`sidebar ${showSidebar ? 'open' : ''}`} aria-hidden={!showSidebar} aria-label="Booking controls">
        <div className="sidebar-header">
          <h3>Book Your Ride</h3>
          <button className="close-sidebar" aria-label="Close menu" onClick={() => setShowSidebar(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-content">
          <SearchBar onPickupSelect={handlePickupSelect} onDropSelect={handleDropSelect} pickupLocation={pickupLocation} dropLocation={dropLocation} />

          <CarTypes onCarSelect={handleCarSelect} selectedCar={selectedCar} pickupLocation={pickupLocation} dropLocation={dropLocation} />

          <BookButton pickupLocation={pickupLocation} dropLocation={dropLocation} selectedCar={selectedCar} onBookRide={handleBookRide} />
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" id="main">
        <div className="mobile-search" style={{ display: 'block' }}>
          <SearchBar onPickupSelect={handlePickupSelect} onDropSelect={handleDropSelect} pickupLocation={pickupLocation} dropLocation={dropLocation} />
        </div>

        <section className="map-section" aria-label="Map">
          <Map pickupLocation={pickupLocation} dropLocation={dropLocation} onMapClick={handleMapClick} />
        </section>

        <div className="bottom-panel">
          <CarTypes onCarSelect={handleCarSelect} selectedCar={selectedCar} pickupLocation={pickupLocation} dropLocation={dropLocation} />
          <BookButton pickupLocation={pickupLocation} dropLocation={dropLocation} selectedCar={selectedCar} onBookRide={handleBookRide} />
        </div>
      </main>

      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} aria-hidden="true" />}

      {booking.status === 'success' && (
        <div className="booking-toast" role="status" aria-live="polite">
          <div className="toast-content">
            <h4>🎉 Ride Booked!</h4>
            <p>Booking ID: {booking.bookingId}</p>
          </div>
        </div>
      )}

      {booking.status === 'error' && (
        <div className="booking-toast" role="alert">
          <div className="toast-content">
            <h4>⚠️ Booking Failed</h4>
            <p className="small text-muted">{booking.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// small helper used above to avoid accidental reference to undefined variable
function authLoginOrUndefinedCheck(v) {
  return Boolean(v);
}

const App = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
