import React, { useState, useEffect } from 'react'
import BlurCircle from '../components/BlurCircle'
import { MapPin, Phone, Clock, Film, Star, Navigation } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import Loading from '../components/Loading'

const Theaters = () => {
  const [theaters, setTheaters] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  
  const { fetchTheaters } = useAppContext()

  const loadTheaters = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchTheaters()
      setTheaters(result.theaters || [])
      setCity(result.city || '')
      setState(result.state || '')
    } catch (error) {
      console.error('Error loading theaters:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchTheaters])

  useEffect(() => {
    loadTheaters()
  }, [loadTheaters])

  const handleDirections = (theater) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${theater.location.latitude},${theater.location.longitude}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh] flex items-center justify-center'>
        <Loading />
      </div>
    )
  }

  return (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
      <BlurCircle top="150px" left="0px"/>
      <BlurCircle bottom="50px" right="50px"/>

      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-2xl font-semibold mb-2'>Our Theaters</h1>
          <p className='text-gray-400'>
            {city && state ? `${city}, ${state}` : 'Find your nearest theater'}
          </p>
        </div>

        {theaters.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {theaters.map((theater) => (
              <div 
                key={theater.id} 
                className='bg-gray-800 rounded-2xl overflow-hidden hover:-translate-y-1 transition duration-300'
              >
                {/* Theater Image */}
                <div className='relative h-48 bg-gradient-to-br from-primary/20 to-primary/5'>
                  <img 
                    src={theater.image} 
                    alt={theater.name}
                    className='w-full h-full object-cover opacity-50'
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <Film className='w-16 h-16 text-primary/30'/>
                  </div>
                </div>

                {/* Theater Info */}
                <div className='p-6'>
                  <h2 className='text-xl font-semibold mb-3'>{theater.name}</h2>
                  
                  {/* Address */}
                  <div className='flex items-start gap-2 mb-3 text-gray-400 text-sm'>
                    <MapPin className='w-4 h-4 mt-0.5 flex-shrink-0'/>
                    <p>{theater.address}</p>
                  </div>

                  {/* Phone */}
                  <div className='flex items-center gap-2 mb-3 text-gray-400 text-sm'>
                    <Phone className='w-4 h-4 flex-shrink-0'/>
                    <a href={`tel:${theater.phone}`} className='hover:text-primary transition'>
                      {theater.phone}
                    </a>
                  </div>

                  {/* Timings */}
                  <div className='flex items-center gap-2 mb-4 text-gray-400 text-sm'>
                    <Clock className='w-4 h-4 flex-shrink-0'/>
                    <p>{theater.timings}</p>
                  </div>

                  {/* Screens */}
                  <div className='flex items-center gap-2 mb-4 text-gray-300 text-sm'>
                    <Film className='w-4 h-4 flex-shrink-0'/>
                    <p>{theater.screens} Screen{theater.screens > 1 ? 's' : ''}</p>
                  </div>

                  {/* Amenities */}
                  <div className='mb-4'>
                    <p className='text-sm text-gray-400 mb-2'>Amenities:</p>
                    <div className='flex flex-wrap gap-2'>
                      {theater.amenities.map((amenity, index) => (
                        <span 
                          key={index}
                          className='px-2 py-1 bg-primary/20 text-primary text-xs rounded-full'
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Directions Button */}
                  <button
                    onClick={() => handleDirections(theater)}
                    className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dull transition rounded-lg font-medium text-sm'
                  >
                    <Navigation className='w-4 h-4'/>
                    Get Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-20'>
            <MapPin className='w-16 h-16 text-gray-600 mb-4'/>
            <p className='text-gray-400 text-lg'>No theaters found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Theaters

