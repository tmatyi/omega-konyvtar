import { database, ref, push, update, remove } from "../firebase.js";

// ============================================================
// Book CRUD Operations
// ============================================================

// Add a new book to Firebase
export const addBookToDb = (bookData) => {
  const booksRef = ref(database, "books");
  return push(booksRef, bookData);
};

// Update an existing book in Firebase
export const updateBookInDb = (bookId, updateData) => {
  const bookRef = ref(database, `books/${bookId}`);
  return update(bookRef, updateData);
};

// Delete a book from Firebase
export const deleteBookFromDb = (bookId) => {
  const bookRef = ref(database, `books/${bookId}`);
  return remove(bookRef);
};

// Sell a book (decrease quantity, update status)
export const sellBookInDb = (bookId, currentQuantity) => {
  const updatedQuantity = currentQuantity - 1;
  const bookRef = ref(database, `books/${bookId}`);
  return update(bookRef, {
    quantity: updatedQuantity,
    status: updatedQuantity > 0 ? "Raktáron" : "Nincs raktáron",
  });
};

// ============================================================
// Gift CRUD Operations
// ============================================================

// Add a new gift to Firebase
export const addGiftToDb = (giftData) => {
  const giftsRef = ref(database, "gifts");
  return push(giftsRef, giftData);
};

// Update an existing gift in Firebase
export const updateGiftInDb = (giftId, updatedData) => {
  const giftRef = ref(database, `gifts/${giftId}`);
  return update(giftRef, updatedData);
};

// Delete a gift from Firebase
export const deleteGiftFromDb = (giftId) => {
  const giftRef = ref(database, `gifts/${giftId}`);
  return remove(giftRef);
};
