/* Resort-admin document upload interface. OCR remains unavailable until its backend endpoint is connected. */

/* GLOBAL VARIABLES */

let selectedFile = null;

let verificationInProgress = false;

/* DOM ELEMENTS */

const documentInput = document.getElementById("documentInput");

const uploadWidget = document.getElementById("uploadWidget");

const documentPreview = document.getElementById("documentPreview");

const documentName = document.getElementById("documentName");

const documentType = document.getElementById("documentType");

const previewFileName = document.getElementById("previewFileName");

const previewFileType = document.getElementById("previewFileType");

const previewFileSize = document.getElementById("previewFileSize");

const removeDocumentButton = document.getElementById("removeDocumentButton");

const verifyDocumentButton = document.getElementById("verifyDocumentButton");

const verificationStatus = document.getElementById("verificationStatus");

const resultEmpty = document.getElementById("resultEmpty");

const extractedData = document.getElementById("extractedData");

const resultMessage = document.getElementById("resultMessage");

const resultBadge = document.getElementById("resultBadge");

const ocrFullName = document.getElementById("ocrFullName");

const ocrDocumentType = document.getElementById("ocrDocumentType");

const ocrDocumentNumber = document.getElementById("ocrDocumentNumber");

const ocrBirthDate = document.getElementById("ocrBirthDate");

const ocrExpirationDate = document.getElementById("ocrExpirationDate");

const ocrVerificationResult = document.getElementById("ocrVerificationResult");

const saveVerificationButton = document.getElementById("saveVerificationButton");

const clearVerificationButton = document.getElementById("clearVerificationButton");

const globalSearch = document.getElementById("globalSearch");

/* ALLOWED FILE TYPES */

const allowedFileTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

/* MAXIMUM FILE SIZE */

const maximumFileSize = 10 * 1024 * 1024;

/* LUCIDE ICONS */

function refreshIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}

/* FORMAT FILE SIZE */

function formatFileSize(bytes) {
    if (!bytes) {
        return "0 KB";
    }

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    const megabytes = kilobytes / 1024;

    return `${megabytes.toFixed(2)} MB`;
}

/* GET FILE TYPE LABEL */

function getFileTypeLabel(file) {
    if (!file) {
        return "Unknown";
    }

    if (file.type === "application/pdf") {
        return "PDF";
    }

    if (file.type === "image/jpeg" || file.type === "image/jpg") {
        return "JPG";
    }

    if (file.type === "image/png") {
        return "PNG";
    }

    return "Document";
}

/* VALIDATE FILE */

function validateFile(file) {
    if (!file) {
        return {
            valid: false,
            message: "No document was selected.",
        };
    }

    /*
     * Check file type.
     */

    if (!allowedFileTypes.includes(file.type)) {
        return {
            valid: false,
            message: "Unsupported document format. Please upload a JPG, PNG, or PDF file.",
        };
    }

    /*
     * Check file size.
     */

    if (file.size > maximumFileSize) {
        return {
            valid: false,
            message: "The document is too large. Maximum file size is 10 MB.",
        };
    }

    return {
        valid: true,
        message: "File is valid.",
    };
}

/* SET VERIFICATION STATUS */

function setVerificationStatus(status, text) {
    if (!verificationStatus) {
        return;
    }

    verificationStatus.className = "verification-status";

    verificationStatus.classList.add(status);

    verificationStatus.textContent = text;
}

/* SHOW UPLOAD ERROR */

function showUploadError(message) {
    setVerificationStatus("failed", "Upload Error");

    alert(message);
}

/* HANDLE FILE SELECTION */

function handleFileSelection(file) {
    const validation = validateFile(file);

    if (!validation.valid) {
        showUploadError(validation.message);

        return;
    }

    /*
     * Store selected file.
     */

    selectedFile = file;

    /*
     * Update document information.
     */

    updateDocumentInformation(file);

    /*
     * Show preview section.
     */

    if (uploadWidget) {
        uploadWidget.hidden = true;
    }

    if (documentPreview) {
        documentPreview.hidden = false;
    }

    /*
     * Reset OCR result.
     */

    resetOCRResult();

    /*
     * Set status.
     */

    setVerificationStatus("idle", "Ready to Verify");

    /*
     * Update document preview.
     */

    createDocumentPreview(file);

    refreshIcons();
}

