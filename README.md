# Riven-Media-Request-Menu

Riven Media Request Menu
A powerful Tampermonkey userscript that adds a smart request menu to popular movie and TV show websites, allowing you to seamlessly request content to your Riven media server directly from IMDb, TMDB, TVDB, Trakt, and Letterboxd.

✨ Features
🎬 Multi-Site Support - Works on IMDb, TMDB, TVDB, Trakt, and Letterboxd

🔄 Auto-Refresh - Real-time library status updates every 3 seconds when menu is open

🔍 Smart ID Lookup - Automatically converts IMDb IDs to TMDb/TVDB IDs using multiple fallback APIs

📊 Library Status Checking - Instantly see if content is already in your Riven library

🎯 One-Click Requests - Request movies and TV shows with a single click

🎨 Clean UI - Beautiful black and white themed menu that doesn't interfere with site design

🚀 Duplicate Prevention - Smart detection ensures only one menu per page

🔒 Secure API Integration - Uses encrypted API key storage

📋 Prerequisites
Before installing this userscript, you need:

Tampermonkey browser extension installed

A running Riven media server

Riven API key (generated from your Riven settings page)

Your Riven server's base URL (e.g., http://192.168.50.111:8080)

🚀 Installation
Step 1: Install Tampermonkey
Download and install Tampermonkey for your browser:

Chrome

Firefox

Edge

Safari

Step 2: Install the Userscript
Click the Tampermonkey icon in your browser toolbar

Select "Create a new script"

Delete the default code

Copy and paste the complete userscript code

Press Ctrl+S (or Cmd+S on Mac) to save

The script is now installed!

Step 3: Configure API Settings
Visit any supported movie site (e.g., IMDb)

The settings dialog will appear automatically on first run

Enter your Riven Base URL (without trailing slash): http://192.168.50.111:8080

