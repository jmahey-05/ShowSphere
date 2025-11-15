import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { SearchIcon, XIcon } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import Loading from '../components/Loading'

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchInputRef = useRef(null)
  
  const { searchMovies } = useAppContext()

  useEffect(() => {
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim() === '') {
        setMovies([])
        setHasSearched(false)
        return
      }

      setLoading(true)
      setHasSearched(true)
      
      const results = await searchMovies(query.trim())
      setMovies(results)
      setLoading(false)
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    const searchValue = e.target.search.value.trim()
    setQuery(searchValue)
    setSearchParams({ q: searchValue })
  }

  const handleClear = () => {
    setQuery('')
    setSearchParams({})
    setMovies([])
    setHasSearched(false)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  return (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
      <BlurCircle top="150px" left="0px"/>
      <BlurCircle bottom="50px" right="50px"/>

      <div className='max-w-4xl mx-auto'>
        <h1 className='text-2xl font-semibold mb-6'>Search Movies</h1>
        
        <form onSubmit={handleSearch} className='relative mb-8'>
          <div className='relative flex items-center'>
            <SearchIcon className='absolute left-4 w-5 h-5 text-gray-400'/>
            <input
              ref={searchInputRef}
              type="text"
              name="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearchParams({ q: e.target.value })
              }}
              placeholder="Search for movies..."
              className='w-full pl-12 pr-12 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder-gray-400'
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className='absolute right-4 p-1 hover:bg-gray-700 rounded-full transition'
              >
                <XIcon className='w-5 h-5 text-gray-400'/>
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <Loading />
          </div>
        ) : hasSearched ? (
          query.trim() === '' ? (
            <div className='flex flex-col items-center justify-center py-20'>
              <SearchIcon className='w-16 h-16 text-gray-600 mb-4'/>
              <p className='text-gray-400 text-lg'>Enter a movie name to search</p>
            </div>
          ) : movies.length > 0 ? (
            <>
              <p className='text-gray-400 mb-6'>
                Found {movies.length} {movies.length === 1 ? 'movie' : 'movies'} for "{query}"
              </p>
              <div className='flex flex-wrap max-sm:justify-center gap-8'>
                {movies.map((movie) => (
                  <MovieCard movie={movie} key={movie._id}/>
                ))}
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center justify-center py-20'>
              <SearchIcon className='w-16 h-16 text-gray-600 mb-4'/>
              <p className='text-gray-400 text-lg'>No movies found for "{query}"</p>
              <p className='text-gray-500 text-sm mt-2'>Try searching with a different keyword</p>
            </div>
          )
        ) : (
          <div className='flex flex-col items-center justify-center py-20'>
            <SearchIcon className='w-16 h-16 text-gray-600 mb-4'/>
            <p className='text-gray-400 text-lg'>Search for movies by title</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Search

