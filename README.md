# Omega Könyvtár

**Version: 0.1.1**

A comprehensive book management system with intelligent URL-based data extraction for Hungarian Christian literature.

## 🎯 Features

### 📚 Book Management

- **Dual Categories**: Separate "Bolt" (Shop) and "Könyvtár" (Library) collections
- **Smart Filtering**: Filter by title, author, genre, and category
- **Responsive Design**: Adaptive card density for optimal viewing
- **Book Details**: Comprehensive book information display

### 🔗 URL-Based Data Extraction

- **CLC Hungary Integration**: Automatic book data extraction from CLC Hungary URLs
- **Intelligent Parsing**: Extracts title, author, year, ISBN, description, and more
- **Multi-Proxy Support**: Reliable data fetching with fallback proxies
- **Error Handling**: Graceful fallbacks for network issues

### ✏️ Complete Edit Functionality

- **Full Book Editing**: Edit all book fields with pre-filled forms
- **Data Integrity**: Maintains all book metadata during updates
- **Modal Interface**: Clean, intuitive editing experience

### 📊 Rich Book Data

- **Core Fields**: Title, Author, Year, Genre, Description, ISBN
- **Extended Fields**: Original Title, Page Count, Publisher
- **Thumbnail Support**: Automatic cover image extraction
- **Hungarian Labels**: Localized field names for Hungarian users

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Firebase project configuration

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tmatyi/omega-konyvtar.git
   cd omega-konyvtar
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Copy your Firebase configuration to `src/firebase.js`
   - Enable Authentication and Realtime Database

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) to view the application.

## 🔧 Usage

### Adding Books

#### URL Extraction (Recommended)

1. Click "+ Új Könyv Hozzáadása"
2. Paste a CLC Hungary book URL (e.g., `https://www.clchungary.com/termek/...`)
3. Click "🔗 Extract Data"
4. Review extracted data and click "Add Book"

#### Manual Entry

1. Click "+ Új Könyv Hozzáadása"
2. Scroll down to "OR" section
3. Fill in book details manually
4. Click "Add Book"

### Editing Books

1. Click on any book card to view details
2. Click "Edit" button in the detail modal
3. Modify any field as needed
4. Click "Update Book" to save changes

### Managing Collections

- **Bolt Tab**: Shop inventory books
- **Könyvtár Tab**: Library collection books
- **Profile Tab**: User profile and settings
- **Passcard Tab**: Reader card information

## 🌐 Supported URLs

### CLC Hungary

- **Format**: `https://www.clchungary.com/termek/book-title-isbn`
- **Extracted Data**: Title, Author, Year, Publisher, Original Title, Page Count, ISBN, Description, Thumbnail
- **Example**: `https://www.clchungary.com/termek/kaland-a-coats-szigeten-bettina-kettschau-evangeliumi-kiado-9789639867772`

## 🛠️ Technical Stack

### Frontend

- **React 18**: Modern React with hooks
- **Vite**: Fast development build tool
- **CSS3**: Responsive design with custom properties

### Backend & Database

- **Firebase Authentication**: User management
- **Firebase Realtime Database**: Book data storage
- **Firebase Hosting**: Production deployment

### Data Processing

- **Web Scraping**: Intelligent HTML parsing
- **CORS Proxies**: Multiple proxy services for reliability
- **DOM Parser**: Client-side HTML processing

## 📱 Responsive Design

- **Desktop**: Full-featured interface with sidebar navigation
- **Tablet**: Adaptive layout with touch-friendly controls
- **Mobile**: Bottom navigation and optimized card layouts
- **Card Density**: Adjustable from compact to spacious views

## 🔒 Security

- **Firebase Authentication**: Secure user login
- **Input Validation**: Client-side data validation
- **CORS Handling**: Safe cross-origin requests
- **Data Sanitization**: Clean data extraction and storage

## 📦 Available Scripts

- `npm run dev` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm run preview` - Previews the production build
- `npm run deploy` - Deploys to Firebase Hosting

## 🔄 Version History

### v0.1.1 (Current)

- ✨ Add CLC Hungary URL processing
- ✨ Implement complete edit functionality
- ✨ Add new book fields (original title, page count, publisher)
- ✨ Separate publisher from description
- ✨ Enhanced data extraction with debug logging

### v0.1.0

- 🎯 Initial release with basic book management
- 📱 Dual category system (Bolt/Könyvtár)
- 🔍 Search and filtering functionality
- 👤 User authentication system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

- Create an issue on GitHub
- Check existing issues for solutions
- Review the documentation for common problems

## 🌟 Acknowledgments

- **CLC Hungary**: For providing comprehensive Christian literature data
- **Firebase**: For robust backend services
- **React Community**: For excellent tools and libraries
