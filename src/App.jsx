import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import React from 'react';

function MovieCard({ movie, onAddToWatchlist, isInWatchlist }) {
  const [movieDetails, setMovieDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const movieData = {
    id: movie.id || movie.imdbID,
    title: movie.title || movie.Title,
    year: movie.year || (movie.release_date ? new Date(movie.release_date).getFullYear() : movie.Year),
    poster: movie.poster || (movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : (movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/400x600')),
    genre: movie.genre || (movie.genres?.map(g => g.name).join(', ') || movie.genre_names?.join(', ') || movie.Genre),
    type: movie.type || movie.media_type || movie.Type || 'movie',
    rating: movie.rating || movie.vote_average || 0
  }

  const TMDB_API_KEY = '8a6179245484b380e72dcdb527c0f324';

  useEffect(() => {
    // Only fetch details when we don't have them already
    const fetchMovieDetails = async () => {
      if (!movieDetails && movieData.id) {
        setIsLoading(true);
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieData.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates`
          );
          const data = await response.json();
          setMovieDetails(data);
        } catch (error) {
          console.error('Error fetching movie details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    // Fetch on hover instead of on mount to save API calls
    const cardElement = document.getElementById(`movie-card-${movieData.id}`);
    if (cardElement) {
      cardElement.addEventListener('mouseenter', fetchMovieDetails);
      return () => cardElement.removeEventListener('mouseenter', fetchMovieDetails);
    }
  }, [movieData.id, movieDetails]);

  const handleWatchlistClick = () => {
    onAddToWatchlist(movieData)
  }

  const getRatingColor = (rating) => {
    if (rating >= 8) return '#4CAF50'
    if (rating >= 6) return '#FFC107'
    return '#FF5722'
  }

  // Get certification (age rating)
  const getCertification = () => {
    if (!movieDetails?.release_dates?.results) return 'N/A';
    const usRating = movieDetails.release_dates.results.find(
      country => country.iso_3166_1 === 'US'
    );
    return usRating?.release_dates[0]?.certification || 'N/A';
  }

  return (
    <div 
      className="movie-card" 
      id={`movie-card-${movieData.id}`}
    >
      <div className="movie-rating" style={{ backgroundColor: getRatingColor(movieData.rating) }}>
        {movieData.rating.toFixed(1)}
      </div>
      <img 
        src={movieData.poster}
        alt={movieData.title}
        className="movie-poster"
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/400x600'
        }}
      />
      
      {/* Hover overlay with additional details */}
      <div className="movie-hover-overlay">
        <h3>{movieData.title}</h3>
        <div className="movie-details-grid">
          <span className="detail-label">Year:</span>
          <span className="detail-value">{movieData.year}</span>
          
          <span className="detail-label">Duration:</span>
          <span className="detail-value">
            {isLoading ? '...' : 
              movieDetails?.runtime ? `${movieDetails.runtime} min` : 'N/A'}
          </span>
          
          <span className="detail-label">Rating:</span>
          <span className="detail-value">
            {isLoading ? '...' : getCertification()}
          </span>
          
          <span className="detail-label">Language:</span>
          <span className="detail-value">
            {isLoading ? '...' : 
              movieDetails?.original_language ? 
                new Intl.DisplayNames(['en'], {type: 'language'})
                  .of(movieDetails.original_language) : 'N/A'}
          </span>
          
          <span className="detail-label">Genre:</span>
          <span className="detail-value">{movieData.genre || 'N/A'}</span>
        </div>
        <button 
          onClick={handleWatchlistClick}
          className={`watchlist-btn hover-watchlist-btn ${isInWatchlist ? 'in-watchlist' : ''}`}
        >
          {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
      </div>
      
      <div className="movie-info">
        <h3>{movieData.title}</h3>
        <p>{movieData.year}</p>
        {movieData.genre && <p className="movie-genre">{movieData.genre}</p>}
        <span className="movie-type">{movieData.type}</span>
        <button 
          onClick={handleWatchlistClick}
          className={`watchlist-btn ${isInWatchlist ? 'in-watchlist' : ''}`}
        >
          {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
      </div>
    </div>
  )
}

function GenreSection({ title, movies, onAddToWatchlist, watchlist }) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    const scrollAmount = direction === 'left' ? -300 : 300;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!movies || movies.length === 0) {
    return (
      <div className="genre-section">
        <h2 className="genre-title">{title}</h2>
        <div className="genre-error">No movies found for this genre</div>
      </div>
    )
  }

  return (
    <div className="genre-section">
      <div className="genre-header">
        <h2 className="genre-title">{title}</h2>
        <div className="slider-controls">
          <button 
            className="slider-button" 
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ←
          </button>
          <button 
            className="slider-button" 
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
      </div>
      <div className="genre-movies" ref={scrollContainerRef}>
        {movies.map((movie) => (
          <MovieCard 
            key={movie.id} 
            movie={movie}
            onAddToWatchlist={onAddToWatchlist}
            isInWatchlist={watchlist.some(m => m.id === movie.id)}
          />
        ))}
      </div>
    </div>
  )
}

function App() {
  const [movies, setMovies] = useState([])
  const [recommendedMovies, setRecommendedMovies] = useState([])
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('watchlist')
    return saved ? JSON.parse(saved) : []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [genreMovies, setGenreMovies] = useState({})
  const [genreLoading, setGenreLoading] = useState(true)
  const [genreError, setGenreError] = useState(null)
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')

  const TMDB_API_KEY = '8a6179245484b380e72dcdb527c0f324'
  const TMDB_API_URL = 'https://api.themoviedb.org/3'
  
  const GENRE_IDS = {
    Action: 28,
    Comedy: 35,
    Drama: 18,
    'Sci-Fi': 878,
    Horror: 27,
    Romance: 10749
  }

  const observer = useRef()
  const lastMovieElementRef = useCallback(node => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && activeTab === 'search') {
        setCurrentPage(prevPage => prevPage + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore, activeTab])

  const handleLogoClick = () => {
    setActiveTab('home')
    setSearchTerm('')
    setMovies([])
    setError(null)
    setSelectedGenre('')
  }

  const toggleTheme = () => {
    setIsDarkTheme(prev => !prev)
  }

  const handleGenreSelect = (e) => {
    setSelectedGenre(e.target.value)
    setActiveTab('search')  // Switch to search results tab
    setCurrentPage(1)
  }

  const fetchGenres = async () => {
    try {
      const response = await fetch(
        `${TMDB_API_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
      )
      const data = await response.json()
      setGenres(data.genres || [])
    } catch (err) {
      console.error('Failed to fetch genres:', err)
    }
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    
    if (!searchTerm.trim() && !selectedGenre) return

    setLoading(true)
    setError(null)
    setActiveTab('search')
    setCurrentPage(1)
    setMovies([])

    try {
      let url;
      
      if (selectedGenre && !searchTerm.trim()) {
        url = `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${selectedGenre}`
      } 
      else {
        url = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}`
        if (selectedGenre) {
          url += `&with_genres=${selectedGenre}`
        }
      }
      
      url += '&page=1'
      
      const response = await fetch(url)
      const data = await response.json()
      
      setMovies(data.results || [])
      setHasMore(data.page < data.total_pages)
      
      if (data.results?.length === 0) {
        setError(selectedGenre && searchTerm.trim() 
          ? `No movies found matching "${searchTerm}" in the selected genre.`
          : selectedGenre 
            ? "No movies found in the selected genre."
            : `No movies found matching "${searchTerm}".`)
      }
      
    } catch (err) {
      setError('Failed to fetch movies. Please try again.')
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'search' || searchTerm.trim()) {
      handleSearch();
    }
  }, [selectedGenre]);

  const handleAddToWatchlist = (movie) => {
    setWatchlist(prev => {
      const isInWatchlist = prev.some(m => m.id === movie.id)
      if (isInWatchlist) {
        return prev.filter(m => m.id !== movie.id)
      }
      const watchlistMovie = {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        genre: movie.genre,
        type: movie.type,
        rating: movie.rating
      }
      return [...prev, watchlistMovie]
    })
  }
  
  const fetchRecommendations = async (movieId) => {
    try {
      const response = await fetch(
        `${TMDB_API_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`
      )
      const data = await response.json()
      setRecommendedMovies(data.results || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const clearWatchlist = () => {
    setWatchlist([])
    localStorage.removeItem('watchlist')
  }

  const fetchMoviesByGenre = async (genreId) => {
    try {
      const response = await fetch(
        `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1&primary_release_date.gte=2020-01-01&primary_release_date.lte=2025-12-31&vote_count.gte=50&page_size=20`
      )
      const data = await response.json()
      return data.results
    } catch (error) {
      console.error('Error fetching genre movies:', error)
      return []
    }
  }

  const fetchGenreMovies = async () => {
    setGenreLoading(true)
    setGenreError(null)

    try {
      const genreResults = {}
      for (const [genre, genreId] of Object.entries(GENRE_IDS)) {
        const movies = await fetchMoviesByGenre(genreId)
        genreResults[genre] = movies.slice(0, 20)
      }
      setGenreMovies(genreResults)
    } catch (err) {
      console.error('Failed to fetch genre movies:', err)
      setGenreError('Failed to load genre movies. Please try again later.')
    } finally {
      setGenreLoading(false)
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light')
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light')
  }, [isDarkTheme])

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    if (watchlist.length > 0) {
      const lastMovie = watchlist[watchlist.length - 1]
      if (lastMovie.id) {
        fetchRecommendations(lastMovie.id)
      }
    }
  }, [watchlist])

  useEffect(() => {
    fetchGenreMovies()
    fetchGenres()
  }, [])

  useEffect(() => {
    if (currentPage > 1 && activeTab === 'search') {
      const fetchMoreMovies = async () => {
        setLoading(true)
        try {
          let url;
          
          if (selectedGenre && !searchTerm.trim()) {
            url = `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${selectedGenre}`
          } else {
            url = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}`
            if (selectedGenre) {
              url += `&with_genres=${selectedGenre}`
            }
          }
          
          url += `&page=${currentPage}`
          
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            setMovies(prev => [...prev, ...data.results])
            setHasMore(data.page < data.total_pages)
          } else {
            setHasMore(false)
          }
        } catch (err) {
          setError('Failed to fetch more movies. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      fetchMoreMovies()
    }
  }, [currentPage, activeTab]);

  const getDisplayedContent = () => {
    if (error && !loading) {
      return <div className="error">{error}</div>
    }

    switch (activeTab) {
      case 'home':
        return (
          <div className="home-content">
            {genreLoading ? (
              <div className="loading">Loading genre movies...</div>
            ) : genreError ? (
              <div className="error">{genreError}</div>
            ) : (
              Object.entries(genreMovies).map(([genre, movies]) => (
                <GenreSection
                  key={genre}
                  title={genre}
                  movies={movies}
                  onAddToWatchlist={handleAddToWatchlist}
                  watchlist={watchlist}
                />
              ))
            )}
          </div>
        )

      case 'search':
        return (
          <div className="container">
            {movies.length > 0 ? (
              <>
                {movies.map((movie, index) => {
                  if (movies.length === index + 1) {
                    return (
                      <div ref={lastMovieElementRef} key={movie.id}>
                        <MovieCard
                          movie={movie}
                          onAddToWatchlist={handleAddToWatchlist}
                          isInWatchlist={watchlist.some(m => m.id === movie.id)}
                        />
                      </div>
                    )
                  } else {
                    return (
                      <MovieCard
                        key={movie.id}
                        movie={movie}
                        onAddToWatchlist={handleAddToWatchlist}
                        isInWatchlist={watchlist.some(m => m.id === movie.id)}
                      />
                    )
                  }
                })}
                {loading && <div className="loading">Loading more movies...</div>}
              </>
            ) : loading ? (
              <div className="loading">Searching movies...</div>
            ) : (
              <div className="no-results">
                {error || "No movies found. Try adjusting your search terms or genre selection."}
              </div>
            )}
          </div>
        )

      case 'watchlist':
        return (
          <div className="container">
            {watchlist.length > 0 ? (
              watchlist.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={true}
                />
              ))
            ) : (
              <div className="no-results">Your watchlist is empty</div>
            )}
          </div>
        )

      case 'recommended':
        return (
          <div className="container">
            {recommendedMovies.length > 0 ? (
              recommendedMovies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={watchlist.some(m => m.id === movie.id)}
                />
              ))
            ) : (
              <div className="no-results">
                Add movies to your watchlist to get recommendations
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={handleLogoClick} style={{ cursor: 'pointer' }}>MovieLand</h1>
        <div className="header-controls">
          <button 
            onClick={clearWatchlist} 
            className="clear-watchlist"
          >
            Clear Watchlist
          </button>
          <button onClick={toggleTheme} className="theme-toggle">
            {isDarkTheme ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <form onSubmit={handleSearch} className="search">
        <input
          type="text"
          placeholder="Search for movies"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="genre-select"
          value={selectedGenre}
          onChange={handleGenreSelect} 
          aria-label="Filter by genre"
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </form>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => {
            if (searchTerm.trim() || selectedGenre) {
              setActiveTab('search')
              handleSearch()
            }
          }}
        >
          Search Results
        </button>
        <button 
          className={`tab ${activeTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          Watchlist ({watchlist.length})
        </button>
        <button 
          className={`tab ${activeTab === 'recommended' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommended')}
        >
          Recommended
        </button>
      </div>

      {getDisplayedContent()}
    </div>
  )
}

export default App