import React, { useState } from "react";
import {
  processClcHungaryUrl,
  processBooklineUrl,
  processMolyHuUrl,
} from "../services/scrapingService.js";
import { addBookToDb } from "../services/firebaseService.js";

function AddBookModal({ show, onClose, user, activeTab, getCategoryFilter }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [bookUrl, setBookUrl] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [publisher, setPublisher] = useState("");
  const [bookQuantity, setBookQuantity] = useState("");
  const [bookPrice, setBookPrice] = useState("");
  const [bookPurchasePrice, setBookPurchasePrice] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Process book URL and extract data
  const processBookUrl = async () => {
    if (!bookUrl.trim()) return;

    setSearchLoading(true);
    try {
      let bookData = null;

      // Check which site and process accordingly
      if (bookUrl.includes("clchungary.com")) {
        bookData = await processClcHungaryUrl(bookUrl);
      } else if (bookUrl.includes("bookline.hu")) {
        bookData = await processBooklineUrl(bookUrl);
      } else if (bookUrl.includes("moly.hu")) {
        bookData = await processMolyHuUrl(bookUrl);
      } else {
        alert(
          "Nem támogatott URL. Kérjük, CLC Hungary, Bookline vagy Moly.hu URL-eket használjon.",
        );
        return;
      }

      if (bookData) {
        // Fill the form with extracted data
        setTitle(bookData.title || "");
        setAuthor(bookData.author || "");
        setYear(bookData.year || "");
        setGenre(bookData.genre || "");
        setDescription(bookData.description || "");
        setIsbn(bookData.isbn || "");
        setThumbnail(bookData.thumbnail || "");
        setThumbnailPreview(bookData.thumbnail || null);
        setOriginalTitle(bookData.originalTitle || "");
        setPageCount(bookData.pageCount || "");
        setPublisher(bookData.publisher || "");

        setSuccessMessage("A könyvadatok sikeresen kinyerve!");
        // Clear success message after 4 seconds
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        alert(
          "A könyvadatok kinyerése sikertelen. Kérjük, ellenőrizze az URL-t és próbálja újra.",
        );
      }
    } catch (error) {
      console.error("Error processing URL:", error);
      alert(
        "Hiba az URL feldolgozása közben. Kérjük, adja meg a könyv adatait manuálisan.",
      );
    } finally {
      setSearchLoading(false);
    }
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

          // Calculate new dimensions (max 400x600 for book covers, maintain aspect ratio)
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

          // Draw and resize image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 80% quality for smaller file size
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
      // Only accept JPG, JPEG, and PNG
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        alert("Kérem csak JPG, JPEG vagy PNG formátumot válasszon!");
        return;
      }

      // Check file size (max 5MB before processing)
      if (file.size > 5 * 1024 * 1024) {
        alert("A képfájl mérete nem haladhatja meg az 5MB-ot!");
        return;
      }

      try {
        // Process the image file
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
    const fileInput = document.getElementById("thumbnail-upload");
    if (fileInput) {
      fileInput.click();
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setYear("");
    setGenre("");
    setDescription("");
    setIsbn("");
    setThumbnail("");
    setThumbnailPreview(null);
    setBookUrl("");
    setOriginalTitle("");
    setPageCount("");
    setPublisher("");
    setBookQuantity("");
    setBookPrice("");
    setBookPurchasePrice("");
    setSuccessMessage("");
  };

  // Add book function
  const addBook = () => {
    if (title && author) {
      const bookCategory = getCategoryFilter(activeTab);

      // Prepare book data
      const bookData = {
        title,
        author,
        year,
        genre,
        description,
        isbn,
        thumbnail,
        category: bookCategory,
        originalTitle,
        pageCount,
        publisher,
        createdAt: new Date().toISOString(),
        addedBy: user?.email || "unknown",
      };

      // Add quantity and price for bookstore books
      if (bookCategory === "Bolt") {
        if (bookQuantity && bookPrice) {
          bookData.quantity = parseInt(bookQuantity);
          bookData.price = parseFloat(bookPrice);
          bookData.purchasePrice = parseFloat(bookPurchasePrice) || 0;
          bookData.status = "Raktáron";
        } else {
          alert(
            "Könyvesbolt könyvek esetében meg kell adni a mennyiséget és az árat!",
          );
          return;
        }
      }

      addBookToDb(bookData);

      // Reset form and close
      resetForm();
      onClose();
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(5px)",
          zIndex: 9999,
        }}
        onClick={() => { resetForm(); onClose(); }}
      ></div>

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 10000,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            paddingRight: "10px",
          }}
        >
          <h2
            style={{
              margin: "0 0 30px 0",
              color: "#2c3e50",
              fontSize: "28px",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            Új Könyv Hozzáadása
          </h2>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="url"
              placeholder="ILessze be a CLC Hungary, Bookline vagy Moly.hu könyv URL-jét"
              value={bookUrl}
              onChange={(e) => setBookUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: '"Source Sans Pro", sans-serif',
                backgroundColor: "#f8fafc",
                transition: "all 0.3s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#844a59";
                e.target.style.backgroundColor = "#fff";
                e.target.style.boxShadow =
                  "0 0 0 3px rgba(132, 74, 89, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e9ecef";
                e.target.style.backgroundColor = "#f8fafc";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={processBookUrl}
              disabled={searchLoading}
              style={{
                width: "100%",
                padding: "14px 20px",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: searchLoading ? "#94a3b8" : "#844a59",
                color: "white",
                cursor: searchLoading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                marginTop: "10px",
              }}
              onMouseEnter={(e) => {
                if (!searchLoading) {
                  e.target.style.backgroundColor = "#6b3a48";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(0, 0, 0, 0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!searchLoading) {
                  e.target.style.backgroundColor = "#844a59";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }
              }}
            >
              {searchLoading ? (
                <div className="modern-loader">
                  <div className="loader-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              ) : (
                "🔍 Keresés"
              )}
            </button>
          </div>
          {successMessage && (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <span>{successMessage}</span>
            </div>
          )}
          <div className="divider" data-text="VAGY"></div>
          <div className="manual-entry">
            <div className="form-field">
              <label className="field-label">Borítókép</label>
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
                        <span>
                          {thumbnailPreview
                            ? "Borítókép cseréje"
                            : "Borítókép feltöltése"}
                        </span>
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
                    id="thumbnail-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleThumbnailUpload}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>
            <div className="form-field">
              <label className="field-label">Cím</label>
              <input
                type="text"
                placeholder="Add meg a könyv címét"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Szerző</label>
              <input
                type="text"
                placeholder="Add meg a szerzőt"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Kiadás éve</label>
              <input
                type="number"
                placeholder="Add meg a kiadás évét"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Műfaj</label>
              <input
                type="text"
                placeholder="Add meg a műfajat"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Leírás</label>
              <textarea
                placeholder="Add meg a könyv leírását"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                rows={4}
              />
            </div>
            <div className="form-field">
              <label className="field-label">ISBN</label>
              <input
                type="text"
                placeholder="Add meg az ISBN-t"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Eredeti cím</label>
              <input
                type="text"
                placeholder="Add meg az eredeti címet"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Oldalszám</label>
              <input
                type="number"
                placeholder="Add meg az oldalszámot"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Kiadó</label>
              <input
                type="text"
                placeholder="Add meg a kiadót"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Bookstore specific fields - only show for Bolt category */}
            {getCategoryFilter(activeTab) === "Bolt" && (
              <>
                <div className="form-field">
                  <label className="field-label">Mennyiség</label>
                  <input
                    type="number"
                    placeholder="Add meg a mennyiséget"
                    value={bookQuantity}
                    onChange={(e) => setBookQuantity(e.target.value)}
                    className="form-input"
                    min="1"
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">Beszerzési ár (Ft)</label>
                  <input
                    type="number"
                    placeholder="Add meg a beszerzési árat (Ft)"
                    value={bookPurchasePrice}
                    onChange={(e) => setBookPurchasePrice(e.target.value)}
                    className="form-input"
                    min="0"
                    step="1"
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">Eladási ár (Ft)</label>
                  <input
                    type="number"
                    placeholder="Add meg az eladási árat (Ft)"
                    value={bookPrice}
                    onChange={(e) => setBookPrice(e.target.value)}
                    className="form-input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              justifyContent: "flex-end",
              marginTop: "20px",
            }}
          >
            <button
              onClick={addBook}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: "#844a59",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#6b3a48";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#844a59";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Könyv Hozzáadása
            </button>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#e2e8f0";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#f1f5f9";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Mégse
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AddBookModal;
