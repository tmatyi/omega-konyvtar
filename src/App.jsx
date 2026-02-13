import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth.js";
import { useDatabase } from "./hooks/useDatabase.js";
import Login from "./Login.jsx";
import Sidebar from "./Sidebar.jsx";
import Profile from "./Profile.jsx";
import UsersPanel from "./components/UsersPanel.jsx";
import LendingPanel from "./components/LendingPanel.jsx";
import KasszaPanel from "./components/KasszaPanel.jsx";
import GiftsPanel from "./components/GiftsPanel.jsx";
import AddBookModal from "./components/AddBookModal.jsx";
import BookDetailModal from "./components/BookDetailModal.jsx";
import BooksTable from "./components/BooksTable.jsx";
import "./components/KasszaPanel.css";
import "./App.css";

function App() {
  const {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleLogout,
    handleProfileUpdate,
  } = useAuth();
  const { books, gifts, users, loans } = useDatabase();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "books";
  });
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem("activeMode") || "könyvtár";
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [cardDensity, setCardDensity] = useState(7);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDetail, setShowBookDetail] = useState(false);

  // Sorting for table
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortBy, setSortBy] = useState("title");

  const handleDensityChange = (newDensity) => {
    if (newDensity === cardDensity) return;

    setIsTransitioning(true);
    setCardDensity(newDensity);

    // Reset transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Save active mode to localStorage
  useEffect(() => {
    localStorage.setItem("activeMode", activeMode);
  }, [activeMode]);

  // Helper function to get category filter based on active tab
  const getCategoryFilter = (tab) => {
    if (tab === "library") {
      return "Könyvtár";
    } else if (tab === "gifts") {
      return "Ajándék";
    } else {
      return "Bolt";
    }
  };

  // Filter books
  const filteredBooks = books.filter((book) => {
    const categoryFilter = getCategoryFilter(activeTab);
    const matchesCategory = book.category === categoryFilter;

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

    return matchesCategory && matchesText && matchesGenre && matchesAuthor;
  });

  // Get unique genres and authors for filters
  const uniqueGenres = [
    ...new Set(books.map((book) => book.genre).filter(Boolean)),
  ].sort();
  const uniqueAuthors = [
    ...new Set(books.map((book) => book.author).filter(Boolean)),
  ].sort();

  // Reset filters when switching to library tab
  useEffect(() => {
    if (activeTab === "library") {
      setFilterText("");
      setFilterGenre("");
      setFilterAuthor("");
    }
  }, [activeTab]);

  // Check which books are currently lent out
  const activeLoans = loans.filter((loan) => loan.status === "active");
  const lentOutBookIds = new Set(activeLoans.map((loan) => loan.bookId));

  // Handle sorting for table
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Handle sort dropdown change
  const handleSortByChange = (value) => {
    setSortBy(value);
    setSortField(value.replace("-desc", "").replace("-asc", ""));
    setSortOrder(value.endsWith("-desc") ? "desc" : "asc");
  };

  // Sort filtered books
  const sortedFilteredBooks = [...filteredBooks].sort((a, b) => {
    let fieldName = sortBy.replace("-desc", "").replace("-asc", "");
    let order = sortBy.endsWith("-desc") ? "desc" : "asc";
    let valA, valB;

    if (fieldName === "title") {
      valA = (a.title || "").toLowerCase();
      valB = (b.title || "").toLowerCase();
    } else if (fieldName === "price") {
      valA = a.price || 0;
      valB = b.price || 0;
    } else if (fieldName === "createdAt") {
      valA = a.createdAt || "";
      valB = b.createdAt || "";
    } else {
      valA = (a.title || "").toLowerCase();
      valB = (b.title || "").toLowerCase();
    }

    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

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
        <p>Betöltés...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  return (
    <div className="App">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        activeMode={activeMode}
        onTabChange={setActiveTab}
        onModeChange={setActiveMode}
      />
      <div className="main-content-with-sidebar">
        {activeTab === "books" && (
          <>
            <header className="App-header">
              <div className="header-section header-title">
                <div className="title-container">
                  <h1>Könyvesbolt</h1>
                  <p>Raktárkezelés</p>
                </div>
              </div>
              <div className="header-section header-controls">
                <div className="controls-left">
                  <div className="book-stats">
                    <span className="total-books">
                      {filteredBooks.length} könyv található
                    </span>
                    {filteredBooks.length !==
                      books.filter(
                        (book) =>
                          book.category === getCategoryFilter(activeTab),
                      ).length && (
                      <span className="filtered-books">(szűrve)</span>
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
                  {user?.role === "admin" && (
                    <button
                      className="add-book-btn"
                      onClick={() => setShowAddForm(true)}
                    >
                      + Új Könyv Hozzáadása
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className={`filters-wrapper ${showFilters ? "show" : ""}`}>
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
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value)}
                    className="filter-select"
                  >
                    <option value="title">Rendezés: Cím (A-Z)</option>
                    <option value="title-desc">Rendezés: Cím (Z-A)</option>
                    <option value="price">Rendezés: Ár (növekvő)</option>
                    <option value="price-desc">Rendezés: Ár (csökkenő)</option>
                    <option value="createdAt-desc">Rendezés: Legújabb</option>
                    <option value="createdAt">Rendezés: Legrégebbi</option>
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
                {filteredBooks.length !==
                  books.filter(
                    (book) => book.category === getCategoryFilter(activeTab),
                  ).length && (
                  <div className="filter-results">
                    {filteredBooks.length} /{" "}
                    {
                      books.filter(
                        (book) =>
                          book.category === getCategoryFilter(activeTab),
                      ).length
                    }{" "}
                    könyv látható
                  </div>
                )}
              </div>
            </div>

            <main className="main-content">
              <div
                className="books-container"
                style={{ "--card-density": cardDensity }}
                data-density-value={cardDensity}
              >
                {sortedFilteredBooks.length === 0 ? (
                  <div className="no-books">
                    {books.filter(
                      (book) =>
                        book.category ===
                        (activeTab === "library" ? "Könyvtár" : "Bolt"),
                    ).length === 0 ? (
                      <p>
                        Nincsenek könyvek ebben a kategóriában. Adja hozzá az
                        első könyvet!
                      </p>
                    ) : (
                      <p>
                        Nincs a szűrésnek megfelelő könyv. Próbálja meg
                        módosítani a szűrőfeltételeket!
                      </p>
                    )}
                  </div>
                ) : (
                  <BooksTable
                    books={sortedFilteredBooks}
                    user={user}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onBookClick={handleBookClick}
                    onDeleteClick={handleBookClick}
                  />
                )}
              </div>
            </main>
          </>
        )}

        {activeTab === "gifts" && <GiftsPanel user={user} gifts={gifts} />}
        {activeTab === "profile" && (
          <div className="tab-content custom-scrollbar">
            <Profile user={user} onUpdateUser={handleProfileUpdate} />
          </div>
        )}

        {activeTab === "lending" && (
          <div className="tab-content custom-scrollbar">
            <LendingPanel books={books} users={users} />
          </div>
        )}

        {activeTab === "library" && (
          <>
            <header className="App-header">
              <div className="header-section header-title">
                <div className="title-container">
                  <h1>Omega Könyvtár</h1>
                  <p>Digitális Könyvtárad</p>
                </div>
              </div>
              <div className="header-section header-controls">
                <div className="controls-left">
                  <div className="book-stats">
                    <span className="total-books">
                      {filteredBooks.length} könyv található
                    </span>
                    {filteredBooks.length !==
                      books.filter(
                        (book) =>
                          book.category === getCategoryFilter(activeTab),
                      ).length && (
                      <span className="filtered-books">(szűrve)</span>
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
                  {user?.role === "admin" && (
                    <button
                      className="add-book-btn"
                      onClick={() => setShowAddForm(true)}
                    >
                      + Új Könyv Hozzáadása
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className={`filters-wrapper ${showFilters ? "show" : ""}`}>
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
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value)}
                    className="filter-select"
                  >
                    <option value="title">Rendezés: Cím (A-Z)</option>
                    <option value="title-desc">Rendezés: Cím (Z-A)</option>
                    <option value="createdAt-desc">Rendezés: Legújabb</option>
                    <option value="createdAt">Rendezés: Legrégebbi</option>
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
                {filteredBooks.length !==
                  books.filter(
                    (book) => book.category === getCategoryFilter(activeTab),
                  ).length && (
                  <div className="filter-results">
                    {filteredBooks.length} /{" "}
                    {
                      books.filter(
                        (book) =>
                          book.category === getCategoryFilter(activeTab),
                      ).length
                    }{" "}
                    könyv látható
                  </div>
                )}
              </div>
            </div>

            <main className="main-content">
              <div className="density-buttons-wrapper">
                <div className="density-buttons">
                  <button
                    className={`density-btn ${cardDensity === 4 ? "active" : ""}`}
                    onClick={() => handleDensityChange(4)}
                    title="Compact - 4 cards per row"
                  >
                    <span className="density-icon">📚</span>
                  </button>
                  <button
                    className={`density-btn ${cardDensity === 7 ? "active" : ""}`}
                    onClick={() => handleDensityChange(7)}
                    title="Balanced - 7 cards per row"
                  >
                    <span className="density-icon">📖</span>
                  </button>
                  <button
                    className={`density-btn ${cardDensity === 10 ? "active" : ""}`}
                    onClick={() => handleDensityChange(10)}
                    title="Spacious - 10 cards per row"
                  >
                    <span className="density-icon">📄</span>
                  </button>
                </div>
              </div>
              <div
                className="books-container"
                style={{ "--card-density": cardDensity }}
                data-density-value={cardDensity}
              >
                {sortedFilteredBooks.length === 0 ? (
                  <div className="no-books">
                    {books.filter(
                      (book) =>
                        book.category ===
                        (activeTab === "library" ? "Könyvtár" : "Bolt"),
                    ).length === 0 ? (
                      <p>
                        Nincsenek könyvek ebben a kategóriában. Adja hozzá az
                        első könyvet!
                      </p>
                    ) : (
                      <p>
                        Nincs a szűrésnek megfelelő könyv. Próbálja meg
                        módosítani a szűrőfeltételeket!
                      </p>
                    )}
                  </div>
                ) : (
                  sortedFilteredBooks.map((book) => {
                    const isLentOut = lentOutBookIds.has(book.id);
                    return (
                      <div
                        key={book.id}
                        className={`book-card ${isLentOut ? "lent-out" : ""}`}
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
                            <div className="book-thumbnail-placeholder">📚</div>
                          )}
                          {isLentOut && (
                            <div className="lent-out-badge">
                              📚 Kikölcsönözve
                            </div>
                          )}
                        </div>
                        <div className="book-info">
                          <h3 className="book-title">{book.title}</h3>
                          {book.category === "Bolt" && (
                            <div className="bookstore-info">
                              {book.quantity !== undefined && (
                                <span className="book-quantity">
                                  Készlet: {book.quantity} db
                                </span>
                              )}
                              {book.price !== undefined && (
                                <span className="book-price">
                                  {book.price.toLocaleString("hu-HU")} Ft
                                </span>
                              )}
                            </div>
                          )}
                          <p className="book-author">{book.author}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </main>
          </>
        )}

        {activeTab === "users" && (
          <div className="tab-content custom-scrollbar">
            <UsersPanel user={user} />
          </div>
        )}
        {activeTab === "kassza" && (
          <div className="tab-content custom-scrollbar">
            <KasszaPanel user={user} users={users} />
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      <AddBookModal
        show={showAddForm}
        onClose={() => setShowAddForm(false)}
        user={user}
        activeTab={activeTab}
        getCategoryFilter={getCategoryFilter}
      />

      {/* Book Detail Modal */}
      {showBookDetail && selectedBook && (
        <BookDetailModal
          show={showBookDetail}
          book={selectedBook}
          onClose={closeBookDetail}
          user={user}
        />
      )}
    </div>
  );
}

export default App;
