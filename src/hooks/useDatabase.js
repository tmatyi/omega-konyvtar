import { useState, useEffect } from "react";
import {
  database,
  ref,
  onValue,
  off,
} from "../firebase.js";

export function useDatabase() {
  const [books, setBooks] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);

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

  return { books, gifts, users, loans };
}