Enter your Riven API Key (generate from Riven settings if you don't have one)

Click "Save & Reload"

🎯 Usage
Basic Usage
Navigate to any movie or TV show page on supported sites

Look for the 🎬 Riven button next to the title

Click the button to open the menu

The menu shows:

Media title and IDs (IMDb, TMDb, TVDB)

Library status (In Library / Not in Library)

Current state (Completed, Downloading, Pending, etc.)

Click "Request" to add the content to your Riven library

Use 🔄 button to manually refresh library status

Click "Hide" to dismiss the menu

Menu Controls
Button	Function
🎬 Riven	Toggle menu visibility
Request	Send request to Riven server
🔄	Manually refresh library status
Hide	Close menu for current page
Auto-Refresh
When the menu is open, the script automatically checks library status every 3 seconds. This stops when you:

Close the menu

Click the Hide button

Navigate away from the page

🌐 Supported Websites
Website	URL Pattern	Features
IMDb	imdb.com/title/*	Full support with IMDb ID extraction
TMDB	themoviedb.org/movie/*, themoviedb.org/tv/*	Direct TMDb ID support
TVDB	thetvdb.com/*	TVDB ID and IMDb lookup
Trakt	trakt.tv/movies/*, app.trakt.tv/shows/*	Movie and TV show support
Letterboxd	letterboxd.com/film/*	Movie support with ID extraction
🔧 Configuration
Access Settings
Click Tampermonkey icon → Riven Media Request Menu → ⚙️ Riven Settings

Required Settings
text
Base URL: http://192.168.50.111:8080
API Key: your_riven_api_key_here
Generating an API Key
Open your Riven web interface

Navigate to Settings → API

Click "Generate API Key"

Copy the key and paste it into the userscript settings

🎨 Status Indicators
The menu displays different states with emoji indicators:

Emoji	State	Description
✅	Completed	Successfully downloaded and processed
⬇️	Downloaded/Downloading	Currently downloading
🔗	Symlinked	Files linked to media server
⏳	Pending	Waiting in queue
📝	Requested	Request received
📇	Indexed	Found in indexers
🔍	Scraped	Sources found
🔄	PartiallyCompleted	Some episodes/seasons complete
▶️	Ongoing	Series still airing
🔜	Unreleased	Not yet released
⏸️	Paused	Processing paused
❌	Failed	Download failed
❓	Unknown	Status unknown
🔍 ID Lookup Fallback Chain
When only an IMDb ID is available, the script uses multiple APIs to find TMDb/TVDB IDs:

TMDb API - Primary lookup source (most reliable)

Trakt API - Secondary fallback (provides both TMDb and TVDB IDs)

TVmaze API - Final fallback for TV shows (provides TVDB IDs)

Each lookup has a 5-second timeout before falling back to the next service.

🐛 Troubleshooting
Button Not Appearing
Problem: The Riven button doesn't show up on the page

Solutions:

Refresh the page (Ctrl+R / Cmd+R)

Check browser console (F12) for error messages

Ensure Tampermonkey is enabled for the site

Verify the URL matches supported patterns

Wait 2 seconds after page load (script initialization delay)

Request Failed (400 Error)
Problem: "Request failed (400)" notification

Solutions:

Missing TMDb/TVDB ID - script will attempt automatic lookup

Check console logs to see which IDs were found

Verify your Riven server is running and accessible

No TMDb/TVDB ID Available
Problem: "❌ No TMDb or TVDB ID available after all lookups"

Solutions:

The content might not be indexed in TMDB/TVDB databases

Try visiting the TMDB or TVDB page directly for this content

Check if the IMDb ID is correct

Status Always Shows "Not in Library"
Problem: Status doesn't update after requesting

Cause: The item might be processing or the title search isn't matching

Solutions:

Click the 🔄 refresh button

Wait for auto-refresh (3-second intervals)

Check your Riven server directly to confirm the request

Settings Dialog Not Appearing
Problem: Can't access configuration

Solutions:

Click Tampermonkey icon → Script name → ⚙️ Riven Settings

Delete and reinstall the script

Clear browser cache and reload

📝 API Endpoints Used
The script interacts with these Riven API endpoints:

GET /api/v1/items - Search library for existing items

POST /api/v1/items/add - Add new media requests

Parameters for adding items:

tmdb_ids - TMDb ID (required if no tvdb_ids)

tvdb_ids - TVDB ID (required if no tmdb_ids)

media_type - Either movie or tv

🛡️ Privacy & Security
API Key Storage: Stored locally using Tampermonkey's GM_setValue (encrypted)

External APIs: Uses public APIs (TMDb, Trakt, TVmaze) for ID lookups

No Data Collection: Script doesn't collect or send any personal data

CORS: Uses GM_xmlhttpRequest to bypass CORS restrictions securely

🤝 Contributing
Contributions are welcome! Here's how you can help:

Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

Development Guidelines
Test on all supported websites before submitting

Add console logging for debugging

Follow existing code style

Update README if adding new features

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

Riven Media - The amazing media management system

Tampermonkey - Userscript manager

TMDb - Movie and TV show database

Trakt - Media tracking service

TVmaze - TV show database

📞 Support
Issues: GitHub Issues

Discussions: GitHub Discussions

Riven Discord: Join Riven Community

🗺️ Roadmap
 Add support for more movie databases

 Implement keyboard shortcuts

 Add notification preferences

 Support for movie collections/series

 Quality profile selection

 Dark/light theme toggle

 Export/import settings

 Multi-language support

📊 Changelog
v2.6 (Current)
Fixed Trakt URL matching for app.trakt.tv subdomain

Enhanced element detection for Letterboxd

Added event propagation fixes for button clicks

Improved title extraction with multiple fallback selectors

v2.5
Added multi-source ID lookup (TMDb, Trakt, TVmaze)

Implemented automatic IMDb to TMDb/TVDB conversion

Enhanced error handling with detailed console logging

v2.4
Added auto-refresh functionality (3-second intervals)

Implemented manual refresh button

Fixed duplicate prevention logic

Made with ❤️ for the Riven community
