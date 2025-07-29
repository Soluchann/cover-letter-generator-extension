// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

// DOM Elements
const apiProviderSelect = document.getElementById('api-provider');
const apiKeyInput = document.getElementById('api-key');
const resumeInput = document.getElementById('resume');
const jobDescriptionInput = document.getElementById('job-description');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const coverLetterTextarea = document.getElementById('cover-letter');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadTxtBtn = document.getElementById('download-txt');
const downloadDocxBtn = document.getElementById('download-docx');
const statusDiv = document.getElementById('status');
const resumeStatusDiv = document.getElementById('resume-status');

// Global variables
let resumeText = '';
let coverLetterText = '';
let contactInfo = {};

// Load saved data when popup opens
document.addEventListener('DOMContentLoaded', loadSavedData);

// Event Listeners
generateBtn.addEventListener('click', generateCoverLetter);
clearBtn.addEventListener('click', clearAllData);
downloadPdfBtn.addEventListener('click', () => downloadCoverLetter('pdf'));
downloadTxtBtn.addEventListener('click', () => downloadCoverLetter('txt'));
downloadDocxBtn.addEventListener('click', () => downloadCoverLetter('docx'));

// Handle resume file upload
resumeInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    showStatus('Reading resume...', 'loading');
    resumeStatusDiv.textContent = 'Processing resume...';
    const result = await extractTextFromFile(file);
    resumeText = result.text;
    contactInfo = result.contactInfo;
    
    // Save resume data
    saveData();
    
    showStatus('Resume loaded successfully!', 'success');
    resumeStatusDiv.textContent = `Resume loaded: ${file.name} (${Math.round(file.size/1024)}KB)`;
  } catch (error) {
    showStatus('Error reading resume: ' + error.message, 'error');
    resumeStatusDiv.textContent = 'Error loading resume';
    console.error('Error reading resume:', error);
  }
});

// Save data to localStorage
function saveData() {
  const data = {
    apiProvider: apiProviderSelect.value,
    apiKey: apiKeyInput.value,
    jobDescription: jobDescriptionInput.value,
    resumeText: resumeText,
    coverLetter: coverLetterTextarea.value,
    contactInfo: contactInfo,
    timestamp: new Date().toISOString()
  };
  
  try {
    localStorage.setItem('coverLetterGeneratorData', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving ', error);
  }
}

// Load saved data from localStorage
function loadSavedData() {
  try {
    const savedData = localStorage.getItem('coverLetterGeneratorData');
    if (savedData) {
      const data = JSON.parse(savedData);
      
      // Restore form values
      if (data.apiProvider) apiProviderSelect.value = data.apiProvider;
      if (data.apiKey) apiKeyInput.value = data.apiKey;
      if (data.jobDescription) jobDescriptionInput.value = data.jobDescription;
      if (data.coverLetter) coverLetterTextarea.value = data.coverLetter;
      
      // Restore processed data
      if (data.resumeText) resumeText = data.resumeText;
      if (data.contactInfo) contactInfo = data.contactInfo;
      if (data.coverLetter) coverLetterText = data.coverLetter;
      
      // Update UI
      if (resumeText) {
        resumeStatusDiv.textContent = `Resume loaded from previous session`;
      }
      
      showStatus('Previous session data loaded', 'success');
    }
  } catch (error) {
    console.error('Error loading saved ', error);
  }
}

// Clear all saved data
function clearAllData() {
  if (confirm('Are you sure you want to clear all saved data?')) {
    localStorage.removeItem('coverLetterGeneratorData');
    apiProviderSelect.value = 'openai';
    apiKeyInput.value = '';
    jobDescriptionInput.value = '';
    coverLetterTextarea.value = '';
    resumeInput.value = '';
    resumeText = '';
    coverLetterText = '';
    contactInfo = {};
    resumeStatusDiv.textContent = '';
    showStatus('All data cleared', 'success');
  }
}

// Auto-save when inputs change
apiProviderSelect.addEventListener('change', saveData);
apiKeyInput.addEventListener('input', saveData);
jobDescriptionInput.addEventListener('input', saveData);
coverLetterTextarea.addEventListener('input', saveData);

// Extract text from different file types
async function extractTextFromFile(file) {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx')) {
    return extractTextFromDOCX(file);
  } else if (fileName.endsWith('.txt')) {
    return extractTextFromTXT(file);
  } else {
    throw new Error('Unsupported file type');
  }
}

