# WhatsApp Chat Viewer

A beautifully designed web application for viewing and managing exported WhatsApp chat history with advanced features like bookmarks, search, and responsive design.

## Features

- **📁 Multiple Chat Support**: Upload and manage multiple WhatsApp chat exports
- **⭐ Smart Bookmarking**: Bookmark any message with unlimited bookmarks, similar to WhatsApp's starred messages
- **🔍 Advanced Search**: Search through messages with real-time highlighting
- **📊 Chat Statistics**: View detailed statistics for each chat including message distribution
- **💾 Local Storage**: All data is stored locally using IndexedDB with enterprise-grade indexing
- **📱 Mobile Responsive**: Fully responsive design that works perfectly on mobile devices
- **⚡ High Performance**: Virtualized message rendering for smooth scrolling through large chats
- **🎨 WhatsApp-Inspired UI**: Familiar interface that feels like the real WhatsApp

## How to Export WhatsApp Chat

1. Open WhatsApp on your phone
2. Go to the chat you want to export
3. Tap the chat name at the top
4. Scroll down and tap "Export Chat"
5. Choose "Without Media" (media files are not supported in text exports)
6. Save the text file and upload it to this app

## Technical Features

### Performance Optimizations
- **Virtualized Scrolling**: Only renders visible messages for optimal performance
- **IndexedDB Storage**: Enterprise-grade indexed database for fast queries
- **Smart Caching**: Aggressive caching strategies for instant loading
- **Optimized Parsing**: High-performance WhatsApp chat parser

### Data Management
- **Multiple Chat Storage**: Keep multiple chats without losing previous ones
- **Bookmark Management**: Add, remove, and navigate bookmarks across all chats
- **Search Functionality**: Fast full-text search across all messages
- **Export Capability**: Re-export processed chats

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Smooth Animations**: Fluid transitions and animations throughout the app
- **Intuitive Navigation**: Easy-to-use interface with clear visual feedback
- **Offline Support**: Works completely offline once loaded

## Supported Chat Format

The app supports the standard WhatsApp chat export format:

```
2/24/24, 12:56 - Messages and calls are end-to-end encrypted...
2/24/24, 21:56 - Person1: Hello there!
2/24/24, 21:59 - ~ Person2: Hi! How are you?
```

## Development

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd whatsapp-chat-viewer-svelte

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build for Production
```bash
# Build the app
pnpm build

# Preview production build
pnpm preview
```

## Technology Stack

- **Frontend**: Svelte 5 with SvelteKit
- **Styling**: Native CSS with CSS custom properties
- **Database**: IndexedDB with `idb` library
- **Build Tool**: Vite
- **Language**: TypeScript

## Architecture

### Database Schema
- **Chats**: Store chat metadata and raw content
- **Messages**: Individual messages with full-text search indexes
- **Bookmarks**: User bookmarks with cross-references

### Performance Features
- Compound indexes for optimal query performance
- Batch operations for large datasets
- Memory-efficient virtualization
- Lazy loading with smart prefetching

## Browser Support

- Chrome/Edge 88+
- Firefox 84+
- Safari 14+
- Mobile browsers with IndexedDB support

## Privacy

- **100% Local**: All data stays on your device
- **No Server**: No data is sent to any servers
- **Secure Storage**: Data is stored in your browser's IndexedDB
- **Export Control**: You control your data export and import

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

Built with ❤️ using Svelte and modern web technologies.