/* UPDATE DOCUMENT INFORMATION */

function updateDocumentInformation(file) {
    const fileType = getFileTypeLabel(file);

    if (documentName) {
        documentName.textContent = file.name;
    }

    if (previewFileName) {
        previewFileName.textContent = file.name;
    }

    if (previewFileType) {
        previewFileType.textContent = fileType;
    }

    if (previewFileSize) {
        previewFileSize.textContent = formatFileSize(file.size);
    }

    if (documentType) {
        documentType.textContent = `${fileType} document selected`;
    }
}

/* CREATE DOCUMENT PREVIEW */

function createDocumentPreview(file) {
    const previewArea = document.querySelector(".preview-area");

    if (!previewArea) {
        return;
    }

    /*
     * Clear existing preview.
     */

    previewArea.innerHTML = "";

    /*
     * Image document.
     */

    if (file.type.startsWith("image/")) {
        const image = document.createElement("img");

        image.className = "document-image-preview";

        image.alt = "Selected document preview";

        const objectURL = URL.createObjectURL(file);

        image.src = objectURL;

        image.onload = function () {
            URL.revokeObjectURL(objectURL);
        };

        previewArea.appendChild(image);
    } else {
        /*
         * PDF document.
         */

        const placeholder = document.createElement("div");

        placeholder.className = "preview-placeholder";

        placeholder.innerHTML = `
      <i data-lucide="file-text"></i>
      <span>PDF document selected</span>
    `;

        previewArea.appendChild(placeholder);

        refreshIcons();
    }
}

/* RESET OCR RESULT */

function resetOCRResult() {
    if (resultEmpty) {
        resultEmpty.hidden = false;
    }

    if (extractedData) {
        extractedData.hidden = true;
    }

    /*
     * Reset displayed result values.
     */

    if (resultMessage) {
        resultMessage.textContent = "Document verified";
    }

    if (resultBadge) {
        resultBadge.className = "result-badge verified";

        resultBadge.textContent = "Verified";
    }

    if (ocrFullName) {
        ocrFullName.textContent = "—";
    }

    if (ocrDocumentType) {
        ocrDocumentType.textContent = "—";
    }

    if (ocrDocumentNumber) {
        ocrDocumentNumber.textContent = "—";
    }

    if (ocrBirthDate) {
        ocrBirthDate.textContent = "—";
    }

    if (ocrExpirationDate) {
        ocrExpirationDate.textContent = "—";
    }

    if (ocrVerificationResult) {
        ocrVerificationResult.textContent = "—";
    }

    if (saveVerificationButton) {
        saveVerificationButton.disabled = true;
    }
}

/* VERIFY DOCUMENT */

function verifyDocument() {
    if (!selectedFile) {
        showUploadError("Please select a document before starting verification.");
        return;
    }

    verificationInProgress = false;
    setVerificationStatus("idle", "Not configured");
    showUploadError("OCR verification is not connected to the server yet.");
}
/* DISPLAY OCR RESULT */

function displayOCRResult(result) {
    if (resultEmpty) {
        resultEmpty.hidden = true;
    }

    if (extractedData) {
        extractedData.hidden = false;
    }

    /*
     * Full Name
     */

    if (ocrFullName) {
        ocrFullName.textContent = result.fullName;
    }

    /*
     * Document Type
     */

    if (ocrDocumentType) {
        ocrDocumentType.textContent = result.documentType;
    }

    /*
     * Document Number
     */

    if (ocrDocumentNumber) {
        ocrDocumentNumber.textContent = result.documentNumber;
    }

    /*
     * Date of Birth
     */

    if (ocrBirthDate) {
        ocrBirthDate.textContent = result.birthDate;
    }

    /*
     * Expiration Date
     */

    if (ocrExpirationDate) {
        ocrExpirationDate.textContent = result.expirationDate;
    }

    /*
     * Verification Status
     */

    if (ocrVerificationResult) {
        ocrVerificationResult.textContent = result.verificationStatus;
    }

    /*
     * Result message.
     */

    if (resultMessage) {
        resultMessage.textContent = "Document verified";
    }

    /*
     * Result badge.
     */

    if (resultBadge) {
        resultBadge.className = "result-badge verified";

        resultBadge.textContent = "Verified";
    }

    /*
     * Enable save button.
     */

    if (saveVerificationButton) {
        saveVerificationButton.disabled = false;
    }

    refreshIcons();
}

