#!/bin/bash

# Create lib directory if it doesn't exist
mkdir -p lib

# Install unzip if not available (for Ubuntu/Debian)
if ! command -v unzip &> /dev/null; then
    echo "Installing unzip..."
    sudo apt update
    sudo apt install -y unzip
fi

# 1. Download Mammoth.js for DOCX processing
echo "Downloading Mammoth.js..."
curl -L -o lib/mammoth.min.js https://cdn.jsdelivr.net/npm/mammoth@1.7.0/mammoth.browser.min.js

# 2. Download PDF.js for PDF processing
echo "Downloading PDF.js..."
curl -L -o lib/pdf.min.js https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js
curl -L -o lib/pdf.worker.min.js https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js

# 3. Download FileSaver.js for file saving
echo "Downloading FileSaver.js..."
curl -L -o lib/FileSaver.min.js https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js

# 4. Download jsPDF for PDF generation
echo "Downloading jsPDF..."
curl -L -o lib/jspdf.umd.min.js https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js

# 5. Download html-docx-js for DOCX generation
echo "Downloading html-docx-js..."
curl -L -o lib/html-docx.js https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js

echo "All libraries downloaded successfully!"