// Extract text from PDF
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }
    
    const contactInfo = extractContactInfo(text);
    return { text, contactInfo };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

// Extract text from DOCX
function extractTextFromDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const contactInfo = extractContactInfo(result.value);
        resolve({ text: result.value, contactInfo });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Extract text from TXT
function extractTextFromTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const contactInfo = extractContactInfo(text);
      resolve({ text, contactInfo });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Extract contact information from text
function extractContactInfo(text) {
  const contactInfo = {};
  
  // Extract name (first line that looks like a name)
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length > 0) {
    contactInfo.name = lines[0].trim();
  }
  
  // Extract phone number
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    contactInfo.phone = phoneMatch[0].trim();
  }
  
  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    contactInfo.email = emailMatch[0].trim();
  }
  
  // Extract LinkedIn (simplified)
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    contactInfo.linkedin = 'https://www.' + linkedinMatch[0].trim();
  } else if (text.toLowerCase().includes('linkedin')) {
    contactInfo.linkedin = 'LinkedIn Profile';
  }
  
  // Extract address (simplified)
  const addressRegex = /[A-Za-z\s]+,\s[A-Z]{2}(,\s[A-Z]{2})?\s*\d{5}/;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    contactInfo.address = addressMatch[0].trim();
  } else {
    // Fallback for international addresses
    const locationIndicators = ['Hyderabad', 'Chennai', 'Bangalore', 'Mumbai', 'Delhi'];
    for (const location of locationIndicators) {
      if (text.includes(location)) {
        contactInfo.address = location;
        break;
      }
    }
  }
  
  return contactInfo;
}

// Generate cover letter using selected LLM API
async function generateCoverLetter() {
  const provider = apiProviderSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const jobDescription = jobDescriptionInput.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter your API key', 'error');
    return;
  }
  
  if (!resumeText) {
    showStatus('Please upload your resume', 'error');
    return;
  }
  
  if (!jobDescription) {
    showStatus('Please enter a job description', 'error');
    return;
  }
  
  try {
    showStatus('Generating cover letter...', 'loading');
    generateBtn.disabled = true;
    
    // Get current date in format: January 1, 2024
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const prompt = `
      You are a professional cover letter writer. Using the provided resume and job description, 
      create a compelling cover letter that highlights the candidate's relevant skills and experiences.
      
      Important formatting instructions:
      1. Structure the cover letter properly with the candidate's contact information at the top
      2. Use the candidate's actual name, phone, email, and address from their resume
      3. Use the current date: ${currentDate}
      4. Do NOT use markdown or "--" in the response
      5. Format as a proper business letter with correct structure:
         - Contact info at top (name, address, phone, email, LinkedIn)
         - Date
         - Recipient address (use company from job description)
         - Salutation
         - Body paragraphs
         - Closing
         - Signature line with name
      6. DO NOT repeat contact information at the end
      7. Make sure the cover letter flows naturally and professionally
      8. Keep the cover letter concise - approximately 3-4 paragraphs total
      9. Focus on the most relevant experiences and skills
      10. Use clear, professional language
      
      Resume:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Contact Information from Resume:
      Name: ${contactInfo.name || 'Not provided'}
      Address: ${contactInfo.address || 'Not provided'}
      Phone: ${contactInfo.phone || 'Not provided'}
      Email: ${contactInfo.email || 'Not provided'}
      LinkedIn: ${contactInfo.linkedin || 'Not provided'}
      
      Cover Letter:
    `;
    
    let response;
    switch(provider) {
      case 'openai':
        response = await callOpenAI(prompt, apiKey);
        break;
      case 'anthropic':
        response = await callAnthropic(prompt, apiKey);
        break;
      case 'gemini':
        response = await callGemini(prompt, apiKey);
        break;
      case 'mistral':
        response = await callMistral(prompt, apiKey);
        break;
      default:
        throw new Error('Unsupported API provider');
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.message || 'API request failed');
    }
    
    const data = await response.json();
    let generatedText = '';
    
    // Extract text based on provider
    switch(provider) {
      case 'openai':
        generatedText = data.choices[0].message.content.trim();
        break;
      case 'anthropic':
        generatedText = data.content[0].text.trim();
        break;
      case 'gemini':
        generatedText = data.candidates[0].content.parts[0].text.trim();
        break;
      case 'mistral':
        generatedText = data.choices[0].message.content.trim();
        break;
    }
    
    coverLetterText = generatedText;
    coverLetterTextarea.value = coverLetterText;
    
    // Save the generated cover letter
    saveData();
    
    showStatus('Cover letter generated successfully!', 'success');
  } catch (error) {
    showStatus('Error generating cover letter: ' + error.message, 'error');
    console.error('Error generating cover letter:', error);
  } finally {
    generateBtn.disabled = false;
  }
}

