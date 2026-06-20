import { useState, useEffect, useRef } from "react";
import {
  database,
  dbRef,
  ref,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
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

  // Load books from Firebase — incremental listeners (only changed books downloaded on writes)
  useEffect(() => {
    if (!isAuthenticated) {
      setBooks([]);
      return;
    }
    const booksRef = dbRef(database, "books");
    const bookMap = {};
    let initialBatchDone = false;
    let flushTimer = null;

    // Debounced flush — fires 50ms after the LAST initial child event arrives
    const scheduleInitialFlush = () => {
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        flushTimer = null;
        initialBatchDone = true;
        setBooks(Object.values(bookMap));
        markLoaded("books");
      }, 50);
    };

    const unsubAdded = onChildAdded(booksRef, (snapshot) => {
      const book = { id: snapshot.key, ...snapshot.val() };
      bookMap[book.id] = book;
      if (!initialBatchDone) {
        scheduleInitialFlush();
      } else {
        setBooks((prev) => [...prev, book]);
      }
    });

    const unsubChanged = onChildChanged(booksRef, (snapshot) => {
      const updated = { id: snapshot.key, ...snapshot.val() };
      bookMap[updated.id] = updated;
      if (!initialBatchDone) return; // handled by initial flush
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    });

    const unsubRemoved = onChildRemoved(booksRef, (snapshot) => {
      delete bookMap[snapshot.key];
      if (!initialBatchDone) return; // handled by initial flush
      setBooks((prev) => prev.filter((b) => b.id !== snapshot.key));
    });

    return () => {
      clearTimeout(flushTimer);
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
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

  // Load sales from Firebase — incremental listeners
  useEffect(() => {
    if (!isAuthenticated) {
      setSales([]);
      return;
    }
    const salesRef = dbRef(database, "sales");
    const saleMap = {};
    let initialBatchDone = false;
    let flushTimer = null;

    const scheduleInitialFlush = () => {
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        flushTimer = null;
        initialBatchDone = true;
        setSales(Object.values(saleMap));
        markLoaded("sales");
      }, 50);
    };

    const unsubAdded = onChildAdded(salesRef, (snapshot) => {
      const sale = { id: snapshot.key, ...snapshot.val() };
      saleMap[sale.id] = sale;
      if (!initialBatchDone) {
        scheduleInitialFlush();
      } else {
        setSales((prev) => [...prev, sale]);
      }
    });

    const unsubChanged = onChildChanged(salesRef, (snapshot) => {
      const updated = { id: snapshot.key, ...snapshot.val() };
      saleMap[updated.id] = updated;
      if (!initialBatchDone) return;
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    });

    const unsubRemoved = onChildRemoved(salesRef, (snapshot) => {
      delete saleMap[snapshot.key];
      if (!initialBatchDone) return;
      setSales((prev) => prev.filter((s) => s.id !== snapshot.key));
    });

    return () => {
      clearTimeout(flushTimer);
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
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
