import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, CheckCircle, Clock, Copy, X } from 'lucide-react';


const genBookingId = () =>
  `RD-${Date.now().toString(36).slice(-6).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

const BookButton = ({
  pickupLocation,
  dropLocation,
  selectedCar,
  onBookRide,
  simulateDelay = 1300,
}) => {
  const [flow, setFlow] = useState('idle'); // idle | confirm | loading | success | error
  const [booking, setBooking] = useState(null); 
  const [errorMsg, setErrorMsg] = useState(null);
  const autoCloseRef = useRef(null);
  const modalCloseBtnRef = useRef(null);

  const isReady = Boolean(pickupLocation && dropLocation && selectedCar);
  const priceLabel = selectedCar?.price ?? '—';
  const etaLabel = selectedCar?.eta ?? '—';

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  useEffect(() => {
    if (flow === 'confirm' && modalCloseBtnRef.current) {
      modalCloseBtnRef.current.focus();
    }
  }, [flow]);

  // auto-dismiss success toast after a while
  useEffect(() => {
    if (flow === 'success') {
      autoCloseRef.current = setTimeout(() => {
        setFlow('idle');
        setBooking(null);
      }, 4800);
      return () => clearTimeout(autoCloseRef.current);
    }
  }, [flow]);

  const openConfirm = () => {
    if (!isReady) return;
    setFlow('confirm');
  };

  const cancelConfirm = () => {
    setFlow('idle');
    setErrorMsg(null);
  };

  const doBook = async (opts = {}) => {
    if (!isReady) return;
    setFlow('loading');
    setErrorMsg(null);

    try {
      // simulate network latency
      await new Promise((res) => setTimeout(res, simulateDelay));

      // create booking
      const bookingId = genBookingId();
      const bookingPayload = {
        bookingId,
        timestamp: new Date().toISOString(),
        pickup: pickupLocation,
        drop: dropLocation,
        car: selectedCar,
        message: `Driver arriving in ${selectedCar?.eta ?? 'a few mins'}`,
        meta: { source: 'client-sim' },
      };

      setBooking(bookingPayload);
      setFlow('success');

      if (typeof onBookRide === 'function') {
        try {
          onBookRide(bookingPayload);
        } catch (err) {
     
          console.error('onBookRide threw:', err);
        }
      }
    } catch (err) {
      console.error('booking failed', err);
      setErrorMsg('Booking failed — try again.');
      setFlow('error');
    }
  };

  const copyBookingId = async () => {
    if (!booking?.bookingId) return;
    try {
      await navigator.clipboard.writeText(booking.bookingId);
    } catch {
    }
  };

  const resetAll = () => {
    setFlow('idle');
    setBooking(null);
    setErrorMsg(null);
  };

  const renderSummary = () => {
    if (!isReady) return null;

    return (
      <div className="booking-summary">
        <div className="route-summary" aria-hidden="false">
          <div className="route-point pickup">
            <div className="route-dot pickup-dot" aria-hidden="true" />
            <span className="route-label">From: {pickupLocation.name}</span>
          </div>

          <div className="route-line" aria-hidden="true" />

          <div className="route-point drop">
            <div className="route-dot drop-dot" aria-hidden="true" />
            <span className="route-label">To: {dropLocation.name}</span>
          </div>
        </div>

        <div className="ride-details" role="region" aria-label="Ride details">
          <div className="detail-item">
            <span className="detail-label">Vehicle:</span>
            <span className="detail-value">{selectedCar.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">ETA:</span>
            <span className="detail-value" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <Clock size={14} />
              {etaLabel}
            </span>
          </div>

          <div className="detail-item" style={{ textAlign: 'right' }}>
            <span className="detail-label">Fare:</span>
            <span className="detail-value price" style={{ marginLeft: 8 }}>
              {priceLabel}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderPrimaryButton = () => {
    const baseClass = 'book-button';
    const classes =
      flow === 'success'
        ? `${baseClass} success`
        : flow === 'loading'
        ? `${baseClass} loading`
        : !isReady
        ? `${baseClass} disabled`
        : baseClass;

    const ariaLabel =
      flow === 'loading'
        ? 'Booking in progress'
        : !isReady
        ? 'Complete pickup, drop and car selection'
        : 'Open confirmation to book ride';

    return (
      <button
        className={classes}
        onClick={() => {
          if (!isReady) return;
          if (flow === 'idle') openConfirm();
        }}
        disabled={!isReady || flow === 'loading' || flow === 'success'}
        aria-disabled={!isReady}
        aria-busy={flow === 'loading'}
        aria-live="polite"
      >
        {flow === 'loading' ? (
          <>
            <div className="loading-spinner small" aria-hidden="true" />
            <span>Booking your ride…</span>
          </>
        ) : flow === 'success' ? (
          <>
            <CheckCircle size={18} />
            <span>Ride Booked — View details</span>
          </>
        ) : !isReady ? (
          <>
            <Navigation size={18} />
            <span>Complete booking details</span>
          </>
        ) : (
          <>
            <Navigation size={18} />
            <span>
              Book Ride — <strong style={{ marginLeft: 6 }}>{priceLabel}</strong>
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="book-button-container" aria-live="polite">
      {/* Summary */}
      {renderSummary()}

      {/* primary action */}
      {renderPrimaryButton()}

      {/* Confirmation modal */}
      {flow === 'confirm' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm booking">
          <div className="modal glass-card" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Confirm your ride</h3>
              <button
                ref={modalCloseBtnRef}
                onClick={cancelConfirm}
                className="btn btn-ghost"
                aria-label="Close confirm dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  background:
                    'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(16,185,129,0.06))',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                }}
                aria-hidden="true"
              >
                {selectedCar?.name?.slice(0, 2) ?? 'V'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{selectedCar?.name}</div>
                <div className="small text-muted" style={{ marginTop: 6 }}>
                  {pickupLocation.name} → {dropLocation.name}
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="chip">{etaLabel} ETA</div>
                  <div className="chip">{selectedCar?.seats ?? '4'} seats</div>
                  <div className="chip">{priceLabel}</div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ marginTop: 12 }} className="error-message" role="alert">
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={cancelConfirm} aria-label="Cancel booking">
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={() => doBook()}
                aria-label="Confirm and book ride"
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state UI (inline) */}
      {flow === 'loading' && (
        <div style={{ marginTop: 12 }} aria-live="polite">
          <div className="small text-muted">Processing payment & confirming driver…</div>
        </div>
      )}

      {/* Success card */}
      {flow === 'success' && booking && (
        <div className="booking-success" role="status" aria-live="polite" style={{ marginTop: 12 }}>
          <div className="success-message" style={{ alignItems: 'flex-start' }}>
            <CheckCircle size={28} className="success-icon" />
            <div>
              <h4 style={{ margin: 0 }}>Booking Confirmed</h4>
              <div className="small text-muted" style={{ marginTop: 6 }}>
                {booking.message}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontWeight: 800 }}>{booking.bookingId}</div>
                <button
                  className="btn btn-ghost"
                  onClick={copyBookingId}
                  aria-label="Copy booking id"
                  title="Copy booking id"
                >
                  <Copy size={14} />
                </button>

                <button
                  className="btn"
                  onClick={() => {
                    window.alert('Opening live tracking (placeholder)');
                  }}
                >
                  Track Ride
                </button>
              </div>

              <div style={{ marginTop: 10 }} className="small text-muted">
                Driver details will appear in the app. Tap Track Ride to follow live.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="chip">ETA: {booking.car?.eta ?? etaLabel}</div>
              <div className="chip">Fare: {booking.car?.price ?? priceLabel}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={resetAll}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {flow === 'error' && (
        <div style={{ marginTop: 12 }} role="alert" className="error-message">
          {errorMsg ?? 'Something went wrong.'}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => doBook()}>
              Try again
            </button>
            <button className="btn btn-ghost" onClick={resetAll} style={{ marginLeft: 8 }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="booking-terms" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          By booking you agree to our <u>terms</u>. Cancellation fees may apply after confirmation.
        </p>
      </div>
    </div>
  );
};

export default BookButton;
