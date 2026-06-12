import { useState, useEffect, useRef } from "react";
import {
  database,
  dbRef,
  ref,
  onValue,
  off,
} from "../firebase.js";

export function useDatabase(isAuthenticated) {
  const [books, setBooks] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [sales, setSales] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [extraTransactions, setExtraTransactions] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const loadedRef = useRef(new Set());
  const TOTAL_SOURCES = 7;

  // Reset tracking when auth changes (logout/login)
  useEffect(() => {
    if (!isAuthenticated) {
      loadedRef.current.clear();
      setDataLoaded(false);
    }
  }, [isAuthenticated]);

  // Track a source as loaded; flip dataLoaded when all 7 have fired
  const markLoaded = (key) => {
    if (!loadedRef.current.has(key)) {
      loadedRef.current.add(key);
      if (loadedRef.current.size >= TOTAL_SOURCES) {
        setDataLoaded(true);
      }
    }
  };

  // Load books from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setBooks([]);
      return;
    }
    const booksRef = dbRef(database, "books");
    const unsubscribe = onValue(booksRef, (snapshot) => {
      markLoaded("books");
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
  }, [isAuthenticated]);

  // Load gifts from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setGifts([]);
      return;
    }
    const giftsRef = dbRef(database, "gifts");
    const unsubscribe = onValue(giftsRef, (snapshot) => {
      markLoaded("gifts");
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
  }, [isAuthenticated]);

  // Load users from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }
    const usersRef = dbRef(database, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      markLoaded("users");
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

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Load loans from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setLoans([]);
      return;
    }
    const loansRef = dbRef(database, "loans");
    const unsubscribe = onValue(loansRef, (snapshot) => {
      markLoaded("loans");
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

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Load sales from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setSales([]);
      return;
    }
    const salesRef = dbRef(database, "sales");
    const unsubscribe = onValue(salesRef, (snapshot) => {
      markLoaded("sales");
      const data = snapshot.val();
      if (data) {
        setSales(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setSales([]);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Load shifts from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setShifts([]);
      return;
    }
    const shiftsRef = dbRef(database, "shifts");
    const unsubscribe = onValue(shiftsRef, (snapshot) => {
      markLoaded("shifts");
      const data = snapshot.val();
      if (data) {
        setShifts(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setShifts([]);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Load extra transactions from Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setExtraTransactions([]);
      return;
    }
    const extraRef = dbRef(database, "extraTransactions");
    const unsubscribe = onValue(extraRef, (snapshot) => {
      markLoaded("extraTransactions");
      const data = snapshot.val();
      if (data) {
        setExtraTransactions(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setExtraTransactions([]);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  return { books, gifts, users, loans, sales, shifts, extraTransactions, dataLoaded };
}
