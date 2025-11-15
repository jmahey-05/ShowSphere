import React, { useEffect, useState } from 'react'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { CheckIcon, DeleteIcon, StarIcon, PlusIcon, Loader2 } from 'lucide-react'
import { kConverter } from '../../lib/kConverter'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ManageReleases = () => {

    const {axios, getToken, user, image_base_url} = useAppContext()

    const [upcomingMovies, setUpcomingMovies] = useState([])
    const [releases, setReleases] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [addingRelease, setAddingRelease] = useState(false)
    const [removingRelease, setRemovingRelease] = useState(null)
    const [pageLoading, setPageLoading] = useState(false)

    const fetchUpcomingMovies = async (page = 1) => {
        try {
            const { data } = await axios.get('/api/admin/upcoming-movies', {
                headers: { Authorization: `Bearer ${await getToken()}` },
                params: { page }
            })
            if(data.success){
                setUpcomingMovies(data.movies)
                setTotalPages(data.totalPages)
                setCurrentPage(data.currentPage)
            }
        } catch (error) {
            console.error('Error fetching upcoming movies:', error)
            toast.error('Failed to fetch upcoming movies')
        }
    }

    const fetchReleases = async () => {
        try {
            const { data } = await axios.get('/api/admin/all-releases', {
                headers: { Authorization: `Bearer ${await getToken()}` }
            })
            if(data.success){
                setReleases(data.releases)
            }
        } catch (error) {
            console.error('Error fetching releases:', error)
            toast.error('Failed to fetch releases')
        }
    }

    const handleAddRelease = async (movieId) => {
        try {
            setAddingRelease(true)
            const { data } = await axios.post('/api/admin/add-release', 
                { movieId }, 
                { headers: { Authorization: `Bearer ${await getToken()}` }}
            )
            if(data.success){
                toast.success(data.message)
                await fetchReleases()
                await fetchUpcomingMovies(currentPage)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error('Error adding release:', error)
            toast.error(error.response?.data?.message || 'Failed to add release')
        }
        setAddingRelease(false)
    }

    const handleRemoveRelease = async (movieId) => {
        try {
            setRemovingRelease(movieId)
            const { data } = await axios.delete(`/api/admin/remove-release/${movieId}`, {
                headers: { Authorization: `Bearer ${await getToken()}` }
            })
            if(data.success){
                toast.success(data.message)
                await fetchReleases()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error('Error removing release:', error)
            toast.error(error.response?.data?.message || 'Failed to remove release')
        }
        setRemovingRelease(null)
    }

    useEffect(() => {
        if(user){
            Promise.all([fetchUpcomingMovies(), fetchReleases()]).then(() => {
                setLoading(false)
            })
        }
    }, [user])

    const handlePageChange = async (newPage) => {
        if (pageLoading || newPage < 1 || newPage > totalPages) return;
        
        setPageLoading(true);
        try {
            if (newPage >= 1 && newPage <= totalPages) {
                setCurrentPage(newPage)
                await fetchUpcomingMovies(newPage)
            }
        } finally {
            setPageLoading(false);
        }
    }

    const isReleaseAdded = (movieId) => {
        return releases.some(release => release.movieId === movieId.toString())
    }

    if (loading) {
        return <Loading />
    }

    return (
        <>
            <Title text1="Manage" text2="Releases" />
            
            {/* Current Releases Section */}
            <div className="mt-10">
                <p className="text-lg font-medium mb-4">Current Releases ({releases.length})</p>
                {releases.length > 0 ? (
                    <div className="overflow-x-auto pb-4">
                        <div className="group flex flex-wrap gap-4 mt-4 w-max">
                            {releases.map((release) => (
                                <div key={release.movieId} className="relative max-w-40 group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300">
                                    <div className="relative rounded-lg overflow-hidden">
                                        <img src={image_base_url + release.poster_path} alt="" className="w-full object-cover brightness-90" />
                                        <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                            <p className="flex items-center gap-1 text-gray-400">
                                                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                                {release.vote_average.toFixed(1)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-medium truncate mt-2">{release.title}</p>
                                    <p className="text-gray-400 text-sm">{release.release_date}</p>
                                    <button
                                        onClick={() => handleRemoveRelease(release.movieId)}
                                        disabled={removingRelease === release.movieId}
                                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100"
                                    >
                                        {removingRelease === release.movieId ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Removing...
                                          </>
                                        ) : (
                                          <>
                                            <DeleteIcon className="w-4 h-4" />
                                            Remove
                                          </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-400 mt-4">No releases added yet. Add releases from upcoming movies below.</p>
                )}
            </div>

            {/* Add Releases Section */}
            <div className="mt-10">
                <p className="text-lg font-medium mb-4">Upcoming Movies (Add as Releases)</p>
                <div className="overflow-x-auto pb-4">
                    <div className="group flex flex-wrap gap-4 mt-4 w-max">
                        {upcomingMovies.map((movie) => {
                            const isAdded = isReleaseAdded(movie.id)
                            return (
                                <div key={movie.id} className={`relative max-w-40 group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300 ${isAdded ? 'opacity-60' : ''}`}>
                                    <div className="relative rounded-lg overflow-hidden">
                                        <img src={image_base_url + movie.poster_path} alt="" className="w-full object-cover brightness-90" />
                                        <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                            <p className="flex items-center gap-1 text-gray-400">
                                                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                                {movie.vote_average.toFixed(1)}
                                            </p>
                                            <p className="text-gray-300">{kConverter(movie.vote_count)} Votes</p>
                                        </div>
                                    </div>
                                    {isAdded && (
                                        <div className="absolute top-2 right-2 flex items-center justify-center bg-green-600 h-6 w-6 rounded">
                                            <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                                        </div>
                                    )}
                                    <p className="font-medium truncate mt-2">{movie.title}</p>
                                    <p className="text-gray-400 text-sm">{movie.release_date}</p>
                                    <button
                                        onClick={() => handleAddRelease(movie.id)}
                                        disabled={isAdded || addingRelease}
                                        className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition ${
                                            isAdded 
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                                : 'bg-primary hover:bg-primary-dull text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100`}
                                    >
                                        {addingRelease ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Adding...
                                          </>
                                        ) : (
                                          <>
                                            <PlusIcon className="w-4 h-4" />
                                            {isAdded ? 'Added' : 'Add Release'}
                                          </>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
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
                            ) : null}
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
                            ) : null}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default ManageReleases