/* SAVE VERIFICATION RECORD */

function saveVerificationRecord() {
    if (!selectedFile) {
        alert("No document is currently selected.");

        return;
    }

    /*
     * Prevent saving before verification.
     */

    if (!extractedData || extractedData.hidden) {
        alert("Please verify the document before saving the verification record.");

        return;
    }

    /*
     * Create a frontend record object.
     *
     * This object is structured so it can later
     * be sent to the backend/database.
     */

    const verificationRecord = {
        fileName: selectedFile.name,

        fileType: selectedFile.type,

        fileSize: selectedFile.size,

        guestName: ocrFullName ? ocrFullName.textContent : "",

        documentType: ocrDocumentType ? ocrDocumentType.textContent : "",

        documentNumber: ocrDocumentNumber ? ocrDocumentNumber.textContent : "",

        birthDate: ocrBirthDate ? ocrBirthDate.textContent : "",

        expirationDate: ocrExpirationDate ? ocrExpirationDate.textContent : "",

        verificationStatus: ocrVerificationResult ? ocrVerificationResult.textContent : "",

        savedAt: new Date().toISOString(),
    };

    /*
     * Temporary frontend confirmation.
     */

    console.log("Verification record:", verificationRecord);

    /*
     * Change button appearance.
     */

    const originalButtonText = saveVerificationButton.innerHTML;

    saveVerificationButton.innerHTML = `
    <i data-lucide="check"></i>
    Record Saved
  `;

    saveVerificationButton.disabled = true;

    refreshIcons();

    /*
     * Restore button after feedback.
     */

    setTimeout(function () {
        saveVerificationButton.innerHTML = originalButtonText;

        saveVerificationButton.disabled = false;

        refreshIcons();
    }, 1500);
}

/* REMOVE DOCUMENT */

function removeSelectedDocument() {
    selectedFile = null;

    /*
     * Clear file input.
     */

    if (documentInput) {
        documentInput.value = "";
    }

    /*
     * Show upload widget.
     */

    if (uploadWidget) {
        uploadWidget.hidden = false;
    }

    /*
     * Hide document preview.
     */

    if (documentPreview) {
        documentPreview.hidden = true;
    }

    /*
     * Reset document information.
     */

    if (documentName) {
        documentName.textContent = "No document selected";
    }

    if (documentType) {
        documentType.textContent = "Document preview";
    }

    if (previewFileName) {
        previewFileName.textContent = "—";
    }

    if (previewFileType) {
        previewFileType.textContent = "—";
    }

    if (previewFileSize) {
        previewFileSize.textContent = "—";
    }

    /*
     * Reset result.
     */

    resetOCRResult();

    /*
     * Reset status.
     */

    setVerificationStatus("idle", "Ready");

    refreshIcons();
}

/* CLEAR VERIFICATION */

function clearVerification() {
    if (verificationInProgress) {
        return;
    }

    removeSelectedDocument();
}

/* DRAG AND DROP */

function initializeDragAndDrop() {
    if (!uploadWidget) {
        return;
    }

    /*
     * Prevent browser default behavior.
     */

    ["dragenter", "dragover", "dragleave", "drop"].forEach(function (eventName) {
        uploadWidget.addEventListener(eventName, function (event) {
            event.preventDefault();

            event.stopPropagation();
        });
    });

    /*
     * Highlight upload widget.
     */

    ["dragenter", "dragover"].forEach(function (eventName) {
        uploadWidget.addEventListener(eventName, function () {
            uploadWidget.classList.add("dragover");
        });
    });

    /*
     * Remove highlight.
     */

    ["dragleave", "drop"].forEach(function (eventName) {
        uploadWidget.addEventListener(eventName, function () {
            uploadWidget.classList.remove("dragover");
        });
    });

    /*
     * Handle dropped document.
     */

    uploadWidget.addEventListener("drop", function (event) {
        const files = event.dataTransfer.files;

        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });
}

