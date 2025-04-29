document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const imageUpload = document.getElementById('image-upload');
    const extractBtn = document.getElementById('extract-btn');
    const clearBtn = document.getElementById('clear-btn');
    const preview = document.getElementById('preview');
    const outputText = document.getElementById('output-text');
    const progressBar = document.querySelector('.progress-bar');
    const progressElement = document.getElementById('extraction-progress');
    const boundingBoxes = document.getElementById('bounding-boxes');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const confidenceValue = document.getElementById('confidence-value');
    const confidenceSlider = document.getElementById('min-confidence');
    const confidenceDisplay = document.getElementById('confidence-display');
    const detailLevel = document.getElementById('detail-level');
    const showBoxes = document.getElementById('show-boxes');
    const autoExtract = document.getElementById('auto-extract');
    const languageSelect = document.getElementById('language-select');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const editBtn = document.getElementById('edit-btn');
    const historyItems = document.getElementById('history-items');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.close-modal');
    const aboutLink = document.getElementById('about-link');
    const helpLink = document.getElementById('help-link');

    // State
    let currentImage = null;
    let extractionHistory = JSON.parse(localStorage.getItem('extractionHistory')) || [];
    let isEditing = false;

    // Event Listeners
    imageUpload.addEventListener('change', handleFileSelect);
    extractBtn.addEventListener('click', extractText);
    clearBtn.addEventListener('click', clearAll);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('click', triggerFileSelect);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadText);
    editBtn.addEventListener('click', toggleEditing);
    confidenceSlider.addEventListener('input', updateConfidenceDisplay);
    showBoxes.addEventListener('change', toggleBoundingBoxes);
    aboutLink.addEventListener('click', showAboutModal);
    helpLink.addEventListener('click', showHelpModal);
    closeModal.addEventListener('click', closeModalDialog);

    // Initialize
    updateHistoryDisplay();
    updateConfidenceDisplay();

    // Functions
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    }

    function triggerFileSelect() {
        imageUpload.click();
    }

    function processFile(file) {
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file.', 'error');
            return;
        }

        currentImage = file;
        const reader = new FileReader();

        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);

            // Clear previous results
            outputText.value = '';
            confidenceValue.textContent = '-';
            boundingBoxes.innerHTML = '';

            if (autoExtract.checked) {
                extractText();
            }
        };

        reader.readAsDataURL(file);
    }

    async function extractText() {
        if (!currentImage) {
            showNotification('Please upload an image first.', 'error');
            return;
        }

        // Show progress
        progressBar.style.display = 'block';
        progressElement.style.width = '0%';
        extractBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extracting...';
        extractBtn.disabled = true;

        // Fake progress bar animation
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressElement.style.width = `${progress}%`;
            if (progress >= 90) clearInterval(interval);
        }, 100);

        const formData = new FormData();
        formData.append('image', currentImage);
        formData.append('language', languageSelect.value);
        formData.append('min_confidence', confidenceSlider.value / 100);
        formData.append('detail_level', detailLevel.value);

        try {
            const response = await fetch('/api/extract-text', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract text.');
            }

            // Display extracted text
            outputText.value = data.text;
            confidenceValue.textContent = `${Math.round(data.confidence * 100)}%`;

            if (showBoxes.checked && data.boxes) {
                displayBoundingBoxes(data.boxes);
            }

            addToHistory({
                image: preview.src,
                text: data.text.substring(0, 50) + (data.text.length > 50 ? '...' : ''),
                timestamp: new Date().toISOString(),
                fullText: data.text,
                confidence: data.confidence
            });

        } catch (error) {
            showNotification(`❌ ${error.message}`, 'error');
        } finally {
            clearInterval(interval);
            progressElement.style.width = '100%';
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 500);

            extractBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Text';
            extractBtn.disabled = false;
        }
    }

    function displayBoundingBoxes(boxes) {
        boundingBoxes.innerHTML = '';
        const imageWidth = preview.clientWidth;
        const imageHeight = preview.clientHeight;

        boxes.forEach(box => {
            const boxElement = document.createElement('div');
            boxElement.className = 'bounding-box';
            boxElement.style.left = `${box[0] * imageWidth}px`;
            boxElement.style.top = `${box[1] * imageHeight}px`;
            boxElement.style.width = `${box[2] * imageWidth}px`;
            boxElement.style.height = `${box[3] * imageHeight}px`;
            boundingBoxes.appendChild(boxElement);
        });
    }

    function clearAll() {
        currentImage = null;
        preview.src = '#';
        preview.style.display = 'none';
        outputText.value = '';
        boundingBoxes.innerHTML = '';
        fileName.textContent = 'No file selected';
        fileSize.textContent = '';
        confidenceValue.textContent = '-';
    }

    function copyToClipboard() {
        outputText.select();
        document.execCommand('copy');
        showNotification('Text copied to clipboard', 'success');
    }

    function downloadText() {
        if (!outputText.value) {
            showNotification('No text to download.', 'error');
            return;
        }

        const blob = new Blob([outputText.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted-text.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function toggleEditing() {
        isEditing = !isEditing;
        outputText.readOnly = !isEditing;
        if (isEditing) {
            editBtn.innerHTML = '<i class="fas fa-save"></i>';
            editBtn.title = 'Save changes';
            outputText.focus();
        } else {
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Enable editing';
        }
    }

    function updateConfidenceDisplay() {
        confidenceDisplay.textContent = `${confidenceSlider.value}%`;
    }

    function toggleBoundingBoxes() {
        if (showBoxes.checked) {
            boundingBoxes.style.display = 'block';
        } else {
            boundingBoxes.style.display = 'none';
        }
    }

    function addToHistory(item) {
        extractionHistory.unshift(item);
        if (extractionHistory.length > 10) {
            extractionHistory.pop();
        }
        localStorage.setItem('extractionHistory', JSON.stringify(extractionHistory));
        updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
        historyItems.innerHTML = '';

        if (extractionHistory.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No history yet';
            emptyMsg.style.color = 'var(--secondary-color)';
            historyItems.appendChild(emptyMsg);
            return;
        }

        extractionHistory.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.index = index;
            historyItem.addEventListener('click', () => loadHistoryItem(index));

            const thumb = document.createElement('img');
            thumb.className = 'history-thumb';
            thumb.src = item.image;
            thumb.alt = 'History thumbnail';

            const text = document.createElement('div');
            text.className = 'history-text';
            text.textContent = item.text;

            historyItem.appendChild(thumb);
            historyItem.appendChild(text);
            historyItems.appendChild(historyItem);
        });
    }

    function loadHistoryItem(index) {
        const item = extractionHistory[index];
        preview.src = item.image;
        preview.style.display = 'block';
        outputText.value = item.fullText;
        confidenceValue.textContent = `${Math.round(item.confidence * 100)}%`;

        fileName.textContent = 'Restored image';
        fileSize.textContent = '';
        currentImage = null;
    }

    function showAboutModal() {
        modalBody.innerHTML = `
            <h2><i class="fas fa-info-circle"></i> About</h2>
            <p>This app extracts text from images using EasyOCR technology.</p>
        `;
        openModal();
    }

    function showHelpModal() {
        modalBody.innerHTML = `
            <h2><i class="fas fa-question-circle"></i> Help</h2>
            <p>Upload an image, click 'Extract Text', and get your result!</p>
        `;
        openModal();
    }

    function openModal() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModalDialog() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
});
