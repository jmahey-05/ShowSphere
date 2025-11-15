import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon, CheckIcon, Loader2 } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [showPrice, setShowPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const navigate = useNavigate();
  const { axios, getToken, user } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY || "₹";

  // Fetch show data
  const getShow = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow({ movie: data.movie, dateTime: data.dateTime, showPrices: data.showPrices || {} });
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load show details");
    } finally {
      setLoading(false);
    }
  }, [axios, id]);

  // Handle seat click
  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast.error("Please select time first");

    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 10) {
      return toast.error("You can only select up to 10 seats");
    }

    if (occupiedSeats.includes(seatId)) {
      return toast.error("This seat is already booked");
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  // Render seats
  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              disabled={occupiedSeats.includes(seatId)}
              className={`h-8 w-8 rounded border transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 relative ${
                selectedSeats.includes(seatId)
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/50 ring-2 ring-primary ring-offset-1 ring-offset-gray-900"
                  : occupiedSeats.includes(seatId)
                  ? "opacity-50 cursor-not-allowed border-gray-600 bg-gray-700"
                  : "border-primary/60 hover:border-primary hover:bg-primary/10 cursor-pointer bg-gray-800"
              }`}
            >
              {selectedSeats.includes(seatId) ? (
                <div className="flex items-center justify-center w-full h-full">
                  <CheckIcon className="w-4 h-4" strokeWidth={3} />
                </div>
              ) : (
                <span className="text-xs">{seatId}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Get occupied seats after time selection
  const getOccupiedSeats = useCallback(async () => {
    if (!selectedTime?.showId) {
      setOccupiedSeats([]);
      return;
    }

    try {
      const { data } = await axios.get(
        `/api/booking/seats/${selectedTime.showId}`
      );

      if (data.success) {
        setOccupiedSeats(data.occupiedSeats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }, [axios, selectedTime]);

  // Book ticket
  const bookTickets = async () => {
    if (bookingLoading) return; // Prevent multiple clicks
    
    try {
      setBookingLoading(true);
      if (!user) {
        toast.error("Please login to proceed");
        return;
      }

      if (!selectedTime || selectedSeats.length === 0) {
        toast.error("Please select a time and seats");
        return;
      }

      const { data } = await axios.post(
        "/api/booking/create",
        { showId: selectedTime.showId, selectedSeats },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (data.success) {
        if (data.url) {
          // If URL is provided (Stripe checkout or direct redirect)
          if (data.url.startsWith('http')) {
            window.location.href = data.url;
          } else {
            navigate(data.url);
          }
        } else {
          navigate('/my-bookings');
        }
      } else {
        toast.error(data.message || "Failed to create booking");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "An error occurred. Please try again.";
      toast.error(errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  // Update show price when time or showPrices changes
  useEffect(() => {
    if (selectedTime?.showId && show?.showPrices) {
      const price = show.showPrices[selectedTime.showId] || 0;
      setShowPrice(price);
    } else {
      setShowPrice(0);
    }
  }, [selectedTime, show?.showPrices]);

  // Fetch show on mount
  useEffect(() => {
    getShow();
  }, [getShow]);

  // Fetch occupied seats when time changes
  useEffect(() => {
    getOccupiedSeats();
  }, [getOccupiedSeats]);

  if (loading) {
    return <Loading />;
  }

  if (!show) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Show not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      {/* Available Timings */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6 mb-2">Available Timings</p>
        {selectedSeats.length > 0 && (
          <div className="px-6 mb-4">
            <p className="text-sm text-gray-400">Selected: <span className="text-primary font-semibold">{selectedSeats.length}</span> seat{selectedSeats.length > 1 ? 's' : ''}</p>
          </div>
        )}

        <div className="mt-5 space-y-1">
          {show?.dateTime?.[date]?.length > 0 ? (
            show.dateTime[date].map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "hover:bg-primary/20"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            ))
          ) : (
            <p className="px-6 text-sm text-gray-400">No shows available for this date</p>
          )}
        </div>
      </div>

      {/* Seat Layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {/* Seat Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded border border-primary/60 bg-primary/10"></div>
            <span className="text-gray-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary border border-primary shadow-lg shadow-primary/50"></div>
            <span className="text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded border border-gray-600 opacity-50"></div>
            <span className="text-gray-400">Occupied</span>
          </div>
        </div>

        <div className="flex flex-col items-center mt-4 text-xs text-gray-300">
          {/* First Group */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>

          {/* Remaining Groups */}
          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map((row) => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

        {/* Billing Summary */}
        {selectedTime && selectedSeats.length > 0 && showPrice > 0 && (
          <div className="mt-8 w-full max-w-md bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Billing Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Selected Seats:</span>
                <span className="font-medium">{selectedSeats.sort().join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Number of Seats:</span>
                <span className="font-medium">{selectedSeats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price per Seat:</span>
                <span className="font-medium">{currency}{showPrice.toFixed(2)}</span>
              </div>
              <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-primary text-lg">{currency}{(showPrice * selectedSeats.length).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={bookTickets}
          disabled={!selectedTime || selectedSeats.length === 0 || bookingLoading}
          className="flex items-center gap-2 mt-8 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md hover:shadow-lg"
        >
          {bookingLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Proceed to Checkout
              <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SeatLayout;
