import React, { useEffect, useState, useCallback, useRef } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import { CheckCircle2, Ticket, Calendar, Clock } from 'lucide-react'

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || "₹"

  const { axios, getToken, user, image_base_url } = useAppContext()

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef(null)

  const getMyBookings = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        setBookings(data.bookings)
      }
    } catch (error) {
      console.log(error)
    }
    setIsLoading(false)
  }, [axios, getToken])

  useEffect(() => {
    if (user) {
      getMyBookings()
    }
  }, [user, getMyBookings])

  // Poll for payment status updates if there are unpaid bookings
  useEffect(() => {
    const hasUnpaidBookings = bookings.some(booking => !booking.isPaid && booking.paymentLink)
    
    if (hasUnpaidBookings && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        getMyBookings()
      }, 5000) // Check every 5 seconds
    } else if (!hasUnpaidBookings && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [bookings, getMyBookings])

  return !isLoading ? (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom="0px" left="600px" />
      </div>
      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {bookings.length === 0 ? (
        <p className='text-gray-400 text-center mt-8'>No bookings found</p>
      ) : (
        bookings.map((item) => (
          <div 
            key={item._id || item.id} 
            className={`flex flex-col md:flex-row justify-between rounded-lg mt-4 p-4 max-w-3xl transition-all ${
              item.isPaid 
                ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30' 
                : 'bg-primary/8 border border-primary/20'
            }`}
          >
            <div className='flex flex-col md:flex-row gap-4 flex-1'>
              <div className='relative'>
                <img 
                  src={image_base_url + item.show.movie.poster_path} 
                  alt={item.show.movie.title} 
                  className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded-lg'
                />
                {item.isPaid && (
                  <div className='absolute top-2 right-2 bg-green-500 rounded-full p-1.5 shadow-lg'>
                    <CheckCircle2 className='w-5 h-5 text-white' />
                  </div>
                )}
              </div>
              <div className='flex flex-col p-2 flex-1'>
                <div className='flex items-start justify-between gap-2 mb-2'>
                  <p className='text-lg font-semibold'>{item.show.movie.title}</p>
                  {item.isPaid && (
                    <span className='flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30'>
                      <CheckCircle2 className='w-3.5 h-3.5' />
                      Paid
                    </span>
                  )}
                </div>
                <div className='flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2'>
                  <span className='flex items-center gap-1'>
                    <Clock className='w-4 h-4' />
                    {timeFormat(item.show.movie.runtime)}
                  </span>
                  <span className='flex items-center gap-1'>
                    <Calendar className='w-4 h-4' />
                    {dateFormat(item.show.showDateTime)}
                  </span>
                </div>
                <div className='mt-auto space-y-1 text-sm'>
                  <p><span className='text-gray-400'>Total Tickets:</span> <span className='font-medium text-white'>{item.bookedSeats.length}</span></p>
                  <p><span className='text-gray-400'>Seat Number:</span> <span className='font-medium text-white'>{item.bookedSeats.sort().join(", ")}</span></p>
                </div>
              </div>
            </div>

            <div className='flex flex-col md:items-end md:text-right justify-between p-2 md:pl-6 border-t md:border-t-0 md:border-l border-white/10 mt-4 md:mt-0'>
              <div className='flex flex-col md:items-end gap-3 mb-4'>
                <div>
                  <p className='text-3xl font-bold text-primary'>{currency}{item.amount.toFixed(2)}</p>
                  {item.isPaid && (
                    <p className='text-xs text-green-400 mt-1 font-medium'>Payment Confirmed</p>
                  )}
                </div>
                {!item.isPaid && item.paymentLink ? (
                  <a 
                    href={item.paymentLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className='bg-primary hover:bg-primary-dull px-6 py-2.5 text-sm rounded-full font-semibold cursor-pointer transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 inline-block'
                  >
                    Pay Now
                  </a>
                ) : !item.isPaid && !item.paymentLink ? (
                  <span className='bg-gray-600 px-4 py-2 text-sm rounded-full font-medium text-gray-400 cursor-not-allowed inline-block'>
                    Payment Link Not Available
                  </span>
                ) : item.isPaid ? (
                  <div className='flex flex-col items-center md:items-end gap-2 mt-2'>
                    <div className='flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30'>
                      <Ticket className='w-4 h-4' />
                      <span className='text-sm font-semibold'>Ticket Confirmed</span>
                    </div>
                    <p className='text-xs text-green-300 font-medium animate-pulse'>Enjoy your show! 🍿</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  ) : <Loading />
}

export default MyBookings