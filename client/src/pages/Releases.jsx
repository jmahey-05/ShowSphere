import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from '../components/BlurCircle'
import { ChevronLeft, ChevronRight, Calendar, StarIcon, Loader2 } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import Loading from '../components/Loading'

const Releases = () => {
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageLoading, setPageLoading] = useState(false)
  
  const { fetchReleases, image_base_url } = useAppContext()
  const navigate = useNavigate()

  const loadReleases = useCallback(async (page) => {
    setLoading(true)
    const result = await fetchReleases(page)
    setReleases(result.movies)
    setTotalPages(result.totalPages)
    setLoading(false)
  }, [fetchReleases])

  useEffect(() => {
    loadReleases(currentPage)
  }, [currentPage, loadReleases])

  const handlePageChange = async (newPage) => {
    if (pageLoading || newPage < 1 || newPage > totalPages) return;
    
    setPageLoading(true);
    try {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage)
        await loadReleases(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      setPageLoading(false);
    }
  }

  if (loading && releases.length === 0) {
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
        <div className='flex items-center gap-3 mb-8'>
          <Calendar className='w-6 h-6 text-primary'/>
          <h1 className='text-2xl font-semibold'>Upcoming Releases</h1>
        </div>

        {releases.length > 0 ? (
          <>
            <p className='text-gray-400 mb-6'>
              Discover the latest movies coming to theaters soon
            </p>
            
            <div className='flex flex-wrap max-sm:justify-center gap-8 mb-12'>
              {releases.map((movie) => (
                  <div key={movie.id} className='flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:-translate-y-1 transition duration-300 w-66'>
                    <img 
                      onClick={() => { 
                        if (movie.trailerUrl) {
                          navigate(`/?trailer=${encodeURIComponent(movie.trailerUrl)}`)
                          setTimeout(() => {
                            const trailersSection = document.getElementById('trailers-section')
                            if (trailersSection) {
                              trailersSection.scrollIntoView({ behavior: 'smooth' })
                            }
                          }, 100)
                        } else {
                          navigate(`/movies/${movie.id}`)
                          scrollTo(0, 0)
                        }
                      }}
                      src={image_base_url + (movie.backdrop_path || movie.poster_path)} 
                      alt={movie.title} 
                      className='rounded-lg h-52 w-full object-cover object-center cursor-pointer'
                    />
                    
                    <p className='font-semibold mt-2 truncate'>{movie.title}</p>
                    
                    <p className='text-sm text-gray-400 mt-2'>
                      {movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Coming Soon'}
                    </p>
                    
                    <div className='flex items-center justify-between mt-4 pb-3'>
                      <button 
                        onClick={() => { 
                          if (movie.trailerUrl) {
                            navigate(`/?trailer=${encodeURIComponent(movie.trailerUrl)}`)
                            setTimeout(() => {
                              const trailersSection = document.getElementById('trailers-section')
                              if (trailersSection) {
                                trailersSection.scrollIntoView({ behavior: 'smooth' })
                              }
                            }, 100)
                          } else {
                            navigate(`/movies/${movie.id}`)
                            scrollTo(0, 0)
                          }
                        }} 
                        className='px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
                      >
                        {movie.trailerUrl ? 'Watch Trailer' : 'View Details'}
                      </button>
                      
                      <p className='flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1'>
                        <StarIcon className="w-4 h-4 text-primary fill-primary"/>
                        {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-4 mt-8'>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || pageLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === 1 || pageLoading
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dull text-white cursor-pointer'
                  }`}
                >
                  {pageLoading ? (
                    <Loader2 className='w-4 h-4 animate-spin'/>
                  ) : (
                    <ChevronLeft className='w-4 h-4'/>
                  )}
                  Previous
                </button>
                
                <div className='flex items-center gap-2'>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={pageLoading}
                        className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageLoading && currentPage === pageNum ? (
                          <Loader2 className='w-4 h-4 animate-spin inline-block'/>
                        ) : (
                          pageNum
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || pageLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === totalPages || pageLoading
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dull text-white cursor-pointer'
                  }`}
                >
                  Next
                  {pageLoading ? (
                    <Loader2 className='w-4 h-4 animate-spin'/>
                  ) : (
                    <ChevronRight className='w-4 h-4'/>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className='flex flex-col items-center justify-center py-20'>
            <Calendar className='w-16 h-16 text-gray-600 mb-4'/>
            <p className='text-gray-400 text-lg'>No upcoming releases found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Releases