// API calling functions
async function callOpenAI(prompt, apiKey) {
  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
}

async function callAnthropic(prompt, apiKey) {
  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
}

async function callGemini(prompt, apiKey) {
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
}

async function callMistral(prompt, apiKey) {
  return await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-tiny',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
}

// Download cover letter in specified format
function downloadCoverLetter(format) {
  if (!coverLetterText) {
    showStatus('Please generate a cover letter first', 'error');
    return;
  }
  
  try {
    switch (format) {
      case 'pdf':
        downloadAsPDF(coverLetterText);
        break;
      case 'txt':
        downloadAsTXT(coverLetterText);
        break;
      case 'docx':
        downloadAsDOCX(coverLetterText);
        break;
      default:
        throw new Error('Unsupported format');
    }
    
    showStatus(`Cover letter downloaded as ${format.toUpperCase()}`, 'success');
  } catch (error) {
    showStatus(`Error downloading ${format.toUpperCase()}: ${error.message}`, 'error');
    console.error(`Error downloading ${format.toUpperCase()}:`, error);
  }
}

// Download as PDF (one page, Arial font)
function downloadAsPDF(text) {
  const { jsPDF } = window.jspdf;
  // Create a one-page PDF with smaller margins and font size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });
  
  // Set Arial font (or fallback to Helvetica)
  doc.setFont('Arial', 'normal');
  
  // Set smaller font size to fit content on one page
  doc.setFontSize(10);
  
  // Split text to fit within page margins
  const lines = doc.splitTextToSize(text, 500); // 500pt width for letter size (612pt) with margins
  
  // Calculate how many lines can fit on one page
  const lineHeight = 12; // Line height in points
  const marginTop = 50;
  const marginBottom = 50;
  const availableHeight = 792 - marginTop - marginBottom; // Letter height is 792pt
  const maxLines = Math.floor(availableHeight / lineHeight);
  
  // Take only the lines that fit on one page
  const linesToPrint = lines.slice(0, maxLines);
  
  // Add lines to document
  let y = marginTop;
  linesToPrint.forEach((line, index) => {
    if (y < (792 - marginBottom)) {
      doc.text(line, 56, y); // 56pt left margin
      y += lineHeight;
    }
  });
  
  doc.save('cover-letter.pdf');
}

// Download as TXT
function downloadAsTXT(text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'cover-letter.txt');
}

// Download as DOCX (one page, Arial font)
function downloadAsDOCX(text) {
  // Create HTML content with Arial font and styling to fit on one page
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: letter portrait;
          margin: 0.75in;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.15;
          margin: 0;
          padding: 0;
        }
        p {
          margin: 0 0 10pt 0;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      ${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
    </body>
    </html>
  `;
  
  // Convert to DOCX
  const converted = htmlDocx.asBlob(htmlContent, {
    orientation: 'portrait',
    margins: {
      top: 720,    // 720 TWIPs = 0.5 inches
      right: 720,
      bottom: 720,
      left: 720
    }
  });
  
  saveAs(converted, 'cover-letter.docx');
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status-' + type;
}