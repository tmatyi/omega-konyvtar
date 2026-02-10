// Shared CORS proxy list used by multiple scrapers
const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
];

// Fetch HTML through CORS proxies with fallback chain
const fetchViaProxy = async (url) => {
  let html = "";
  for (const proxy of CORS_PROXIES) {
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
  return html;
};

// Process CLC Hungary URLs
export const processClcHungaryUrl = async (url) => {
  try {
    const html = await fetchViaProxy(url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    console.log("Processing CLC Hungary URL:", url);

    // Extract title
    const titleElement = doc.querySelector(".product_title.entry-title");
    const title = titleElement ? titleElement.textContent.trim() : "";

    // Extract author from product meta or description
    let author = "";
    const authorElement = doc.querySelector(
      '.posted_in a, .tagged_as a, .product_meta .detail-value',
    );
    if (authorElement) {
      author = authorElement.textContent.trim();
    }

    // Extract thumbnail
    let thumbnail = "";
    const thumbnailElement = doc.querySelector(
      ".woocommerce-product-gallery__image img",
    );
    if (thumbnailElement) {
      thumbnail =
        thumbnailElement.src ||
        thumbnailElement.getAttribute("data-src") ||
        thumbnailElement.getAttribute("data-large_image") ||
        "";
    }

    // Extract description
    let description = "";
    const descriptionElement = doc.querySelector(
      ".woocommerce-product-details__short-description, #tab-description",
    );
    if (descriptionElement) {
      description = descriptionElement.textContent.trim();
    }

    // Extract metadata from product details table or meta
    let isbn = "";
    let year = "";
    let publisher = "";
    let originalTitle = "";
    let pageCount = "";

    // Try to find ISBN in SKU or product meta
    const skuElement = doc.querySelector(".sku");
    if (skuElement) {
      const skuText = skuElement.textContent.trim();
      if (/^[\d-]+$/.test(skuText)) {
        isbn = skuText;
      }
    }

    // Try to extract from additional information table
    const additionalInfoRows = doc.querySelectorAll(
      ".woocommerce-product-attributes tr, .shop_attributes tr",
    );
    additionalInfoRows.forEach((row) => {
      const label = row.querySelector("th, td:first-child");
      const value = row.querySelector("td:last-child, td:nth-child(2)");
      if (label && value) {
        const labelText = label.textContent.trim().toLowerCase();
        const valueText = value.textContent.trim();

        if (labelText.includes("isbn")) isbn = valueText;
        if (labelText.includes("kiadó") || labelText.includes("publisher"))
          publisher = valueText;
        if (labelText.includes("év") || labelText.includes("year"))
          year = valueText;
        if (
          labelText.includes("eredeti") ||
          labelText.includes("original title")
        )
          originalTitle = valueText;
        if (labelText.includes("oldal") || labelText.includes("page"))
          pageCount = valueText;
        if (labelText.includes("szerző") || labelText.includes("author"))
          author = valueText;
      }
    });

    // Try to extract year from description or publisher text if not found
    if (!year && publisher) {
      const yearMatch = publisher.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = yearMatch[0];
      }
    }

    // Extract ISBN from URL as fallback (CLC URLs often contain ISBN)
    if (!isbn) {
      const isbnMatch = url.match(/(\d{13}|\d{10})/);
      if (isbnMatch) {
        isbn = isbnMatch[1];
      }
    }

    console.log("CLC Hungary extracted data:", {
      title,
      author,
      publisher,
      description,
      isbn,
      thumbnail,
      year,
      originalTitle,
      pageCount,
    });

    return {
      title,
      author,
      publisher,
      description,
      isbn,
      thumbnail,
      year,
      genre: "",
      originalTitle,
      pageCount,
    };
  } catch (error) {
    console.error("Error processing CLC Hungary URL:", error);

    if (error.message.includes("All proxies failed")) {
      alert(
        "Nem lehet hozzáférni a CLC Hungary weboldalához CORS korlátozások miatt. Kérjük, adja meg a könyv adatait manuálisan, vagy próbáljon másik URL-t.",
      );
    } else {
      alert(
        "Hiba a CLC Hungary URL feldolgozása közben. Kérjük, ellenőrizze az URL-t és próbálja újra.",
      );
    }

    return null;
  }
};

// Process Bookline URLs
export const processBooklineUrl = async (url) => {
  try {
    const html = await fetchViaProxy(url);

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

// Process Moly.hu URLs
export const processMolyHuUrl = async (url) => {
  let doc = null;
  try {
    const html = await fetchViaProxy(url);

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

// Process Open Library URLs
export const processOpenLibraryUrl = async (url) => {
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
export const processGoodreadsUrl = async (url) => {
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
export const processAmazonUrl = async (url) => {
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
export const parseMolyBookPage = (html, url) => {
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

// Main URL dispatcher — determines which scraper to use based on the URL
export const scrapeBookByUrl = async (url) => {
  if (url.includes("clchungary.com")) {
    return await processClcHungaryUrl(url);
  } else if (url.includes("bookline.hu")) {
    return await processBooklineUrl(url);
  } else if (url.includes("moly.hu")) {
    return await processMolyHuUrl(url);
  } else {
    return null;
  }
};
