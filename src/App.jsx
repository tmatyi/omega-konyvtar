import React, { useState, useEffect } from "react";
import {
  database,
  ref,
  onValue,
  push,
  remove,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase.js";
import Login from "./Login.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileNav from "./MobileNav.jsx";
import Profile from "./Profile.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "books";
  });
  const [books, setBooks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [cardDensity, setCardDensity] = useState(4);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDetail, setShowBookDetail] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Firebase authentication functions
  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // Firebase will automatically trigger onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (email, password, name, phone) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // You could update the user profile with name and phone here if needed
      // Firebase will automatically trigger onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth state changed - user logged in:", user.email);
        // Load saved profile data from localStorage
        const savedProfile = localStorage.getItem(`profile_${user.email}`);
        console.log("Looking for saved profile:", !!savedProfile);

        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile);
            console.log("Found saved profile data:", profileData);
            const enhancedUser = {
              ...user,
              displayName: profileData.displayName || user.displayName,
              photoURL: profileData.photoURL || user.photoURL,
              phone: profileData.phone,
              address: profileData.address,
              bio: profileData.bio,
            };
            setUser(enhancedUser);
            console.log(
              "User enhanced with saved profile, photoURL:",
              enhancedUser.photoURL,
            );
          } catch (error) {
            console.error("Error loading saved profile:", error);
            setUser(user);
          }
        } else {
          setUser(user);
          console.log("No saved profile found, using Firebase data");
        }
      } else {
        setUser(null);
        console.log("User is logged out");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load books from Firebase
  useEffect(() => {
    const booksRef = ref(database, "books");
    const unsubscribe = onValue(booksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const booksArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setBooks(booksArray);
      } else {
        setBooks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const handleProfileUpdate = (profileData) => {
    // Update the current user with new profile data
    if (user) {
      const updatedUser = {
        ...user,
        ...profileData,
      };
      setUser(updatedUser);
      console.log("User profile updated in App component");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Filter books
  const filteredBooks = books.filter((book) => {
    const matchesText =
      filterText === "" ||
      book.title.toLowerCase().includes(filterText.toLowerCase()) ||
      book.author.toLowerCase().includes(filterText.toLowerCase()) ||
      book.description.toLowerCase().includes(filterText.toLowerCase());

    const matchesGenre =
      filterGenre === "" ||
      book.genre.toLowerCase().includes(filterGenre.toLowerCase());

    const matchesAuthor =
      filterAuthor === "" ||
      book.author.toLowerCase().includes(filterAuthor.toLowerCase());

    return matchesText && matchesGenre && matchesAuthor;
  });

  // Get unique genres and authors for filters
  const uniqueGenres = [
    ...new Set(books.map((book) => book.genre).filter(Boolean)),
  ].sort();
  const uniqueAuthors = [
    ...new Set(books.map((book) => book.author).filter(Boolean)),
  ].sort();

  // Add book function
  const addBook = () => {
    if (title && author) {
      const booksRef = ref(database, "books");
      push(booksRef, {
        title,
        author,
        year,
        genre,
        description,
        isbn,
        thumbnail,
        addedDate: new Date().toISOString(),
        addedBy: user?.email || "unknown",
      });

      // Reset form
      setTitle("");
      setAuthor("");
      setYear("");
      setGenre("");
      setDescription("");
      setIsbn("");
      setThumbnail("");
      setShowAddForm(false);
    }
  };

  // Search books by title
  const searchBooks = async () => {
    if (!title.trim()) return;

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=10`,
      );
      const data = await response.json();

      if (data.items) {
        const results = data.items.map((item) => ({
          title: item.volumeInfo.title || "",
          author: item.volumeInfo.authors?.join(", ") || "",
          year: item.volumeInfo.publishedDate?.split("-")[0] || "",
          genre: item.volumeInfo.categories?.[0] || "",
          description: item.volumeInfo.description || "",
          isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || "",
          thumbnail: item.volumeInfo.imageLinks?.thumbnail || "",
          source: "Google Books",
        }));
        setSearchResults(results);
        setShowResultsModal(true);
      }
    } catch (error) {
      console.error("Error searching books:", error);
      alert("Search failed. Please enter details manually.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Select book from search results
  const selectBookFromResults = (book) => {
    setTitle(book.title);
    setAuthor(book.author);
    setYear(book.year);
    setGenre(book.genre);
    setDescription(book.description);
    setIsbn(book.isbn);
    setThumbnail(book.thumbnail);
    setShowResultsModal(false);
    setSearchResults([]);
  };

  // Handle book click for details
  const handleBookClick = (book) => {
    setSelectedBook(book);
    setShowBookDetail(true);
  };

  // Close book detail modal
  const closeBookDetail = () => {
    setSelectedBook(null);
    setShowBookDetail(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="App">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <MobileNav
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="main-content-with-sidebar">
        {activeTab === "books" && (
          <>
            <header className="App-header">
              <div className="header-section header-title">
                <div className="logo-container">
                  <img
                    src="/logo.svg"
                    alt="Omega Könyvtár"
                    className="app-logo"
                  />
                </div>
                <h1>Omega Könyvtár</h1>
                <p>Digitális Könyvtárad</p>
              </div>
              <div className="header-section header-controls">
                <div className="controls-left">
                  <div className="book-stats">
                    <span className="total-books">
                      {books.length} összes könyv
                    </span>
                    {filteredBooks.length !== books.length && (
                      <span className="filtered-books">
                        ({filteredBooks.length} látható)
                      </span>
                    )}
                  </div>
                </div>
                <div className="controls-right">
                  <button
                    className="filter-toggle-btn"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    🔍 {showFilters ? "Szűrők Elrejtése" : "Szűrők Mutatása"}
                  </button>
                  <button
                    className="add-book-btn"
                    onClick={() => setShowAddForm(true)}
                  >
                    + Új Könyv Hozzáadása
                  </button>
                </div>
              </div>
            </header>

            {showFilters && (
              <div className="filters-section">
                <div className="filter-row">
                  <input
                    type="text"
                    placeholder="Keresés könyvek között..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="filter-input"
                  />
                </div>
                <div className="filter-row">
                  <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Minden Műfaj</option>
                    {uniqueGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterAuthor}
                    onChange={(e) => setFilterAuthor(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Minden Szerző</option>
                    {uniqueAuthors.map((author) => (
                      <option key={author} value={author}>
                        {author}
                      </option>
                    ))}
                  </select>
                  {(filterText || filterGenre || filterAuthor) && (
                    <button
                      className="clear-filters-btn"
                      onClick={() => {
                        setFilterText("");
                        setFilterGenre("");
                        setFilterAuthor("");
                      }}
                    >
                      Szűrők Törlése
                    </button>
                  )}
                </div>
                {filteredBooks.length !== books.length && (
                  <div className="filter-results">
                    {filteredBooks.length} / {books.length} könyv látható
                  </div>
                )}
              </div>
            )}

            <main className="main-content">
              <div
                className="books-container"
                style={{ "--card-density": cardDensity }}
                data-density-value={cardDensity}
              >
                <div className="density-slider-wrapper">
                  <div className="density-slider-label">
                    Cards per row:{" "}
                    <span className="density-slider-value">{cardDensity}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={cardDensity}
                    onChange={(e) => setCardDensity(Number(e.target.value))}
                    className="density-slider"
                  />
                  <div className="density-slider-labels">
                    <span>Compact</span>
                    <span>Spacious</span>
                  </div>
                </div>

                {filteredBooks.length === 0 ? (
                  <div className="no-books">
                    {books.length === 0 ? (
                      <p>No books in database. Add your first book!</p>
                    ) : (
                      <p>
                        No books match your filters. Try adjusting your search
                        criteria.
                      </p>
                    )}
                  </div>
                ) : (
                  filteredBooks.map((book) => (
                    <div
                      key={book.id}
                      className="book-card"
                      onClick={() => handleBookClick(book)}
                    >
                      <div className="book-thumbnail-container">
                        {book.thumbnail ? (
                          <img
                            src={book.thumbnail}
                            alt={book.title}
                            className="book-thumbnail"
                          />
                        ) : (
                          <svg
                            className="book-thumbnail-placeholder"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2L2 7L12 12L22 7L12 2Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M2 17L12 22L22 17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M2 12L12 17L22 12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="book-info">
                        <h3 className="book-title">{book.title}</h3>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </main>
          </>
        )}

        {activeTab === "profile" && (
          <div className="tab-content">
            <Profile user={user} onUpdateUser={handleProfileUpdate} />
          </div>
        )}

        {activeTab === "passcard" && (
          <div className="tab-content">
            <h2>Olvasókártya</h2>
            <p>Olvasókártya tartalom hamarosan...</p>
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add New Book</h2>
            <div className="title-section">
              <input
                type="text"
                placeholder="Search by title (or title + author)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="title-input"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !searchLoading) {
                    searchBooks();
                  }
                }}
              />
              <button
                onClick={searchBooks}
                disabled={searchLoading}
                className="search-btn"
              >
                {searchLoading ? (
                  <span className="loading-spinner">
                    <span className="spinner"></span>
                    Searching...
                  </span>
                ) : (
                  "🔍 Search"
                )}
              </button>
            </div>
            <div className="divider" data-text="OR">
              OR
            </div>
            <input
              type="text"
              placeholder="ISBN (optional)"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <input
              type="text"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <input
              type="text"
              placeholder="Genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={addBook}>Add Book</button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setTitle("");
                  setAuthor("");
                  setYear("");
                  setGenre("");
                  setDescription("");
                  setIsbn("");
                  setThumbnail("");
                  setSearchResults([]);
                  setShowResultsModal(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Modal */}
      {showResultsModal && (
        <div className="modal">
          <div className="modal-content results-modal">
            <h2>Select a Book</h2>
            <p className="results-count">Found {searchResults.length} books</p>
            <div className="results-list">
              {searchResults.map((book, index) => (
                <div
                  key={index}
                  className="result-item"
                  onClick={() => selectBookFromResults(book)}
                >
                  {book.thumbnail && (
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="result-thumbnail"
                    />
                  )}
                  {!book.thumbnail && (
                    <div className="no-thumbnail">No Cover</div>
                  )}
                  <div className="result-info">
                    <h3>{book.title}</h3>
                    <p>
                      <strong>Author:</strong> {book.author}
                    </p>
                    {book.year && (
                      <p>
                        <strong>Year:</strong> {book.year}
                      </p>
                    )}
                    {book.genre && (
                      <p>
                        <strong>Genre:</strong> {book.genre}
                      </p>
                    )}
                    {book.isbn && (
                      <p>
                        <strong>ISBN:</strong> {book.isbn}
                      </p>
                    )}
                    <p className="result-source">Source: {book.source}</p>
                    {book.description && (
                      <p className="result-description">{book.description}</p>
                    )}
                    {!book.thumbnail && (
                      <p className="no-cover-note">
                        💡 You can upload a custom cover image
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => {
                  setShowResultsModal(false);
                  setSearchResults([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {showBookDetail && selectedBook && (
        <div className="modal" onClick={closeBookDetail}>
          <div
            className="modal-content book-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="book-detail-header">
              <h2>{selectedBook.title}</h2>
              <button className="close-btn" onClick={closeBookDetail}>
                ×
              </button>
            </div>
            <div className="book-detail-content">
              <div className="book-detail-thumbnail">
                {selectedBook.thumbnail ? (
                  <img
                    src={selectedBook.thumbnail}
                    alt={selectedBook.title}
                    className="book-detail-image"
                  />
                ) : (
                  <svg
                    className="book-detail-placeholder"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="book-detail-info">
                <div className="book-detail-field">
                  <strong>Author:</strong> {selectedBook.author}
                </div>
                {selectedBook.year && (
                  <div className="book-detail-field">
                    <strong>Year:</strong> {selectedBook.year}
                  </div>
                )}
                {selectedBook.genre && (
                  <div className="book-detail-field">
                    <strong>Genre:</strong> {selectedBook.genre}
                  </div>
                )}
                {selectedBook.isbn && (
                  <div className="book-detail-field">
                    <strong>ISBN:</strong> {selectedBook.isbn}
                  </div>
                )}
                {selectedBook.description && (
                  <div className="book-detail-field">
                    <strong>Description:</strong>
                    <p>{selectedBook.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={closeBookDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
