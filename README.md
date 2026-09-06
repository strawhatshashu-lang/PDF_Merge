# PdfMerge Studio

PdfMerge Studio is a modern, privacy-first web application designed for merging, slicing, reordering, and previewing PDF documents entirely in memory. It provides a sleek interface with drag-and-drop file organization, custom page range selection, and instant inline browser PDF previewing.

## Overview

PdfMerge Studio allows users to upload multiple PDF files, customize page selection per document, rearrange file order via drag-and-drop, preview the merged output inside an embedded PDF viewer modal, and download the resulting PDF. All PDF processing takes place in memory on the server using PyPDF, ensuring speed and security without storing temporary files on disk.

## Key Features

- In-Memory PDF Processing: Processes all uploads and merges in memory without writing files to local storage.
- Custom Page Range Selection: Select specific pages or page ranges (for example, 1-3, 5, 7-10) for each uploaded PDF.
- Drag-and-Drop Reordering: Intuitively rearrange document order using draggable file cards or quick action buttons.
- Instant Live PDF Preview: Preview merged documents or individual files directly within an embedded browser viewer modal.
- Document Metadata Inspection: Automatically detects valid PDF structure, total page count, and encryption status upon upload.
- Theme Switcher: Seamlessly toggle between dark and light UI themes with system persistence.
- Single and Multi-File Support: Preview or process individual PDF files as well as multi-document combinations.

## Tech Stack

### Backend
- Python 3.x
- Flask (Web Framework)
- PyPDF (PDF Parsing, Decryption Check, and Merging Engine)
- Werkzeug (WSGI and Secure Utility Functions)

### Frontend
- HTML5 (Semantic Structure)
- Vanilla CSS3 (Custom Design System with CSS Variables, Dark/Light Themes, and Responsive Grid/Flexbox Layouts)
- Vanilla JavaScript ES6+ (Asynchronous Fetch API, DOM Manipulation, HTML5 Drag and Drop API, and Blob URL handling)
- Google Fonts (Outfit and Plus Jakarta Sans Typography)

## Project Structure

```
Merge_pdf/
├── app.py              # Flask server routes and endpoint handlers
├── pdf_utils.py        # PDF manipulation, inspection, and page range parsing utilities
├── test_pdf_app.py     # Unit test suite covering utilities and Flask endpoints
├── requirements.txt    # Python dependencies list
├── static/
│   ├── css/
│   │   └── style.css   # Main design system and responsive application styles
│   └── js/
│       └── app.js      # Frontend application state, drag-and-drop, and preview logic
└── templates/
    └── index.html      # Primary application user interface template
```

## Getting Started

### Prerequisites
- Python 3.8 or higher installed on your system.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/strawhatshashu-lang/PDF_Merge.git
cd PDF_Merge
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://127.0.0.1:5000
```

## Running Tests

To run the automated unit test suite:
```bash
python test_pdf_app.py
```
