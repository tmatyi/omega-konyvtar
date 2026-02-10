import React from "react";

function BooksTable({ books, user, sortField, sortOrder, onSort, onBookClick, onDeleteClick }) {
  return (
    <div className="bookstore-table-container">
      <table className="bookstore-table">
        <thead>
          <tr>
            <th className="table-header-cover">Borító</th>
            <th
              className="table-header-title"
              onClick={() => onSort("title")}
            >
              Cím{" "}
              {sortField === "title" &&
                (sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="table-header-author"
              onClick={() => onSort("author")}
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
              onClick={() => onSort("price")}
            >
              Eladási ár{" "}
              {sortField === "price" &&
                (sortOrder === "asc" ? "↑" : "↓")}
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
              <th className="table-header-actions">
                Műveletek
              </th>
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
                    <div className="table-thumbnail-placeholder">
                      📚
                    </div>
                  )}
                </div>
              </td>
              <td
                className="table-cell-title"
                onClick={() => onBookClick(book)}
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
  );
}

export default BooksTable;
