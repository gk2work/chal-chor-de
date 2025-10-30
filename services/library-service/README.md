# OfficeShare Library Service

The Library Service enables office workers to share books within their workplace community. It provides comprehensive book cataloging, borrowing workflows, and library management capabilities.

## Features

- **Book Cataloging**: Add books with ISBN lookup and automatic metadata retrieval
- **Borrowing System**: Complete request/approval workflow for book borrowing
- **Search & Discovery**: Advanced search with filters for title, author, tags, and condition
- **Personal Libraries**: Manage your own collection of shared books
- **Image Upload**: Upload and process book cover images
- **Statistics**: Library analytics and popular book tracking
- **Office Isolation**: All operations respect office boundaries

## API Endpoints

### Health Check

- `GET /health` - Service health status

### Book Management

- `GET /api/books` - Get all books in office with search and filters
- `GET /api/books/:book_id` - Get book details with borrow history
- `POST /api/books` - Add new book (with optional cover image upload)
- `PUT /api/books/:book_id` - Update book details
- `DELETE /api/books/:book_id` - Delete book (if no active borrows)

### ISBN and Metadata

- `GET /api/isbn/:isbn` - Lookup book metadata by ISBN using Open Library API

### Search and Discovery

- `GET /api/books/search` - Advanced book search with multiple filters
- `GET /api/books/popular` - Get most borrowed books in office

### Personal Library

- `GET /api/users/:user_id/library` - Get user's personal book collection

### Borrowing System

- `POST /api/books/:book_id/borrow` - Create borrow request
- `GET /api/borrow-requests` - Get borrow requests (for owners/borrowers)
- `PUT /api/borrow-requests/:request_id` - Approve/reject borrow request
- `PUT /api/borrow-requests/:request_id/return` - Mark book as returned

### Analytics

- `GET /api/library/stats` - Get library and borrowing statistics

## Book States

### Availability Status

- `available` - Book is available for borrowing
- `reserved` - Book has pending borrow request
- `borrowed` - Book is currently borrowed

### Borrow Request Status

- `pending` - Request awaiting owner approval
- `approved` - Request approved, book ready for pickup
- `borrowed` - Book currently with borrower
- `returned` - Book returned to owner
- `rejected` - Request rejected by owner

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in `.env`

3. Start the service:
   ```bash
   npm run dev
   ```

The service will run on `http://localhost:3008`

## External API Integration

### Open Library API

The service integrates with Open Library API for automatic book metadata retrieval:

- Fetches title, author, description, publisher, publication date
- Retrieves book cover images
- Gets subject tags and categories
- No API key required (free service)

## File Upload

### Book Cover Images

- Supported formats: JPEG, PNG, WebP
- Maximum file size: 5MB
- Automatic image processing and resizing (300x400px)
- Images stored in `/uploads/covers/` directory

## Database Collections

### books

- Book catalog with metadata and availability status
- Owner information and office isolation
- Cover images and tags

### borrow_requests

- Borrowing workflow management
- Request status tracking and history
- Due dates and return tracking

## Usage Examples

### Add a Book with ISBN

```javascript
const formData = new FormData();
formData.append("isbn", "9780134685991");
formData.append("owner_id", "user123");
formData.append("office_id", "office_001");
formData.append("condition", "excellent");

const response = await fetch("http://localhost:3008/api/books", {
  method: "POST",
  body: formData,
});
```

### Search Books

```javascript
const response = await fetch(
  "http://localhost:3008/api/books/search?office_id=office_001&q=javascript&availability=available"
);
const data = await response.json();
```

### Create Borrow Request

```javascript
const response = await fetch("http://localhost:3008/api/books/book123/borrow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    borrower_id: "user456",
    office_id: "office_001",
    requested_duration_days: 14,
    notes: "Need this for a project",
  }),
});
```

## Error Handling

The service provides comprehensive error handling:

- Input validation with detailed error messages
- Business logic validation (e.g., can't delete borrowed books)
- External API error handling (Open Library timeouts)
- File upload validation and processing errors

## Security Features

- Office-level data isolation
- Owner-only book modification and deletion
- Borrow request validation and authorization
- File upload security (type and size validation)
- Input sanitization and validation

## Future Enhancements

- **Barcode Scanning**: Mobile app integration for ISBN scanning
- **Due Date Reminders**: Automated notification system integration
- **Book Recommendations**: ML-based recommendation engine
- **Reading Lists**: Curated book collections and wishlists
- **Book Reviews**: User ratings and review system
- **Library Events**: Book clubs and reading events management
