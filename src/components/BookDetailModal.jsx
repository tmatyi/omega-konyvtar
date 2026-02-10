import React, { useState } from "react";
import { updateBookInDb, deleteBookFromDb } from "../services/firebaseService.js";

function BookDetailModal({ show, book, onClose, user }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [selectedBook, setSelectedBook] = useState(book);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [originalTitle, setOriginalTitle] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [publisher, setPublisher] = useState("");
  const [bookQuantity, setBookQuantity] = useState("");
  const [bookPrice, setBookPrice] = useState("");
  const [bookPurchasePrice, setBookPurchasePrice] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  // Sync selectedBook with prop when it changes
  React.useEffect(() => {
    setSelectedBook(book);
  }, [book]);

  // Handle book edit - toggle edit mode in detail modal
  const handleBookEdit = (bookItem) => {
    setIsEditMode(true);
    setEditingBook(bookItem);
    // Pre-fill the form with current book data
    setTitle(bookItem.title || "");
    setAuthor(bookItem.author || "");
    setYear(bookItem.year || "");
    setGenre(bookItem.genre || "");
    setDescription(bookItem.description || "");
    setIsbn(bookItem.isbn || "");
    setThumbnail(bookItem.thumbnail || "");
    setThumbnailPreview(bookItem.thumbnail || null);
    setOriginalTitle(bookItem.originalTitle || "");
    setPageCount(bookItem.pageCount || "");
    setPublisher(bookItem.publisher || "");
    // Pre-fill quantity and price for bookstore books
    if (bookItem.category === "Bolt") {
      setBookQuantity(bookItem.quantity?.toString() || "");
      setBookPrice(bookItem.price?.toString() || "");
      setBookPurchasePrice(bookItem.purchasePrice?.toString() || "");
    } else {
      setBookQuantity("");
      setBookPrice("");
      setBookPurchasePrice("");
    }
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditingBook(null);
    setTitle("");
    setAuthor("");
    setYear("");
    setGenre("");
    setDescription("");
    setIsbn("");
    setThumbnail("");
    setThumbnailPreview(null);
    setOriginalTitle("");
    setPageCount("");
    setPublisher("");
    setBookQuantity("");
    setBookPrice("");
    setBookPurchasePrice("");
  };

  // Update book in database
  const updateBook = () => {
    if (!editingBook || !title || !author) return;

    // Prepare update data
    const updateData = {
      title,
      author,
      year,
      genre,
      description,
      isbn,
      thumbnail,
      originalTitle,
      pageCount,
      publisher,
      updatedAt: new Date().toISOString(),
    };

    // Add quantity and price for bookstore books
    if (editingBook.category === "Bolt") {
      if (bookQuantity && bookPrice) {
        updateData.quantity = parseInt(bookQuantity);
        updateData.price = parseFloat(bookPrice);
        updateData.purchasePrice = parseFloat(bookPurchasePrice) || 0;
        updateData.status =
          parseInt(bookQuantity) > 0 ? "Raktáron" : "Nincs raktáron";
      }
    }

    updateBookInDb(editingBook.id, updateData);

    // Update the selectedBook with new data
    setSelectedBook({
      ...selectedBook,
      ...updateData,
    });

    // Exit edit mode and reset form
    cancelEditMode();
  };

  // Close book detail modal
  const closeBookDetail = () => {
    if (isEditMode) {
      cancelEditMode();
    }
    onClose();
  };

  // Delete book functions
  const handleDeleteClick = (bookItem) => {
    setBookToDelete(bookItem);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      deleteBookFromDb(bookToDelete.id)
        .then(() => {
          console.log("Book deleted successfully");
          closeBookDetail();
          setShowDeleteConfirm(false);
          setBookToDelete(null);
        })
        .catch((error) => {
          console.error("Error deleting book:", error);
          alert("Hiba történt a könyv törlése közben. Kérjük, próbálja újra.");
        });
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setBookToDelete(null);
  };

  // Process thumbnail image file
  const processThumbnailFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          let { width, height } = img;
          const maxWidth = 400;
          const maxHeight = 600;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = maxWidth / aspectRatio;
            } else {
              height = maxHeight;
              width = maxHeight * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            },
            "image/jpeg",
            0.8,
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        alert("Kérem csak JPG, JPEG vagy PNG formátumot válasszon!");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("A képfájl mérete nem haladhatja meg az 5MB-ot!");
        return;
      }

      try {
        const processedImage = await processThumbnailFile(file);
        setThumbnailPreview(processedImage);
        setThumbnail(processedImage);
        alert("Borítókép sikeresen feltöltve!");
      } catch (error) {
        console.error("Error processing thumbnail:", error);
        alert("Hiba történt a borítókép feldolgozása során!");
      }
    }
  };

  // Trigger thumbnail upload
  const triggerThumbnailUpload = () => {
    const fileInput = document.getElementById("thumbnail-upload-edit");
    if (fileInput) {
      fileInput.click();
    }
  };

  if (!show || !selectedBook) return null;

  return (
    <>
      {/* Book Detail Modal */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.8)",
          zIndex: 999999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        onClick={closeBookDetail}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="book-detail-header">
            <h2>{selectedBook.title}</h2>
            <button className="close-btn" onClick={closeBookDetail}>
              ×
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              paddingRight: "10px",
            }}
            className="custom-scrollbar"
          >
            <div
              className="book-detail-content"
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "20px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
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
              <div
                className="book-detail-info"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {isEditMode ? (
                  // Edit mode - show input fields
                  <>
                    <div className="book-detail-field">
                      <strong>Szerző:</strong>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>Év:</strong>
                      <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>Műfaj:</strong>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>Eredeti cím:</strong>
                      <input
                        type="text"
                        value={originalTitle}
                        onChange={(e) => setOriginalTitle(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>Oldalszám:</strong>
                      <input
                        type="text"
                        value={pageCount}
                        onChange={(e) => setPageCount(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>Kiadó:</strong>
                      <input
                        type="text"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    <div className="book-detail-field">
                      <strong>ISBN:</strong>
                      <input
                        type="text"
                        value={isbn}
                        onChange={(e) => setIsbn(e.target.value)}
                        className="edit-input"
                      />
                    </div>
                    {editingBook?.category === "Bolt" && (
                      <>
                        <div className="book-detail-field">
                          <strong>Mennyiség:</strong>
                          <input
                            type="number"
                            value={bookQuantity}
                            onChange={(e) => setBookQuantity(e.target.value)}
                            className="edit-input"
                            min="0"
                          />
                        </div>
                        <div className="book-detail-field">
                          <strong>Beszerzési ár (Ft):</strong>
                          <input
                            type="number"
                            value={bookPurchasePrice}
                            onChange={(e) =>
                              setBookPurchasePrice(e.target.value)
                            }
                            className="edit-input"
                            min="0"
                            step="1"
                          />
                        </div>
                        <div className="book-detail-field">
                          <strong>Eladási ár (Ft):</strong>
                          <input
                            type="number"
                            value={bookPrice}
                            onChange={(e) => setBookPrice(e.target.value)}
                            className="edit-input"
                            min="0"
                            step="1"
                          />
                        </div>
                      </>
                    )}
                    <div className="book-detail-field">
                      <strong>Borítókép:</strong>
                      <div className="thumbnail-upload-section">
                        <div className="thumbnail-upload-container">
                          <div className="thumbnail-preview">
                            {thumbnailPreview ? (
                              <img
                                src={thumbnailPreview}
                                alt="Borítókép előnézet"
                                className="thumbnail-preview-image"
                              />
                            ) : (
                              <div className="thumbnail-upload-placeholder">
                                <svg
                                  className="thumbnail-upload-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M12 9V13M12 17H12.01M5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <span>Borítókép feltöltése</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={triggerThumbnailUpload}
                            className="thumbnail-upload-btn"
                          >
                            {thumbnailPreview
                              ? "Borítókép cseréje"
                              : "Borítókép kiválasztása"}
                          </button>
                          <input
                            id="thumbnail-upload-edit"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleThumbnailUpload}
                            style={{ display: "none" }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="book-detail-field">
                      <strong>Leírás:</strong>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="edit-textarea"
                        rows="4"
                      />
                    </div>
                  </>
                ) : (
                  // View mode - show static fields
                  <>
                    <div className="book-detail-field">
                      <strong>Szerző:</strong> {selectedBook.author || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>Év:</strong> {selectedBook.year || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>Műfaj:</strong> {selectedBook.genre || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>Eredeti cím:</strong>{" "}
                      {selectedBook.originalTitle || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>Oldalszám:</strong>{" "}
                      {selectedBook.pageCount || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>Kiadó:</strong>{" "}
                      {selectedBook.publisher || "N/A"}
                    </div>
                    <div className="book-detail-field">
                      <strong>ISBN:</strong> {selectedBook.isbn || "N/A"}
                    </div>
                    {selectedBook.category === "Bolt" &&
                      user?.role === "admin" && (
                        <>
                          <div className="book-detail-field">
                            <strong>Készlet:</strong>{" "}
                            <span
                              style={{
                                color:
                                  selectedBook.quantity > 0
                                    ? "#28a745"
                                    : "#dc3545",
                                fontWeight: "600",
                              }}
                            >
                              {selectedBook.quantity || 0} db
                            </span>
                          </div>
                          <div className="book-detail-field">
                            <strong>Beszerzési ár:</strong>{" "}
                            <span
                              style={{
                                color: "#6c757d",
                                fontWeight: "600",
                              }}
                            >
                              {selectedBook.purchasePrice
                                ? selectedBook.purchasePrice.toLocaleString(
                                    "hu-HU",
                                  )
                                : "N/A"}{" "}
                              Ft
                            </span>
                          </div>
                          <div className="book-detail-field">
                            <strong>Eladási ár:</strong>{" "}
                            <span
                              style={{
                                color: "#844a59",
                                fontWeight: "600",
                              }}
                            >
                              {selectedBook.price
                                ? selectedBook.price.toLocaleString("hu-HU")
                                : "N/A"}{" "}
                              Ft
                            </span>
                          </div>
                        </>
                      )}
                    <div className="book-detail-field">
                      <strong>Leírás:</strong>
                      <p>{selectedBook.description || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {user?.role === "admin" && (
            <div className="modal-buttons">
              {isEditMode ? (
                <>
                  <button onClick={updateBook}>Könyv Frissítése</button>
                  <button onClick={cancelEditMode}>Mégse</button>
                </>
              ) : (
                <>
                  <button onClick={() => handleBookEdit(selectedBook)}>
                    Szerkesztés
                  </button>
                  <button
                    onClick={() => handleDeleteClick(selectedBook)}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Törlés
                  </button>
                  <button onClick={closeBookDetail}>Bezárás</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && bookToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "20px",
              maxWidth: "500px",
              width: "90%",
              textAlign: "center",
            }}
          >
            <h2>Törlés Megerősítése</h2>
            <div className="confirm-message">
              <p>Biztosan törölni szeretnéd a következő könyvet?</p>
              <div className="book-to-delete">
                <strong>{bookToDelete.title}</strong>
                {bookToDelete.author && <span> - {bookToDelete.author}</span>}
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={confirmDelete} className="confirm-delete-btn">
                Igen, Törlés
              </button>
              <button onClick={cancelDelete} className="cancel-delete-btn">
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BookDetailModal;
