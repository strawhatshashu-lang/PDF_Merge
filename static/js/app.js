/**
 * PdfMerge Studio - Interactive Frontend Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let filesState = []; // Array of file objects: { id, file, filename, pageCount, isEncrypted, pageRange }
    let nextId = 1;

    // --- DOM Elements ---
    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    const dropzoneSection = document.getElementById('dropzone-section');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');

    const workspaceSection = document.getElementById('workspace-section');
    const fileListContainer = document.getElementById('file-list');
    const fileCountBadge = document.getElementById('file-count-badge');
    const totalPagesBadge = document.getElementById('total-pages-badge');
    
    const addMoreBtn = document.getElementById('add-more-btn');
    const reverseOrderBtn = document.getElementById('reverse-order-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    const outputFilenameInput = document.getElementById('output-filename');
    const summaryFileCount = document.getElementById('summary-file-count');
    const summaryPageCount = document.getElementById('summary-page-count');
    const previewBtn = document.getElementById('preview-btn');
    const mergeBtn = document.getElementById('merge-btn');

    const processingModal = document.getElementById('processing-modal');
    const modalStateLoading = document.getElementById('modal-state-loading');
    const modalStateSuccess = document.getElementById('modal-state-success');
    const previewSuccessBtn = document.getElementById('preview-success-btn');
    const downloadAgainLink = document.getElementById('download-again-link');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const previewModal = document.getElementById('preview-modal');
    const closePreviewModalBtn = document.getElementById('close-preview-modal-btn');
    const previewFilename = document.getElementById('preview-filename');
    const previewPageInfo = document.getElementById('preview-page-info');
    const previewDownloadBtn = document.getElementById('preview-download-btn');
    const previewExternalBtn = document.getElementById('preview-external-btn');
    const previewLoader = document.getElementById('preview-loader');
    const pdfPreviewIframe = document.getElementById('pdf-preview-iframe');
    const previewFallbackBanner = document.getElementById('preview-fallback-banner');
    const previewFallbackLink = document.getElementById('preview-fallback-link');

    let activePreviewBlobUrl = null;
    let lastMergedBlob = null;
    let lastMergedBlobUrl = null;
    let lastMergedFilename = '';

    const toastContainer = document.getElementById('toast-container');

    // --- Theme Switcher ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        showToast(`Switched to ${newTheme} mode`, 'info');
    });

    // --- File Upload & Drag 'n' Drop ---
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleSelectedFiles(Array.from(files));
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSelectedFiles(Array.from(e.target.files));
            fileInput.value = ''; // reset input
        }
    });

    // --- Process Selected Files ---
    async function handleSelectedFiles(files) {
        const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            showToast('Please select valid PDF files.', 'error');
            return;
        }

        showToast(`Processing ${pdfFiles.length} file(s)...`, 'info');

        // Prepare FormData for /api/inspect
        const formData = new FormData();
        pdfFiles.forEach(f => formData.append('files', f));

        try {
            const response = await fetch('/api/inspect', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                showToast(data.error || 'Failed to inspect files.', 'error');
                return;
            }

            let addedCount = 0;
            data.files.forEach((info, index) => {
                if (info.is_valid) {
                    filesState.push({
                        id: 'file-' + (nextId++),
                        file: pdfFiles[index],
                        filename: info.filename,
                        fileSize: formatFileSize(info.file_size),
                        pageCount: info.page_count,
                        pageRange: '', // default to all pages
                    });
                    addedCount++;
                } else {
                    showToast(`Error loading ${info.filename}: ${info.error}`, 'error');
                }
            });

            if (addedCount > 0) {
                showToast(`Added ${addedCount} PDF file(s).`, 'success');
                updateUI();
            }
        } catch (err) {
            showToast('Network error while inspecting files.', 'error');
            console.error(err);
        }
    }

    // --- UI Update & Rendering ---
    function updateUI() {
        if (filesState.length === 0) {
            workspaceSection.classList.add('hidden');
            return;
        }

        workspaceSection.classList.remove('hidden');
        renderFileList();

        // Update counts
        const count = filesState.length;
        fileCountBadge.textContent = count;
        summaryFileCount.textContent = count;

        const totalPages = calculateEstTotalPages();
        totalPagesBadge.textContent = `${totalPages} total pages`;
        summaryPageCount.textContent = totalPages;
    }

    function renderFileList() {
        fileListContainer.innerHTML = '';

        filesState.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.setAttribute('draggable', 'true');
            card.dataset.index = index;

            card.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="6" r="1"></circle>
                        <circle cx="15" cy="6" r="1"></circle>
                        <circle cx="9" cy="12" r="1"></circle>
                        <circle cx="15" cy="12" r="1"></circle>
                        <circle cx="9" cy="18" r="1"></circle>
                        <circle cx="15" cy="18" r="1"></circle>
                    </svg>
                </div>
                <div class="file-index">#${index + 1}</div>
                <div class="file-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.1 4.89 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"></path>
                        <path d="M14 2V8H20"></path>
                    </svg>
                </div>
                <div class="file-details">
                    <div class="file-name" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
                    <div class="file-meta">
                        <span>${item.fileSize}</span>
                        <span>&bull;</span>
                        <span>${item.pageCount} page(s)</span>
                    </div>
                </div>
                <div class="page-range-wrapper">
                    <label>Pages:</label>
                    <input type="text" 
                           class="page-range-input" 
                           placeholder="All (e.g. 1-3, 5)" 
                           value="${escapeHtml(item.pageRange)}" 
                           data-index="${index}">
                </div>
                <div class="file-card-actions">
                    <button class="btn-icon preview-single" title="Preview this PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon move-up" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </button>
                    <button class="btn-icon move-down" title="Move Down" ${index === filesState.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <button class="btn-icon delete" title="Remove PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;

            // Card Event Listeners
            const pageInput = card.querySelector('.page-range-input');
            pageInput.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                filesState[idx].pageRange = e.target.value;
                totalPagesBadge.textContent = `${calculateEstTotalPages()} total pages`;
                summaryPageCount.textContent = calculateEstTotalPages();
            });

            card.querySelector('.preview-single')?.addEventListener('click', () => {
                showPdfPreview(item.file, item.filename, item.file.size);
            });

            card.querySelector('.delete').addEventListener('click', () => {
                filesState.splice(index, 1);
                showToast('File removed', 'info');
                updateUI();
            });

            card.querySelector('.move-up')?.addEventListener('click', () => {
                if (index > 0) {
                    const temp = filesState[index];
                    filesState[index] = filesState[index - 1];
                    filesState[index - 1] = temp;
                    updateUI();
                }
            });

            card.querySelector('.move-down')?.addEventListener('click', () => {
                if (index < filesState.length - 1) {
                    const temp = filesState[index];
                    filesState[index] = filesState[index + 1];
                    filesState[index + 1] = temp;
                    updateUI();
                }
            });

            // Drag & Drop Reordering for cards
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', index);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingCard = document.querySelector('.file-card.dragging');
                if (draggingCard && draggingCard !== card) {
                    card.style.borderColor = 'var(--accent-primary)';
                }
            });

            card.addEventListener('dragleave', () => {
                card.style.borderColor = 'var(--card-border)';
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.style.borderColor = 'var(--card-border)';
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                if (!isNaN(fromIndex) && fromIndex !== toIndex) {
                    const movedItem = filesState.splice(fromIndex, 1)[0];
                    filesState.splice(toIndex, 0, movedItem);
                    updateUI();
                }
            });

            fileListContainer.appendChild(card);
        });
    }

    // --- Batch Actions ---
    reverseOrderBtn.addEventListener('click', () => {
        filesState.reverse();
        updateUI();
        showToast('File order reversed.', 'info');
    });

    clearAllBtn.addEventListener('click', () => {
        filesState = [];
        updateUI();
        showToast('All files cleared.', 'info');
    });

    // --- PDF Preview & Merge Requests ---
    async function generateMergedPdfBlob(isInline = true) {
        const outputName = outputFilenameInput.value.trim() || 'merged_document';
        const formData = new FormData();
        formData.append('output_filename', outputName);
        if (isInline) {
            formData.append('inline', 'true');
        }

        filesState.forEach((item, idx) => {
            formData.append('files', item.file);
            formData.append(`page_range_${idx}`, item.pageRange || '');
        });

        const response = await fetch('/api/merge', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to generate merged PDF.');
        }

        const blob = await response.blob();
        let finalName = outputName;
        if (!finalName.toLowerCase().endsWith('.pdf')) {
            finalName += '.pdf';
        }
        return { blob, filename: finalName };
    }

    function showPdfPreview(rawBlob, filename, blobSize) {
        const pdfBlob = (rawBlob instanceof Blob && rawBlob.type === 'application/pdf') 
            ? rawBlob 
            : new Blob([rawBlob], { type: 'application/pdf' });

        const blobUrl = window.URL.createObjectURL(pdfBlob);

        if (activePreviewBlobUrl && activePreviewBlobUrl !== blobUrl && activePreviewBlobUrl !== lastMergedBlobUrl) {
            window.URL.revokeObjectURL(activePreviewBlobUrl);
        }
        activePreviewBlobUrl = blobUrl;

        previewFilename.textContent = filename;
        previewPageInfo.textContent = `${formatFileSize(blobSize || pdfBlob.size || 0)}`;

        previewDownloadBtn.href = blobUrl;
        previewDownloadBtn.download = filename;
        previewExternalBtn.href = blobUrl;
        previewFallbackLink.href = blobUrl;

        pdfPreviewIframe.src = 'about:blank';
        setTimeout(() => {
            pdfPreviewIframe.src = blobUrl;
        }, 50);

        previewLoader.classList.add('hidden');
        previewModal.classList.remove('hidden');
        previewModal.setAttribute('aria-hidden', 'false');
    }

    function closePreviewModal() {
        previewModal.classList.add('hidden');
        previewModal.setAttribute('aria-hidden', 'true');
        pdfPreviewIframe.src = 'about:blank';
    }

    previewBtn.addEventListener('click', async () => {
        if (filesState.length < 1) {
            showToast('Please add at least 1 PDF file to preview.', 'warning');
            return;
        }

        // Show preview modal with loader
        previewLoader.classList.remove('hidden');
        previewModal.classList.remove('hidden');
        previewModal.setAttribute('aria-hidden', 'false');

        try {
            const { blob, filename } = await generateMergedPdfBlob(true);
            showPdfPreview(blob, filename, blob.size);
            showToast('PDF Preview generated!', 'success');
        } catch (err) {
            closePreviewModal();
            showToast(err.message || 'Error generating preview.', 'error');
            console.error(err);
        }
    });

    closePreviewModalBtn.addEventListener('click', closePreviewModal);

    previewSuccessBtn.addEventListener('click', () => {
        if (lastMergedBlob) {
            processingModal.classList.add('hidden');
            showPdfPreview(lastMergedBlob, lastMergedFilename, lastMergedBlob.size);
        } else if (lastMergedBlobUrl) {
            processingModal.classList.add('hidden');
            showPdfPreview(lastMergedBlobUrl, lastMergedFilename, 0);
        }
    });

    // --- Merge & Download Request ---
    mergeBtn.addEventListener('click', async () => {
        if (filesState.length < 1) {
            showToast('Please add at least 1 PDF file to merge.', 'warning');
            return;
        }

        // Show loading modal
        processingModal.classList.remove('hidden');
        modalStateLoading.classList.remove('hidden');
        modalStateSuccess.classList.add('hidden');

        try {
            const { blob, filename } = await generateMergedPdfBlob(true);
            
            if (lastMergedBlobUrl) {
                window.URL.revokeObjectURL(lastMergedBlobUrl);
            }
            lastMergedBlob = blob;
            lastMergedBlobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            lastMergedFilename = filename;

            // Auto trigger download
            const a = document.createElement('a');
            a.href = lastMergedBlobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // Set links in success modal
            downloadAgainLink.href = lastMergedBlobUrl;
            downloadAgainLink.download = filename;

            // Show success modal state
            modalStateLoading.classList.add('hidden');
            modalStateSuccess.classList.remove('hidden');
            showToast('PDF merged successfully!', 'success');

        } catch (err) {
            processingModal.classList.add('hidden');
            showToast(err.message || 'An error occurred while communicating with the server.', 'error');
            console.error(err);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        processingModal.classList.add('hidden');
    });

    // Press Escape to close active modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!previewModal.classList.contains('hidden')) {
                closePreviewModal();
            } else if (!processingModal.classList.contains('hidden')) {
                processingModal.classList.add('hidden');
            }
        }
    });

    // --- Helpers ---
    function calculateEstTotalPages() {
        return filesState.reduce((sum, item) => sum + (item.pageCount || 0), 0);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else if (type === 'warning') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
});
