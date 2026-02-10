import React, { useState } from "react";
import "./BooksTable.css";

function BooksTable({
  books,
  user,
  sortField,
  sortOrder,
  onSort,
  onBookClick,
  onDeleteClick,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (bookId) => {
    setExpandedId((prev) => (prev === bookId ? null : bookId));
  };

  return (
    <>
      {/* Desktop: original table */}
      <div className="bookstore-table-container bookstore-table-desktop">
        <table className="bookstore-table">
          <thead>
            <tr>
              <th className="table-header-cover">Borító</th>
              <th
                className="table-header-title"
                onClick={() => onSort("title")}
              >
                Cím {sortField === "title" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="table-header-author"
                onClick={() => onSort("author")}
              >
                Szerző{" "}
                {sortField === "author" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="table-header-price">Beszerzési ár</th>
              <th
                className="table-header-price"
                onClick={() => onSort("price")}
              >
                Eladási ár{" "}
                {sortField === "price" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              {user?.role === "admin" && (
                <th
                  className="table-header-quantity"
                  onClick={() => onSort("quantity")}
                >
                  Készlet{" "}
                  {sortField === "quantity" &&
                    (sortOrder === "asc" ? "↑" : "↓")}
                </th>
              )}
              <th className="table-header-status">Állapot</th>
              {user?.role === "admin" && (
                <th className="table-header-actions">Műveletek</th>
              )}
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
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
                      <div className="table-thumbnail-placeholder">📚</div>
                    )}
                  </div>
                </td>
                <td
                  className="table-cell-title"
                  onClick={() => onBookClick(book)}
                >
                  <div className="table-title">{book.title}</div>
                  {book.year && <div className="table-year">{book.year}</div>}
                </td>
                <td className="table-cell-author">{book.author}</td>
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
                    {(book.quantity || 0) > 0 ? "Raktáron" : "Nincs raktáron"}
                  </span>
                </td>
                {user?.role === "admin" && (
                  <td className="table-cell-actions">
                    <div className="table-actions">
                      <button
                        className="table-action-btn edit-btn"
                        onClick={() => onBookClick(book)}
                        title="Részletek"
                      >
                        Részletek
                      </button>
                      <button
                        className="table-action-btn delete-btn"
                        onClick={() => onDeleteClick(book)}
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

      {/* Mobile: expandable compact rows */}
      <div className="compact-rows-container compact-rows-mobile">
        {books.map((book) => {
          const isExpanded = expandedId === book.id;
          return (
            <div
              key={book.id}
              className={`compact-row ${isExpanded ? "compact-row--expanded" : ""}`}
            >
              <div
                className="compact-row__summary"
                onClick={() => toggleExpand(book.id)}
              >
                <div className="compact-row__thumb">
                  {book.thumbnail ? (
                    <img src={book.thumbnail} alt={book.title} />
                  ) : (
                    <span className="compact-row__thumb-placeholder">📚</span>
                  )}
                </div>
                <div className="compact-row__info">
                  <span className="compact-row__title">{book.title}</span>
                  <span className="compact-row__subtitle">{book.author}</span>
                </div>
                <div className="compact-row__end">
                  <span
                    className={`compact-row__badge ${(book.quantity || 0) > 0 ? "in-stock" : "out-of-stock"}`}
                  >
                    {book.price
                      ? `${book.price.toLocaleString("hu-HU")} Ft`
                      : "N/A"}
                  </span>
                  <svg
                    className={`compact-row__chevron ${isExpanded ? "compact-row__chevron--open" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className="compact-row__details">
                <div className="compact-row__details-inner">
                  <div className="compact-row__detail-grid">
                    <div className="compact-row__detail-item">
                      <span className="compact-row__detail-label">Állapot</span>
                      <span
                        className={`status-badge ${(book.quantity || 0) > 0 ? "in-stock" : "out-of-stock"}`}
                      >
                        {(book.quantity || 0) > 0
                          ? "Raktáron"
                          : "Nincs raktáron"}
                      </span>
                    </div>
                    {user?.role === "admin" && (
                      <div className="compact-row__detail-item">
                        <span className="compact-row__detail-label">
                          Készlet
                        </span>
                        <span
                          className={`quantity-badge ${book.quantity > 5 ? "high" : book.quantity > 0 ? "low" : "out"}`}
                        >
                          {book.quantity || 0} db
                        </span>
                      </div>
                    )}
                    <div className="compact-row__detail-item">
                      <span className="compact-row__detail-label">
                        Beszerzési ár
                      </span>
                      <span>
                        {book.purchasePrice
                          ? `${book.purchasePrice.toLocaleString("hu-HU")} Ft`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="compact-row__detail-item">
                      <span className="compact-row__detail-label">
                        Eladási ár
                      </span>
                      <span>
                        {book.price
                          ? `${book.price.toLocaleString("hu-HU")} Ft`
                          : "N/A"}
                      </span>
                    </div>
                    {book.year && (
                      <div className="compact-row__detail-item">
                        <span className="compact-row__detail-label">Év</span>
                        <span>{book.year}</span>
                      </div>
                    )}
                    {book.isbn && (
                      <div className="compact-row__detail-item">
                        <span className="compact-row__detail-label">ISBN</span>
                        <span
                          style={{
                            fontFamily: '"SF Mono", "Menlo", monospace',
                            fontSize: "12px",
                          }}
                        >
                          {book.isbn}
                        </span>
                      </div>
                    )}
                    {book.genre && (
                      <div className="compact-row__detail-item">
                        <span className="compact-row__detail-label">Műfaj</span>
                        <span>{book.genre}</span>
                      </div>
                    )}
                  </div>
                  {user?.role === "admin" && (
                    <div className="compact-row__actions">
                      <button
                        className="compact-row__action-btn compact-row__action-btn--primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookClick(book);
                        }}
                      >
                        Részletek
                      </button>
                      <button
                        className="compact-row__action-btn compact-row__action-btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(book);
                        }}
                      >
                        Törlés
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default BooksTable;
