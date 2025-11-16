import React, { useEffect, useState, useCallback } from 'react'
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { dateFormat } from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContext';

const ListBookings = () => {
    const currency = import.meta.env.VITE_CURRENCY || "₹"

    const {axios, getToken, user} = useAppContext()

    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const getAllBookings = useCallback(async () => {
        try {
          const { data } = await axios.get("/api/admin/all-bookings", {
                headers: { Authorization: `Bearer ${await getToken()}` }
            });
            if (data.success && data.bookings) {
                setBookings(data.bookings);
                setError(null);
            } else {
                setError(data.message || "Failed to load bookings");
                setBookings([]);
            }
        } catch (error) {
          console.error("Error fetching bookings:", error);
          setError(error.response?.data?.message || "Failed to load bookings");
          setBookings([]);
        }
        setIsLoading(false)
    }, [axios, getToken]);

     useEffect(() => {
      if (user) {
        getAllBookings();
      }    
    }, [user, getAllBookings]);


  return !isLoading ? (
    <>
      <Title text1="List" text2="Bookings" />
      {error && (
        <div className="max-w-4xl mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500">
          {error}
        </div>
      )}
      <div className="max-w-4xl mt-6 overflow-x-auto">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No bookings found
          </div>
        ) : (
          <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
            <thead>
                <tr className="bg-primary/20 text-left text-white">
                    <th className="p-2 font-medium pl-5">User Name</th>
                    <th className="p-2 font-medium">Movie Name</th>
                    <th className="p-2 font-medium">Show Time</th>
                    <th className="p-2 font-medium">Seats</th>
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 font-medium">Status</th>
                </tr>
            </thead>
            <tbody className="text-sm font-light">
                {bookings.map((item, index) => (
                    <tr key={item._id || index} className="border-b border-primary/20 bg-primary/5 even:bg-primary/10">
                        <td className="p-2 min-w-45 pl-5">{item.user?.name || "N/A"}</td>
                        <td className="p-2">{item.show?.movie?.title || "N/A"}</td>
                        <td className="p-2">{item.show?.showDateTime ? dateFormat(item.show.showDateTime) : "N/A"}</td>
                        <td className="p-2">
                          {Array.isArray(item.bookedSeats) 
                            ? item.bookedSeats.join(", ") 
                            : "N/A"}
                        </td>
                        <td className="p-2">{currency} {item.amount?.toFixed(2) || "0.00"}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${item.isPaid ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                            {item.isPaid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  ) : <Loading />
}

export default ListBookings