/* SIDEBAR TOGGLE */

function initializeSidebarToggle() {
    const sidebarToggle = document.querySelector(".sidebar-toggle");

    const sidebar = document.querySelector(".sidebar");

    if (!sidebarToggle || !sidebar) {
        return;
    }

    sidebarToggle.addEventListener("click", function () {
        sidebar.classList.toggle("sidebar-collapsed");
    });
}

/* LOGOUT */

function initializeLogout() {
    const logoutButton = document.querySelector(".logout");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", function (event) {
        event.preventDefault();

        const confirmLogout = confirm("Are you sure you want to logout?");

        if (!confirmLogout) {
            return;
        }

        /*
         * Frontend-only behavior.
         *
         * Actual logout will later be handled
         * by the authentication/backend system.
         */

        console.log("Logout requested.");
    });
}

/* GLOBAL SEARCH */

function initializeGlobalSearch() {
    if (!globalSearch) {
        return;
    }

    globalSearch.addEventListener("input", function () {
        const searchValue = globalSearch.value.trim();

        /*
         * No page-specific global search
         * behavior is required yet.
         *
         * The shared navigation remains
         * independent from OCR processing.
         */

        console.log("Global search:", searchValue);
    });
}

/* FILE INPUT EVENT */

function initializeFileInput() {
    if (!documentInput) {
        return;
    }

    documentInput.addEventListener("change", function () {
        if (documentInput.files && documentInput.files.length > 0) {
            handleFileSelection(documentInput.files[0]);
        }
    });
}

/* VERIFY BUTTON EVENT */

function initializeVerifyButton() {
    if (!verifyDocumentButton) {
        return;
    }

    verifyDocumentButton.addEventListener("click", verifyDocument);
}

/* REMOVE BUTTON EVENT */

function initializeRemoveButton() {
    if (!removeDocumentButton) {
        return;
    }

    removeDocumentButton.addEventListener("click", removeSelectedDocument);
}

/* CLEAR BUTTON EVENT */

function initializeClearButton() {
    if (!clearVerificationButton) {
        return;
    }

    clearVerificationButton.addEventListener("click", clearVerification);
}

/* SAVE BUTTON EVENT */

function initializeSaveButton() {
    if (!saveVerificationButton) {
        return;
    }

    /*
     * Save is initially disabled because
     * no verification has been completed.
     */

    saveVerificationButton.disabled = true;

    saveVerificationButton.addEventListener("click", saveVerificationRecord);
}

/* UPLOAD WIDGET CLICK */

function initializeUploadWidget() {
    if (!uploadWidget) {
        return;
    }

    /*
     * Clicking the widget opens the
     * file selector.
     *
     * Avoid triggering the file selector
     * when clicking the actual label/button.
     */

    uploadWidget.addEventListener("click", function (event) {
        if (event.target.closest(".upload-button")) {
            return;
        }

        if (documentInput) {
            documentInput.click();
        }
    });
}

/* INITIALIZE OCR PAGE */

document.addEventListener("DOMContentLoaded", function () {
    /*
     * Initial OCR state.
     */

    resetOCRResult();

    /*
     * File upload.
     */

    initializeFileInput();

    /*
     * Upload widget.
     */

    initializeUploadWidget();

    /*
     * Drag and drop.
     */

    initializeDragAndDrop();

    /*
     * Verification button.
     */

    initializeVerifyButton();

    /*
     * Remove document.
     */

    initializeRemoveButton();

    /*
     * Clear verification.
     */

    initializeClearButton();

    /*
     * Save verification.
     */

    initializeSaveButton();

    /*
     * Sidebar toggle.
     */

    initializeSidebarToggle();

    /*
     * Logout.
     */

    initializeLogout();

    /*
     * Global search.
     */

    initializeGlobalSearch();

    /*
     * Render all Lucide icons.
     */

    refreshIcons();
});
