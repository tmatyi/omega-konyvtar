import React, { useState, useEffect } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  database,
  ref,
  set,
  update,
  push,
  remove,
  onValue,
  off,
} from "./firebase.js";
import Login from "./Login.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileNav from "./MobileNav.jsx";
import Profile from "./Profile.jsx";
import UsersPanel from "./components/UsersPanel.jsx";
import LendingPanel from "./components/LendingPanel.jsx";
import KasszaPanel from "./components/KasszaPanel.jsx";
import "./components/KasszaPanel.css";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "books";
  });
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem("activeMode") || "könyvtár";
  });
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [category, setCategory] = useState("Bolt");
  const [bookUrl, setBookUrl] = useState("");
  const [originalTitle, setOriginalTitle] = useState(""); // New field for original title
  const [pageCount, setPageCount] = useState(""); // New field for page count
  const [publisher, setPublisher] = useState(""); // New field for publisher
  const [filterText, setFilterText] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [cardDensity, setCardDensity] = useState(7);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDetail, setShowBookDetail] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // New state for edit mode
  const [editingBook, setEditingBook] = useState(null); // New state for editing
  const [showEditModal, setShowEditModal] = useState(false); // New state for edit modal
  const [searchLoading, setSearchLoading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null); // For thumbnail upload preview
  const [successMessage, setSuccessMessage] = useState(""); // For success messages
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // For delete confirmation
  const [bookToDelete, setBookToDelete] = useState(null); // Book to be deleted
  const [showAddGiftForm, setShowAddGiftForm] = useState(false); // For gift form
  const [giftName, setGiftName] = useState("");
  const [giftQuantity, setGiftQuantity] = useState("");
  const [giftPrice, setGiftPrice] = useState("");
  const [giftPurchasePrice, setGiftPurchasePrice] = useState("");
  const [giftImage, setGiftImage] = useState("");
  const [gifts, setGifts] = useState([]);
  const [giftToDelete, setGiftToDelete] = useState(null);
  const [showDeleteGiftConfirm, setShowDeleteGiftConfirm] = useState(false);
  const [showEditGiftForm, setShowEditGiftForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [popupImage, setPopupImage] = useState(null);

  // Bookstore inventory management
  const [bookQuantity, setBookQuantity] = useState("");
  const [bookPrice, setBookPrice] = useState("");
  const [bookPurchasePrice, setBookPurchasePrice] = useState("");

  // Sorting for table
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");

  const handleDensityChange = (newDensity) => {
    if (newDensity === cardDensity) return;

    setIsTransitioning(true);
    setCardDensity(newDensity);

    // Reset transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  // Firebase authentication functions
  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update lastLogin timestamp in database
      try {
        const userRef = ref(database, `users/${userCredential.user.uid}`);
        await update(userRef, {
          lastLogin: new Date().toISOString(),
        });
        console.log("Last login timestamp updated");
      } catch (dbError) {
        console.warn("Could not update last login timestamp:", dbError);
        // Don't fail login if database update fails
      }

      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (email, password, name, phone, address) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Create user record in Realtime Database
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name || email.split("@")[0], // Use name or first part of email
        phone: phone || "",
        address: address || "",
        role: "member", // Default role for new users
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        photoURL: null,
        bio: "",
      };

      await set(userRef, userData);
      console.log("User record created in database:", userData);

      return userCredential.user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth state changed - user logged in:", user.email);

        // Load profile data from Firebase database
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const dbProfileData = snapshot.val();
          console.log("Database profile data:", dbProfileData);

          let enhancedUser = { ...user };

          // Use database data or fallback to original Firebase auth data
          if (dbProfileData) {
            enhancedUser = {
              ...user,
              displayName:
                dbProfileData.displayName ||
                dbProfileData.name ||
                user.displayName,
              name:
                dbProfileData.name ||
                dbProfileData.displayName ||
                user.displayName,
              photoURL: dbProfileData.photoURL || user.photoURL,
              phone: dbProfileData.phone,
              address: dbProfileData.address,
              bio: dbProfileData.bio,
              role: dbProfileData.role,
            };
          }

          setUser(enhancedUser);
          console.log(
            "User enhanced with profile data, displayName:",
            enhancedUser.displayName,
          );
          console.log(
            "User enhanced with profile data, name:",
            enhancedUser.name,
          );
          // Only set loading to false after profile data is loaded
          setLoading(false);
        });
      } else {
        setUser(null);
        console.log("User is logged out");
        setLoading(false);
      }
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

  // Load gifts from Firebase
  useEffect(() => {
    const giftsRef = ref(database, "gifts");
    const unsubscribe = onValue(giftsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const giftsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setGifts(giftsArray);
      } else {
        setGifts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Delete gift function
  const deleteGift = (giftId) => {
    const giftRef = ref(database, `gifts/${giftId}`);
    remove(giftRef);
    setShowDeleteGiftConfirm(false);
    setGiftToDelete(null);
  };

  // Update gift function
  const updateGift = (giftId, updatedData) => {
    const giftRef = ref(database, `gifts/${giftId}`);
    update(giftRef, updatedData);
    setShowEditGiftForm(false);
    setEditingGift(null);
  };

  // Load users from Firebase
  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setUsers(usersArray);
      } else {
        setUsers([]);
      }
    });

    return () => off(usersRef);
  }, []);

  // Load loans from Firebase
  useEffect(() => {
    const loansRef = ref(database, "loans");
    const unsubscribe = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loansArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setLoans(loansArray);
      } else {
        setLoans([]);
      }
    });

    return () => off(loansRef);
  }, []);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Save active mode to localStorage
  useEffect(() => {
    localStorage.setItem("activeMode", activeMode);
  }, [activeMode]);

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
    // Try edit modal input first, then add book input
    let fileInput = document.getElementById("thumbnail-upload-edit");
    if (!fileInput) {
      fileInput = document.getElementById("thumbnail-upload");
    }
    if (fileInput) {
      fileInput.click();
    }
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

      const booksRef = ref(database, "books");
      push(booksRef, bookData);

      // Reset form
      setTitle("");
      setAuthor("");
      setYear("");
      setGenre("");
      setCategory("Bolt");
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
      setShowAddForm(false);
    }
  };

  // Sell book function (decrease quantity)
  const sellBook = (bookId, currentQuantity) => {
    if (currentQuantity <= 0) {
      alert("Nem lehet eladni ezt a könyvet, mert nincs raktáron!");
      return;
    }

    const bookRef = ref(database, `books/${bookId}`);
    const updatedQuantity = currentQuantity - 1;

    update(bookRef, {
      quantity: updatedQuantity,
      status: updatedQuantity > 0 ? "Raktáron" : "Nincs raktáron",
    })
      .then(() => {
        console.log("Book sold successfully");
      })
      .catch((error) => {
        console.error("Error selling book:", error);
        alert("Hiba történt a könyv eladása során!");
      });
  };

  // Handle sorting for table
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Process Bookline URLs
  const processBooklineUrl = async (url) => {
    try {
      // Try multiple proxy services
      const proxies = [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://cors-anywhere.herokuapp.com/",
      ];

      let html = "";
      for (const proxy of proxies) {
        try {
          const proxyUrl = proxy + encodeURIComponent(url);
          const response = await fetch(proxyUrl);
          if (response.ok) {
            html = await response.text();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!html) throw new Error("All proxies failed");

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      console.log("Processing Bookline URL:", url);

      // Extract title
      const titleElement = doc.querySelector(".c-product__title");
      const title = titleElement ? titleElement.textContent.trim() : "";

      // Extract author
      const authorElement = doc.querySelector(".o-product-authors");
      const author = authorElement ? authorElement.textContent.trim() : "";

      // Extract publisher
      const publisherElement = doc.querySelector(".c-product__publisher");
      const publisher = publisherElement
        ? publisherElement.textContent.trim()
        : "";

      // Extract description (look for more specific description paragraphs)
      let description = "";
      const descriptionElements = doc.querySelectorAll("p");
      for (const p of descriptionElements) {
        const text = p.textContent.trim();
        // Skip very short paragraphs and likely navigation/footer text
        if (
          text.length > 50 &&
          !text.includes("Kosár") &&
          !text.includes(" Ft") &&
          !text.includes("Raktáron")
        ) {
          description = text;
          break;
        }
      }

      // Extract ISBN
      const isbnElement = doc.querySelector('span[itemprop="sku"]');
      const isbn = isbnElement ? isbnElement.textContent.trim() : "";

      // Extract thumbnail (handle different image attribute patterns)
      let thumbnail = "";
      const thumbnailElement = doc.querySelector(
        ".o-product-figure__product-img",
      );
      if (thumbnailElement) {
        thumbnail =
          thumbnailElement.src ||
          thumbnailElement.getAttribute("data-src") ||
          thumbnailElement.getAttribute("data-lazy") ||
          thumbnailElement.getAttribute("srcset")?.split(" ")[0] ||
          "";
      }

      // Extract year (try to find it in publisher or other elements)
      let year = "";
      if (publisher) {
        const yearMatch = publisher.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = yearMatch[0];
        }
      }

      console.log("Bookline extracted data:", {
        title,
        author,
        publisher,
        description,
        isbn,
        thumbnail,
        year,
      });

      return {
        title,
        author,
        publisher,
        description,
        isbn,
        thumbnail,
        year,
        genre: "", // Bookline doesn't have a clear genre field
        originalTitle: "",
        pageCount: "",
      };
    } catch (error) {
      console.error("Error processing Bookline URL:", error);

      // Provide more helpful error message
      if (error.message.includes("All proxies failed")) {
        alert(
          "Nem lehet hozzáférni a Bookline weboldalához CORS korlátozások miatt. Kérjük, adja meg a könyv adatait manuálisan, vagy próbáljon másik URL-t.",
        );
      } else {
        alert(
          "Hiba a Bookline URL feldolgozása közben. Kérjük, ellenőrizze az URL-t és próbálja újra.",
        );
      }

      return null;
    }
  };

  // Process Moly.hu URLs
  const processMolyHuUrl = async (url) => {
    let doc = null;
    try {
      // Try multiple proxy services
      const proxies = [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://cors-anywhere.herokuapp.com/",
      ];

      let html = "";
      for (const proxy of proxies) {
        try {
          const proxyUrl = proxy + encodeURIComponent(url);
          const response = await fetch(proxyUrl);
          if (response.ok) {
            html = await response.text();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!html) throw new Error("All proxies failed");

      const parser = new DOMParser();
      doc = parser.parseFromString(html, "text/html");

      console.log("Processing Moly.hu URL:", url);

      // Check if this is a publication page (kiadasok) or book page (konyvek)
      const isPublicationPage = url.includes("/kiadasok/");

      if (isPublicationPage) {
        return processMolyPublicationPage(doc);
      } else {
        return processMolyBookPage(doc);
      }
    } catch (error) {
      console.error("Error processing Moly.hu URL:", error);

      // Provide more helpful error message
      if (error.message.includes("All proxies failed")) {
        alert(
          "Nem lehet hozzáférni a Moly.hu weboldalához CORS korlátozások miatt. Kérjük, adja meg a könyv adatait manuálisan, vagy próbáljon másik URL-t.",
        );
      } else {
        alert(
          "Hiba a Moly.hu URL feldolgozása közben. Kérjük, ellenőrizze az URL-t és próbálja újra.",
        );
      }

      return null;
    }
  };

  // Process Moly.hu publication pages (kiadasok)
  const processMolyPublicationPage = (doc) => {
    // Extract title and author from book_selector class (separated by ":")
    const bookSelectorElement = doc.querySelector(".book_selector");
    let title = "";
    let author = "";

    if (bookSelectorElement) {
      const selectorText = bookSelectorElement.textContent.trim();
      const parts = selectorText.split(":");
      if (parts.length >= 2) {
        author = parts[0].trim(); // First part is author
        title = parts[1].trim(); // Second part is title
      }
    }

    // Extract thumbnail from book_with_shop class, inside <a> tag
    let thumbnail = "";
    const bookWithShopElement = doc.querySelector(".book_with_shop a img");
    if (bookWithShopElement) {
      thumbnail =
        bookWithShopElement.src ||
        bookWithShopElement.getAttribute("data-src") ||
        bookWithShopElement.getAttribute("data-lazy") ||
        "";
    }

    // Extract metadata from flex_content ul li elements using text-based search
    let publisher = "";
    let year = "";
    let pageCount = "";
    let isbn = "";

    const flexContentElement = doc.querySelector(".flex_content ul");
    if (flexContentElement) {
      const listItems = flexContentElement.querySelectorAll("li");

      // Look for specific text labels and extract the following strong element
      listItems.forEach((li) => {
        const liText = li.textContent.trim();

        if (liText.includes("Kiadó:")) {
          const strongElement = li.querySelector("strong");
          if (strongElement) {
            publisher = strongElement.textContent.trim();
          }
        } else if (liText.includes("Kiadás éve:")) {
          const strongElement = li.querySelector("strong");
          if (strongElement) {
            year = strongElement.textContent.trim();
          }
        } else if (liText.includes("Oldalszám:")) {
          const strongElement = li.querySelector("strong");
          if (strongElement) {
            pageCount = strongElement.textContent.trim();
          }
        } else if (liText.includes("ISBN:")) {
          const strongElement = li.querySelector("strong");
          if (strongElement) {
            isbn = strongElement.textContent.trim();
          }
        }
      });
    }

    // Try to extract description from text shrinkable shrunk paragraphs
    let description = "";
    const descriptionElements = doc.querySelectorAll(
      ".text.shrinkable.shrunk p",
    );
    if (descriptionElements.length > 0) {
      description = Array.from(descriptionElements)
        .map((p) => p.textContent.trim())
        .filter((text) => text.length > 20)
        .join("\n\n");
    }

    console.log("Moly.hu publication extracted data:", {
      title,
      author,
      publisher,
      year,
      pageCount,
      isbn,
      thumbnail,
      description,
    });

    return {
      title,
      author,
      publisher,
      description,
      isbn,
      thumbnail,
      year,
      pageCount,
      genre: "",
      originalTitle: "",
    };
  };

  // Process Moly.hu regular book pages (konyvek)
  const processMolyBookPage = (doc) => {
    // Extract author from authors class
    const authorElement = doc.querySelector(".authors");
    const author = authorElement ? authorElement.textContent.trim() : "";

    // Extract title from first H1, then inside span, get text before <a> tag
    const titleElement = doc.querySelector("h1 span");
    let title = "";
    if (titleElement) {
      // Get all text nodes before the first <a> tag within the span
      const walker = document.createTreeWalker(
        titleElement,
        NodeFilter.SHOW_TEXT,
        null,
        false,
      );
      let textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        // Stop when we encounter an <a> tag's parent
        if (node.parentElement.tagName === "A") break;
        if (node.textContent.trim()) {
          textNodes.push(node.textContent.trim());
        }
      }
      title = textNodes.join(" ").trim();
    }

    // Extract thumbnail from book_with_shop class
    let thumbnail = "";
    const bookWithShopElement = doc.querySelector(".book_with_shop img");
    if (bookWithShopElement) {
      thumbnail =
        bookWithShopElement.src ||
        bookWithShopElement.getAttribute("data-src") ||
        bookWithShopElement.getAttribute("data-lazy") ||
        "";
    }

    // Extract description from text shrinkable shrunk paragraphs
    let description = "";
    const descriptionElements = doc.querySelectorAll(
      ".text.shrinkable.shrunk p",
    );
    if (descriptionElements.length > 0) {
      description = Array.from(descriptionElements)
        .map((p) => p.textContent.trim())
        .filter((text) => text.length > 20)
        .join("\n\n");
    }

    // Try to extract other metadata if available
    let publisher = "";
    let year = "";
    let isbn = "";

    // Try to find ISBN in the page
    const isbnElement = doc.querySelector("*[itemprop='isbn']");
    if (isbnElement) {
      isbn = isbnElement.textContent.trim();
    }

    // Try to find publisher
    const publisherElement = doc.querySelector("*[itemprop='publisher']");
    if (publisherElement) {
      publisher = publisherElement.textContent.trim();
    }

    // Try to find year from various places
    const yearElement = doc.querySelector("*[itemprop='datePublished']");
    if (yearElement) {
      year = yearElement.textContent.trim();
    }

    console.log("Moly.hu book extracted data:", {
      title,
      author,
      publisher,
      description,
      isbn,
      thumbnail,
      year,
    });

    return {
      title,
      author,
      publisher,
      description,
      isbn,
      thumbnail,
      year,
      genre: "", // Moly.hu doesn't have a clear genre field
      originalTitle: "",
      pageCount: "",
    };
  };

  // Process Open Library URLs
  const processOpenLibraryUrl = async (url) => {
    try {
      // Extract work ID from URL
      const workIdMatch = url.match(/openlibrary\.org\/works\/([A-Z0-9]+)/);
      if (!workIdMatch) {
        throw new Error("Invalid Open Library URL format");
      }

      const workId = workIdMatch[1];
      const apiUrl = `https://openlibrary.org/works/${workId}.json`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        title: data.title || "",
        author:
          data.authors?.map((author) => author.name || "").join(", ") || "",
        year: data.first_publish_date?.split("-")[0] || "",
        genre: data.subjects?.[0] || "",
        description: data.description?.value || data.description || "",
        isbn: data.isbn_13?.[0] || data.isbn_10?.[0] || "",
        thumbnail: data.covers?.[0]
          ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
          : "",
        source: "Open Library",
        url,
      };
    } catch (error) {
      console.error("Error processing Open Library URL:", error);
      return null;
    }
  };

  // Process Goodreads URLs
  const processGoodreadsUrl = async (url) => {
    try {
      const proxyUrl = "https://api.allorigins.win/raw?url=";
      const response = await fetch(proxyUrl + encodeURIComponent(url));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const title =
        doc.querySelector('[data-testid="bookTitle"]')?.textContent?.trim() ||
        "";
      const author =
        doc.querySelector('[data-testid="authorName"]')?.textContent?.trim() ||
        "";
      const year =
        doc
          .querySelector('[data-testid="publicationInfo"]')
          ?.textContent?.match(/\d{4}/)?.[0] || "";
      const description =
        doc
          .querySelector('[data-testid="description"] span')
          ?.textContent?.trim() || "";
      const thumbnail = doc.querySelector('img[alt*="cover"]')?.src || "";

      return {
        title,
        author,
        year,
        genre: "",
        description,
        isbn: "",
        thumbnail,
        source: "Goodreads",
        url,
      };
    } catch (error) {
      console.error("Error processing Goodreads URL:", error);
      return null;
    }
  };

  // Process Amazon URLs
  const processAmazonUrl = async (url) => {
    try {
      const proxyUrl = "https://api.allorigins.win/raw?url=";
      const response = await fetch(proxyUrl + encodeURIComponent(url));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const title =
        doc.querySelector("#productTitle")?.textContent?.trim() || "";
      const author =
        doc.querySelector(".author .a-link-normal")?.textContent?.trim() || "";
      const year =
        doc
          .querySelector(
            "#rpi-attribute_book_details .a-row:first-child .a-section",
          )
          ?.textContent?.match(/\d{4}/)?.[0] || "";
      const description =
        doc
          .querySelector("#bookDescription_feature_div .a-expander-content")
          ?.textContent?.trim() || "";
      const thumbnail = doc.querySelector("#landingImage")?.src || "";

      return {
        title,
        author,
        year,
        genre: "",
        description,
        isbn: "",
        thumbnail,
        source: "Amazon",
        url,
      };
    } catch (error) {
      console.error("Error processing Amazon URL:", error);
      return null;
    }
  };

  // Parse Moly.hu book page
  const parseMolyBookPage = (html, url) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract title from the page
      const titleElement = doc.querySelector(
        'h1, .book-title, [itemprop="name"]',
      );
      const title = titleElement ? titleElement.textContent.trim() : "";

      // Extract author
      const authorElement = doc.querySelector(
        '.author, [itemprop="author"], .book-author',
      );
      const author = authorElement ? authorElement.textContent.trim() : "";

      // Extract thumbnail from book_with_shop class
      const thumbnailElement = doc.querySelector(
        '.book_with_shop img, .book-cover img, img[alt*="borító"]',
      );
      const thumbnail = thumbnailElement ? thumbnailElement.src : "";

      // Extract year
      const yearElement = doc.querySelector(
        '[itemprop="datePublished"], .year, .publish-year',
      );
      const year = yearElement ? yearElement.textContent.trim() : "";

      // Extract genre/subject
      const genreElement = doc.querySelector(
        '.genre, [itemprop="genre"], .category',
      );
      const genre = genreElement ? genreElement.textContent.trim() : "";

      // Extract description
      const descriptionElement = doc.querySelector(
        '.description, [itemprop="description"], .book-description',
      );
      const description = descriptionElement
        ? descriptionElement.textContent.trim()
        : "";

      // Extract ISBN
      const isbnElement = doc.querySelector('[itemprop="isbn"], .isbn');
      const isbn = isbnElement ? isbnElement.textContent.trim() : "";

      if (title) {
        return {
          title,
          author,
          year,
          genre,
          description,
          isbn,
          thumbnail,
          source: "Moly.hu",
          url,
        };
      }

      return null;
    } catch (error) {
      console.error("Error parsing Moly.hu page:", error);
      return null;
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

  // Handle book edit - toggle edit mode in detail modal
  const handleBookEdit = (book) => {
    setIsEditMode(true);
    setEditingBook(book);
    // Pre-fill the form with current book data
    setTitle(book.title || "");
    setAuthor(book.author || "");
    setYear(book.year || "");
    setGenre(book.genre || "");
    setDescription(book.description || "");
    setIsbn(book.isbn || "");
    setThumbnail(book.thumbnail || "");
    setThumbnailPreview(book.thumbnail || null);
    setOriginalTitle(book.originalTitle || "");
    setPageCount(book.pageCount || "");
    setPublisher(book.publisher || "");
    // Pre-fill quantity and price for bookstore books
    if (book.category === "Bolt") {
      setBookQuantity(book.quantity?.toString() || "");
      setBookPrice(book.price?.toString() || "");
      setBookPurchasePrice(book.purchasePrice?.toString() || "");
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
    // Reset form fields
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

    const bookRef = ref(database, `books/${editingBook.id}`);
    update(bookRef, updateData);

    // Update the selectedBook with new data
    setSelectedBook({
      ...selectedBook,
      ...updateData,
    });

    // Exit edit mode and reset form
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

  // Close book detail modal
  const closeBookDetail = () => {
    setSelectedBook(null);
    setShowBookDetail(false);
    // Also exit edit mode if active
    if (isEditMode) {
      cancelEditMode();
    }
  };

  // Handle gift image click for popup
  const handleGiftImageClick = (gift) => {
    if (gift.image && gift.image !== "🎁") {
      setPopupImage(gift.image);
      setShowImagePopup(true);
    }
  };

  // Close image popup
  const closeImagePopup = () => {
    setShowImagePopup(false);
    setPopupImage(null);
  };

  // Delete book functions
  const handleDeleteClick = (book) => {
    setBookToDelete(book);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      const bookRef = ref(database, `books/${bookToDelete.id}`);
      remove(bookRef)
        .then(() => {
          console.log("Book deleted successfully");
          closeBookDetail(); // Close the detail modal
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

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingBook(null);
    setTitle("");
    setAuthor("");
    setYear("");
    setGenre("");
    setDescription("");
    setIsbn("");
    setThumbnail("");
    setOriginalTitle("");
    setPageCount("");
    setPublisher("");
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
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
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
      <MobileNav
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeMode={activeMode}
      />
      <div className="main-content-with-sidebar">
        {activeTab === "books" && (
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
                {filteredBooks.length === 0 ? (
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
                  <>
                    {getCategoryFilter(activeTab) === "Bolt" ? (
                      // Table view for bookstore
                      <div className="bookstore-table-container">
                        <table className="bookstore-table">
                          <thead>
                            <tr>
                              <th className="table-header-cover">Borító</th>
                              <th
                                className="table-header-title"
                                onClick={() => handleSort("title")}
                              >
                                Cím{" "}
                                {sortField === "title" &&
                                  (sortOrder === "asc" ? "↑" : "↓")}
                              </th>
                              <th
                                className="table-header-author"
                                onClick={() => handleSort("author")}
                              >
                                Szerző{" "}
                                {sortField === "author" &&
                                  (sortOrder === "asc" ? "↑" : "↓")}
                              </th>
                              <th className="table-header-price">
                                Beszerzési ár
                              </th>
                              <th
                                className="table-header-price"
                                onClick={() => handleSort("price")}
                              >
                                Eladási ár{" "}
                                {sortField === "price" &&
                                  (sortOrder === "asc" ? "↑" : "↓")}
                              </th>
                              {user?.role === "admin" && (
                                <th
                                  className="table-header-quantity"
                                  onClick={() => handleSort("quantity")}
                                >
                                  Készlet{" "}
                                  {sortField === "quantity" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                                </th>
                              )}
                              <th className="table-header-status">Állapot</th>
                              {user?.role === "admin" && (
                                <th className="table-header-actions">
                                  Műveletek
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBooks.map((book) => (
                              <tr key={book.id} className="table-row">
                                <td className="table-cell-cover">
                                  <div className="table-thumbnail">
                                    {book.thumbnail ? (
                                      <img
                                        src={book.thumbnail}
                                        alt={book.title}
                                        className="table-thumbnail-img"
                                      />
                                    ) : (
                                      <div className="table-thumbnail-placeholder">
                                        📚
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className="table-cell-title"
                                  onClick={() => handleBookClick(book)}
                                >
                                  <div className="table-title">
                                    {book.title}
                                  </div>
                                  {book.year && (
                                    <div className="table-year">
                                      {book.year}
                                    </div>
                                  )}
                                </td>
                                <td className="table-cell-author">
                                  {book.author}
                                </td>
                                <td className="table-cell-price">
                                  {book.purchasePrice
                                    ? `${book.purchasePrice.toLocaleString("hu-HU")} Ft`
                                    : "N/A"}
                                </td>
                                <td className="table-cell-price">
                                  {book.price
                                    ? `${book.price.toLocaleString("hu-HU")} Ft`
                                    : "N/A"}
                                </td>
                                {user?.role === "admin" && (
                                  <td className="table-cell-quantity">
                                    <span
                                      className={`quantity-badge ${book.quantity > 5 ? "high" : book.quantity > 0 ? "low" : "out"}`}
                                    >
                                      {book.quantity || 0} db
                                    </span>
                                  </td>
                                )}
                                <td className="table-cell-status">
                                  <span
                                    className={`status-badge ${(book.quantity || 0) > 0 ? "in-stock" : "out-of-stock"}`}
                                  >
                                    {(book.quantity || 0) > 0
                                      ? "Raktáron"
                                      : "Nincs raktáron"}
                                  </span>
                                </td>
                                {user?.role === "admin" && (
                                  <td className="table-cell-actions">
                                    <div className="table-actions">
                                      <button
                                        className="table-action-btn edit-btn"
                                        onClick={() => handleBookClick(book)}
                                        title="Részletek"
                                      >
                                        Részletek
                                      </button>
                                      <button
                                        className="table-action-btn delete-btn"
                                        onClick={() => handleDeleteClick(book)}
                                        title="Törlés"
                                      >
                                        Törlés
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // Card view for library
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
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </main>
          </>
        )}

        {activeTab === "gifts" && (
          <div className="tab-content custom-scrollbar">
            <header className="App-header">
              <div className="header-section header-title">
                <div className="title-container">
                  <h1>Ajándéktárgyak</h1>
                  <p>Raktárkezelő Rendszer</p>
                </div>
              </div>
              <div className="header-section header-controls">
                <div className="controls-left">
                  <div className="book-stats">
                    {user?.role === "admin" && (
                      <span className="total-books">
                        Raktáron: {gifts.length} ajándéktárgy
                      </span>
                    )}
                  </div>
                </div>
                <div className="controls-right">
                  <button
                    className="filter-toggle-btn"
                    onClick={() => setShowAddGiftForm(true)}
                  >
                    ➕ Új Ajándéktárgy
                  </button>
                </div>
              </div>
            </header>
            <main
              className={`App-main ${activeTab === "gifts" ? "gifts-padding" : ""}`}
            >
              <div className="content-wrapper">
                <div className="inventory-table">
                  <h2>Raktárkészlet</h2>
                  <div className="table-container">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Kép</th>
                          <th>Név</th>
                          {user?.role === "admin" && <th>Mennyiség</th>}
                          <th>Beszerzési ár</th>
                          <th>Eladási ár</th>
                          <th>Státusz</th>
                          {user?.role === "admin" && <th>Műveletek</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {gifts.map((gift) => {
                          const isAboveRecommendedStock =
                            gift.recommendedStock &&
                            gift.quantity > gift.recommendedStock;
                          const isAtRecommendedStock =
                            gift.recommendedStock &&
                            gift.quantity === gift.recommendedStock;
                          const isBelowRecommendedStock =
                            gift.recommendedStock &&
                            gift.quantity < gift.recommendedStock;
                          const statusClass = isBelowRecommendedStock
                            ? "critical-stock"
                            : isAtRecommendedStock
                              ? "warning-stock"
                              : "in-stock";
                          const statusText = isBelowRecommendedStock
                            ? "Töltés szükséges"
                            : isAtRecommendedStock
                              ? "Fogyóban"
                              : "Készleten";
                          const quantityClass = isBelowRecommendedStock
                            ? "quantity-critical"
                            : isAtRecommendedStock
                              ? "quantity-warning"
                              : "quantity-good";

                          return (
                            <tr key={gift.id} className="inventory-item">
                              <td>
                                <div
                                  className="item-image"
                                  onClick={() =>
                                    gift.image &&
                                    gift.image !== "" &&
                                    handleGiftImageClick(gift)
                                  }
                                  style={{
                                    cursor:
                                      gift.image && gift.image !== ""
                                        ? "pointer"
                                        : "default",
                                  }}
                                >
                                  {gift.image &&
                                  (gift.image.startsWith("data:image/") ||
                                    gift.image.startsWith("blob:")) ? (
                                    <img
                                      src={gift.image}
                                      alt={gift.name}
                                      style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ) : gift.image &&
                                    gift.image.startsWith("http") ? (
                                    <img
                                      src={gift.image}
                                      alt={gift.name}
                                      style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ) : (
                                    <span className="placeholder-icon">
                                      {gift.image || "🎁"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{gift.name}</td>
                              {user?.role === "admin" && (
                                <td>
                                  <span className={`quantity ${quantityClass}`}>
                                    {gift.quantity}
                                  </span>
                                </td>
                              )}
                              <td>{gift.purchasePrice || 0} Ft</td>
                              <td>{gift.price} Ft</td>
                              <td>
                                <span className={`status ${statusClass}`}>
                                  {statusText}
                                </span>
                              </td>
                              {user?.role === "admin" && (
                                <td>
                                  <div className="action-buttons">
                                    <button
                                      className="edit-btn"
                                      onClick={() => {
                                        setEditingGift(gift);
                                        setShowEditGiftForm(true);
                                      }}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="delete-btn"
                                      onClick={() => {
                                        setGiftToDelete(gift);
                                        setShowDeleteGiftConfirm(true);
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}

        {/* Add Gift Modal */}
        {showAddGiftForm && (
          <>
            <div
              className="gift-modal-backdrop"
              onClick={() => setShowAddGiftForm(false)}
            ></div>

            <div
              className="gift-modal-content"
              onClick={(e) => e.stopPropagation()}
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
                Új Ajándéktárgy
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Kép
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setGiftImage(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
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
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Név
                  </label>
                  <input
                    type="text"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                    placeholder="Add meg az ajándéktárgy nevét"
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
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Mennyiség
                  </label>
                  <input
                    type="number"
                    value={giftQuantity}
                    onChange={(e) => setGiftQuantity(e.target.value)}
                    placeholder="Add meg a mennyiséget"
                    min="1"
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
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Beszerzési ár
                  </label>
                  <input
                    type="number"
                    value={giftPurchasePrice}
                    onChange={(e) => setGiftPurchasePrice(e.target.value)}
                    placeholder="Add meg a beszerzési árat (Ft)"
                    min="0"
                    step="1"
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
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Eladási ár
                  </label>
                  <input
                    type="number"
                    value={giftPrice}
                    onChange={(e) => setGiftPrice(e.target.value)}
                    placeholder="Add meg az eladási árat (Ft)"
                    min="0"
                    step="1"
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
                </div>
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
                  onClick={() => {
                    // Add gift to Firebase
                    if (giftName && giftQuantity && giftPrice) {
                      const newGift = {
                        name: giftName,
                        quantity: parseInt(giftQuantity),
                        price: parseFloat(giftPrice),
                        purchasePrice: parseFloat(giftPurchasePrice) || 0,
                        image: giftImage || "🎁",
                        status: "Raktáron",
                        createdAt: new Date().toISOString(),
                        addedBy: user?.email || "unknown",
                      };

                      const giftsRef = ref(database, "gifts");
                      push(giftsRef, newGift);

                      console.log("Gift added to Firebase:", newGift);

                      // Reset form
                      setShowAddGiftForm(false);
                      setGiftName("");
                      setGiftQuantity("");
                      setGiftPrice("");
                      setGiftPurchasePrice("");
                      setGiftImage("");
                    }
                  }}
                  disabled={!giftName || !giftQuantity || !giftPrice}
                  style={{
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    backgroundColor:
                      !giftName || !giftQuantity || !giftPrice
                        ? "#94a3b8"
                        : "#844a59",
                    color: "white",
                    cursor:
                      !giftName || !giftQuantity || !giftPrice
                        ? "not-allowed"
                        : "pointer",
                    transition: "all 0.3s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (giftName && giftQuantity && giftPrice) {
                      e.target.style.backgroundColor = "#6b3a48";
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow =
                        "0 4px 12px rgba(0, 0, 0, 0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (giftName && giftQuantity && giftPrice) {
                      e.target.style.backgroundColor = "#844a59";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                >
                  💾 Ajándéktárgy Hozzáadása
                </button>
                <button
                  onClick={() => {
                    setShowAddGiftForm(false);
                    setGiftName("");
                    setGiftQuantity("");
                    setGiftPrice("");
                    setGiftPurchasePrice("");
                    setGiftImage("");
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
                  ❌ Mégse
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete Gift Confirmation Modal */}
        {showDeleteGiftConfirm && (
          <>
            <div
              className="gift-modal-backdrop"
              onClick={() => setShowDeleteGiftConfirm(false)}
            ></div>

            <div
              className="gift-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  margin: "0 0 20px 0",
                  color: "#2c3e50",
                  fontSize: "24px",
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Ajándéktárgy Törlése
              </h2>

              <p
                style={{
                  margin: "0 0 30px 0",
                  color: "#64748b",
                  fontSize: "16px",
                  textAlign: "center",
                  lineHeight: "1.5",
                }}
              >
                Biztosan törölni szeretnéd ezt az ajándéktárgyat?
                <br />
                <strong>{giftToDelete?.name}</strong>
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => deleteGift(giftToDelete?.id)}
                  style={{
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    backgroundColor: "#dc2626",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#b91c1c";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  🗑️ Törlés
                </button>
                <button
                  onClick={() => {
                    setShowDeleteGiftConfirm(false);
                    setGiftToDelete(null);
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
                  ❌ Mégse
                </button>
              </div>
            </div>
          </>
        )}

        {/* Edit Gift Modal */}
        {showEditGiftForm && editingGift && (
          <>
            <div
              className="gift-modal-backdrop"
              onClick={() => setShowEditGiftForm(false)}
            ></div>

            <div
              className="gift-modal-content"
              onClick={(e) => e.stopPropagation()}
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
                Ajándéktárgy Szerkesztése
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Név
                  </label>
                  <input
                    type="text"
                    defaultValue={editingGift.name}
                    id="edit-gift-name"
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
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Mennyiség
                  </label>
                  <input
                    type="number"
                    defaultValue={editingGift.quantity}
                    id="edit-gift-quantity"
                    min="1"
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
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Beszerzési ár
                  </label>
                  <input
                    type="number"
                    defaultValue={editingGift.purchasePrice || 0}
                    id="edit-gift-purchase-price"
                    min="0"
                    step="1"
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
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Eladási ár
                  </label>
                  <input
                    type="number"
                    defaultValue={editingGift.price}
                    id="edit-gift-price"
                    min="0"
                    step="1"
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
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Ajánlott készlet
                  </label>
                  <input
                    type="number"
                    defaultValue={editingGift.recommendedStock || ""}
                    id="edit-gift-recommended-stock"
                    min="1"
                    placeholder="Ajánlott készlet mennyisége"
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
                </div>
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
                  onClick={() => {
                    const name =
                      document.getElementById("edit-gift-name").value;
                    const quantity =
                      document.getElementById("edit-gift-quantity").value;
                    const purchasePrice = document.getElementById(
                      "edit-gift-purchase-price",
                    ).value;
                    const price =
                      document.getElementById("edit-gift-price").value;
                    const recommendedStock = document.getElementById(
                      "edit-gift-recommended-stock",
                    ).value;

                    if (name && quantity && price) {
                      updateGift(editingGift.id, {
                        name,
                        quantity: parseInt(quantity),
                        purchasePrice: parseFloat(purchasePrice) || 0,
                        price: parseFloat(price),
                        recommendedStock: recommendedStock
                          ? parseInt(recommendedStock)
                          : null,
                      });
                    }
                  }}
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
                  💾 Változtatások Mentése
                </button>
                <button
                  onClick={() => {
                    setShowEditGiftForm(false);
                    setEditingGift(null);
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
                  ❌ Mégse
                </button>
              </div>
            </div>
          </>
        )}

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
                {filteredBooks.length === 0 ? (
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
                  filteredBooks.map((book) => {
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
            <KasszaPanel user={user} />
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddForm && (
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
            onClick={() => setShowAddForm(false)}
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
                    setShowAddForm(false);
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
                    setCategory("Bolt");
                    setSuccessMessage("");
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
                    minWidth: 0,
                    overflow: "hidden",
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
      )}

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

      {/* Gift Image Popup Modal */}
      {showImagePopup && popupImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={closeImagePopup}
        >
          <div
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={popupImage}
              alt="Gift Image"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            />
            <button
              onClick={closeImagePopup}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
