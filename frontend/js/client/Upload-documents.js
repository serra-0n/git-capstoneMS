"use strict";


/* =========================================================
   RESORTHUB - CLIENT UPLOAD DOCUMENTS
   File: js/client/UploadDocuments.js

   DEVELOPMENT MODE

   true:
   - Uses dummy reservation/document data
   - Uploaded files exist only in memory
   - Does NOT perform real OCR
   - Does NOT save files to MySQL/server storage
   - Does NOT use localStorage

   false:
   - Loads records from Express API
   - Uploads documents using FormData
   - Backend performs OCR processing
   - Backend/database becomes the source of truth
   ========================================================= */

const USE_DUMMY_DATA = true;


/* =========================================================
   API ENDPOINTS
   ========================================================= */

const API_ENDPOINTS = {

    clientProfile: "/api/client/profile",

    reservations: "/api/client/reservations",

    documents: "/api/client/documents",

    uploadDocument: "/api/client/documents"

};


/* =========================================================
   DUMMY CLIENT
   ========================================================= */

const DUMMY_CLIENT = {

    id: 1,

    name: "Juan Dela Cruz"

};


/* =========================================================
   DUMMY RESERVATIONS

   Presentation records only.
   ========================================================= */

const DUMMY_RESERVATIONS = [

    {
        id: 105,

        reference: "RES-0105",

        resort_name: "Azure Garden Resort",

        accommodation_name: "Family Room"
    },

    {
        id: 102,

        reference: "RES-0102",

        resort_name: "Palm Breeze Resort",

        accommodation_name: "Standard Room"
    },

    {
        id: 103,

        reference: "RES-0103",

        resort_name: "Serenity Springs Resort",

        accommodation_name: "Deluxe Room"
    }

];


/* =========================================================
   DUMMY DOCUMENTS

   Verification statuses below are sample presentation data.
   The backend should eventually define the actual status.
   ========================================================= */

const DUMMY_DOCUMENTS = [

    {
        id: 701,

        client_id: 1,

        reservation_id: 105,

        reservation_reference: "RES-0105",

        document_type: "valid_id",

        file_name: "valid-id-sample.jpg",

        verification_status: "Pending Verification"
    },

    {
        id: 702,

        client_id: 1,

        reservation_id: 102,

        reservation_reference: "RES-0102",

        document_type: "proof_of_payment",

        file_name: "proof-of-payment-sample.jpg",

        verification_status: "Verified"
    },

    {
        id: 703,

        client_id: 1,

        reservation_id: 103,

        reservation_reference: "RES-0103",

        document_type: "reservation_form",

        file_name: "reservation-form-sample.pdf",

        verification_status: "Pending Verification"
    }

];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const documentState = {

    client: null,

    reservations: [],

    documents: [],

    selectedDocument: null,

    selectedFile: null,

    submitting: false

};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

/* Shared */

const clientApp =
    document.getElementById("clientApp");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const clientProfileButton =
    document.getElementById("clientProfileButton");

const clientDisplayName =
    document.getElementById("clientDisplayName");


/* Form */

const documentUploadForm =
    document.getElementById("documentUploadForm");

const reservationId =
    document.getElementById("reservationId");

const documentType =
    document.getElementById("documentType");

const documentFile =
    document.getElementById("documentFile");

const documentFileUploadArea =
    document.getElementById("documentFileUploadArea");

const selectedDocumentFile =
    document.getElementById("selectedDocumentFile");

const selectedDocumentFileName =
    document.getElementById("selectedDocumentFileName");

const selectedDocumentFileSize =
    document.getElementById("selectedDocumentFileSize");

const removeDocumentFileButton =
    document.getElementById("removeDocumentFileButton");

const documentFormMessage =
    document.getElementById("documentFormMessage");

const submitDocumentButton =
    document.getElementById("submitDocumentButton");


/* Uploaded documents */

const uploadedDocumentList =
    document.getElementById("uploadedDocumentList");

const uploadedDocumentsEmptyState =
    document.getElementById(
        "uploadedDocumentsEmptyState"
    );


/* Detail */

const documentDetailCard =
    document.getElementById("documentDetailCard");

const documentDetailType =
    document.getElementById("documentDetailType");

const documentDetailReservation =
    document.getElementById(
        "documentDetailReservation"
    );

const documentDetailFileName =
    document.getElementById(
        "documentDetailFileName"
    );

const documentDetailStatus =
    document.getElementById(
        "documentDetailStatus"
    );


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeUploadDocumentsPage
);


async function initializeUploadDocumentsPage() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    initializeUploadForm();

    initializeFileInput();

    initializeRemoveFileButton();


    if (USE_DUMMY_DATA) {

        loadDummyData();

        return;
    }


    await loadDocumentDataFromDatabase();
}


/* =========================================================
   DUMMY DATA
   ========================================================= */

function loadDummyData() {

    documentState.client = {
        ...DUMMY_CLIENT
    };


    documentState.reservations =
        DUMMY_RESERVATIONS.map(
            reservation => ({
                ...reservation
            })
        );


    documentState.documents =
        DUMMY_DOCUMENTS.map(
            document => ({
                ...document
            })
        );


    renderClient();

    renderReservations();

    applyReservationFromUrl();

    renderDocuments();
}


/* =========================================================
   DATABASE MODE
   ========================================================= */

async function loadDocumentDataFromDatabase() {

    try {

        await Promise.all([
            loadClientFromApi(),
            loadReservationsFromApi(),
            loadDocumentsFromApi()
        ]);


        renderClient();

        renderReservations();

        applyReservationFromUrl();

        renderDocuments();


    } catch (error) {

        console.error(
            "Unable to load document information:",
            error
        );


        showDocumentMessage(
            "Unable to load document information.",
            "error"
        );
    }
}


/* =========================================================
   CLIENT API
   ========================================================= */

async function loadClientFromApi() {

    const response =
        await fetch(
            API_ENDPOINTS.clientProfile,
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to load client profile."
        );
    }


    const data =
        await response.json();


    documentState.client =
        normalizeClient(data);
}


/* =========================================================
   RESERVATIONS API
   ========================================================= */

async function loadReservationsFromApi() {

    const response =
        await fetch(
            API_ENDPOINTS.reservations,
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to load reservations."
        );
    }


    const data =
        await response.json();


    documentState.reservations =
        normalizeReservations(data);
}


/* =========================================================
   DOCUMENTS API
   ========================================================= */

async function loadDocumentsFromApi() {

    const response =
        await fetch(
            API_ENDPOINTS.documents,
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to load uploaded documents."
        );
    }


    const data =
        await response.json();


    documentState.documents =
        normalizeDocuments(data);
}


/* =========================================================
   NORMALIZE CLIENT
   ========================================================= */

function normalizeClient(data) {

    const client =
        data?.client ||
        data;


    if (
        !client ||
        typeof client !== "object"
    ) {

        return null;
    }


    return {

        id:
            client.id ??
            client.client_id ??
            null,

        name:
            client.name ||
            client.full_name ||
            ""
    };
}


/* =========================================================
   NORMALIZE RESERVATIONS
   ========================================================= */

function normalizeReservations(data) {

    const records =
        Array.isArray(data)
            ? data
            : data?.reservations;


    if (!Array.isArray(records)) {

        return [];
    }


    return records
        .map(normalizeReservation)
        .filter(Boolean);
}


function normalizeReservation(reservation) {

    if (
        !reservation ||
        typeof reservation !== "object"
    ) {

        return null;
    }


    return {

        id:
            reservation.id ??
            reservation.reservation_id ??
            null,

        reference:
            reservation.reference ||
            reservation.reservation_reference ||
            reservation.reference_number ||
            "",

        resort_name:
            reservation.resort_name ||
            "",

        accommodation_name:
            reservation.accommodation_name ||
            ""
    };
}


/* =========================================================
   NORMALIZE DOCUMENTS
   ========================================================= */

function normalizeDocuments(data) {

    const records =
        Array.isArray(data)
            ? data
            : data?.documents;


    if (!Array.isArray(records)) {

        return [];
    }


    return records
        .map(normalizeDocument)
        .filter(Boolean);
}


function normalizeDocument(document) {

    if (
        !document ||
        typeof document !== "object"
    ) {

        return null;
    }


    return {

        id:
            document.id ??
            document.document_id ??
            null,

        client_id:
            document.client_id ??
            null,

        reservation_id:
            document.reservation_id ??
            null,

        reservation_reference:
            document.reservation_reference ||
            document.reference_number ||
            "",

        document_type:
            document.document_type ||
            "",

        file_name:
            document.file_name ||
            document.original_file_name ||
            "",

        verification_status:
            document.verification_status ||
            document.status ||
            "Pending Verification"
    };
}


/* =========================================================
   RENDER CLIENT
   ========================================================= */

function renderClient() {

    if (!clientDisplayName) {

        return;
    }


    clientDisplayName.textContent =
        documentState.client?.name ||
        "Client";
}


/* =========================================================
   RENDER RESERVATIONS
   ========================================================= */

function renderReservations() {

    if (!reservationId) {

        return;
    }


    reservationId.innerHTML = "";


    const placeholder =
        document.createElement("option");


    placeholder.value = "";

    placeholder.textContent =
        "Select reservation";


    reservationId.appendChild(
        placeholder
    );


    documentState.reservations.forEach(
        reservation => {

            const option =
                document.createElement("option");


            option.value =
                String(reservation.id);


            option.textContent =
                createReservationOptionText(
                    reservation
                );


            reservationId.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   RESERVATION OPTION TEXT
   ========================================================= */

function createReservationOptionText(
    reservation
) {

    const parts = [];


    if (reservation.reference) {

        parts.push(
            reservation.reference
        );
    }


    if (reservation.resort_name) {

        parts.push(
            reservation.resort_name
        );
    }


    return parts.join(" - ");
}


/* =========================================================
   PRESELECT RESERVATION FROM URL

   Example:
   UploadDocuments.html?reservation=105
   ========================================================= */

function applyReservationFromUrl() {

    if (!reservationId) {

        return;
    }


    const parameters =
        new URLSearchParams(
            window.location.search
        );


    const requestedReservationId =
        parameters.get(
            "reservation"
        );


    if (!requestedReservationId) {

        return;
    }


    const exists =
        documentState.reservations.some(
            reservation =>
                String(reservation.id) ===
                String(requestedReservationId)
        );


    if (exists) {

        reservationId.value =
            requestedReservationId;
    }
}


/* =========================================================
   RENDER DOCUMENTS
   ========================================================= */

function renderDocuments() {

    if (!uploadedDocumentList) {

        return;
    }


    uploadedDocumentList.innerHTML = "";


    if (
        !Array.isArray(
            documentState.documents
        ) ||
        documentState.documents.length === 0
    ) {

        showDocumentsEmptyState();

        return;
    }


    hideDocumentsEmptyState();


    documentState.documents.forEach(
        documentRecord => {

            const item =
                createDocumentItem(
                    documentRecord
                );


            uploadedDocumentList.appendChild(
                item
            );
        }
    );


    initializeIcons();
}


/* =========================================================
   CREATE DOCUMENT ITEM
   ========================================================= */

function createDocumentItem(
    documentRecord
) {

    const button =
        document.createElement("button");


    button.type = "button";

    button.className =
        "uploaded-document-item";

    button.dataset.documentId =
        String(
            documentRecord.id ?? ""
        );


    /* Icon */

    const iconWrapper =
        document.createElement("span");


    iconWrapper.className =
        "uploaded-document-item-icon";


    const icon =
        document.createElement("i");


    icon.setAttribute(
        "data-lucide",
        getDocumentIcon(
            documentRecord.document_type
        )
    );


    iconWrapper.appendChild(icon);


    /* Content */

    const content =
        document.createElement("div");


    content.className =
        "uploaded-document-item-content";


    const heading =
        document.createElement("div");


    heading.className =
        "uploaded-document-item-heading";


    const title =
        document.createElement("strong");


    title.textContent =
        getDocumentTypeLabel(
            documentRecord.document_type
        );


    const status =
        document.createElement("span");


    status.className =
        `status-badge document-status ${getStatusClass(
            documentRecord.verification_status
        )}`;


    status.textContent =
        documentRecord.verification_status ||
        "—";


    heading.append(
        title,
        status
    );


    /* Meta */

    const meta =
        document.createElement("div");


    meta.className =
        "uploaded-document-item-meta";


    if (
        documentRecord.reservation_reference
    ) {

        const reservationMeta =
            document.createElement("span");


        const reservationIcon =
            document.createElement("i");


        reservationIcon.setAttribute(
            "data-lucide",
            "calendar-days"
        );


        const reservationText =
            document.createElement("span");


        reservationText.textContent =
            documentRecord.reservation_reference;


        reservationMeta.append(
            reservationIcon,
            reservationText
        );


        meta.appendChild(
            reservationMeta
        );
    }


    if (documentRecord.file_name) {

        const fileMeta =
            document.createElement("span");


        const fileIcon =
            document.createElement("i");


        fileIcon.setAttribute(
            "data-lucide",
            "file"
        );


        const fileText =
            document.createElement("span");


        fileText.textContent =
            documentRecord.file_name;


        fileMeta.append(
            fileIcon,
            fileText
        );


        meta.appendChild(
            fileMeta
        );
    }


    content.append(
        heading,
        meta
    );


    button.append(
        iconWrapper,
        content
    );


    button.addEventListener(
        "click",
        () => {

            selectDocument(
                documentRecord.id
            );
        }
    );


    return button;
}


/* =========================================================
   DOCUMENT ICON
   ========================================================= */

function getDocumentIcon(
    type
) {

    switch (type) {

        case "valid_id":

            return "badge-check";


        case "proof_of_payment":

            return "receipt";


        case "reservation_form":

            return "file-text";


        case "other_operational_document":

            return "file";


        default:

            return "file";
    }
}


/* =========================================================
   DOCUMENT TYPE LABEL
   ========================================================= */

function getDocumentTypeLabel(
    type
) {

    switch (type) {

        case "valid_id":

            return "Valid ID";


        case "proof_of_payment":

            return "Proof of Payment";


        case "reservation_form":

            return "Reservation Form";


        case "other_operational_document":

            return "Other Operational Document";


        default:

            return "Document";
    }
}


/* =========================================================
   SELECT DOCUMENT
   ========================================================= */

function selectDocument(
    documentId
) {

    const documentRecord =
        documentState.documents.find(
            item =>
                String(item.id) ===
                String(documentId)
        );


    if (!documentRecord) {

        return;
    }


    documentState.selectedDocument =
        documentRecord;


    updateSelectedDocumentItem(
        documentId
    );


    renderDocumentDetails(
        documentRecord
    );
}


/* =========================================================
   SELECTED DOCUMENT STYLE
   ========================================================= */

function updateSelectedDocumentItem(
    documentId
) {

    const documentItems =
        document.querySelectorAll(
            ".uploaded-document-item"
        );


    documentItems.forEach(
        item => {

            const selected =
                String(
                    item.dataset.documentId
                ) ===
                String(documentId);


            item.classList.toggle(
                "selected",
                selected
            );
        }
    );
}


/* =========================================================
   RENDER DETAILS
   ========================================================= */

function renderDocumentDetails(
    documentRecord
) {

    if (!documentDetailCard) {

        return;
    }


    documentDetailCard.hidden =
        false;


    setText(
        documentDetailType,
        getDocumentTypeLabel(
            documentRecord.document_type
        )
    );


    setText(
        documentDetailReservation,
        documentRecord.reservation_reference
    );


    setText(
        documentDetailFileName,
        documentRecord.file_name
    );


    renderDetailStatus(
        documentRecord.verification_status
    );


    initializeIcons();
}


/* =========================================================
   DETAIL STATUS
   ========================================================= */

function renderDetailStatus(
    status
) {

    if (!documentDetailStatus) {

        return;
    }


    documentDetailStatus.textContent =
        status || "—";


    documentDetailStatus.classList.remove(
        "status-success",
        "status-warning",
        "status-danger",
        "status-info",
        "status-neutral"
    );


    documentDetailStatus.classList.add(
        getStatusClass(status)
    );
}


/* =========================================================
   STATUS PRESENTATION

   These frontend mappings are presentation-only.
   Backend values eventually become the source of truth.
   ========================================================= */

function getStatusClass(
    status
) {

    const normalizedStatus =
        String(status || "")
            .trim()
            .toLowerCase();


    switch (normalizedStatus) {

        case "verified":

            return "status-success";


        case "pending verification":

            return "status-warning";


        case "pending":

            return "status-info";


        case "rejected":

            return "status-danger";


        default:

            return "status-neutral";
    }
}


/* =========================================================
   FILE INPUT
   ========================================================= */

function initializeFileInput() {

    if (!documentFile) {

        return;
    }


    documentFile.addEventListener(
        "change",
        handleFileSelection
    );
}


/* =========================================================
   HANDLE FILE
   ========================================================= */

function handleFileSelection() {

    const file =
        documentFile.files?.[0] ||
        null;


    documentState.selectedFile =
        file;


    if (!file) {

        hideSelectedFile();

        return;
    }


    renderSelectedFile(
        file
    );
}


/* =========================================================
   RENDER SELECTED FILE
   ========================================================= */

function renderSelectedFile(
    file
) {

    if (!selectedDocumentFile) {

        return;
    }


    selectedDocumentFile.hidden =
        false;


    setText(
        selectedDocumentFileName,
        file.name
    );


    setText(
        selectedDocumentFileSize,
        formatFileSize(
            file.size
        )
    );


    initializeIcons();
}


/* =========================================================
   HIDE SELECTED FILE
   ========================================================= */

function hideSelectedFile() {

    documentState.selectedFile =
        null;


    if (selectedDocumentFile) {

        selectedDocumentFile.hidden =
            true;
    }


    if (selectedDocumentFileName) {

        selectedDocumentFileName.textContent =
            "—";
    }


    if (selectedDocumentFileSize) {

        selectedDocumentFileSize.textContent =
            "—";
    }
}


/* =========================================================
   REMOVE FILE
   ========================================================= */

function initializeRemoveFileButton() {

    if (!removeDocumentFileButton) {

        return;
    }


    removeDocumentFileButton.addEventListener(
        "click",
        removeSelectedFile
    );
}


function removeSelectedFile() {

    if (documentFile) {

        documentFile.value = "";
    }


    hideSelectedFile();

    clearDocumentMessage();
}


/* =========================================================
   UPLOAD FORM
   ========================================================= */

function initializeUploadForm() {

    if (!documentUploadForm) {

        return;
    }


    documentUploadForm.addEventListener(
        "submit",
        handleDocumentUpload
    );
}


/* =========================================================
   HANDLE UPLOAD
   ========================================================= */

async function handleDocumentUpload(
    event
) {

    event.preventDefault();


    if (documentState.submitting) {

        return;
    }


    clearDocumentMessage();


    const validationMessage =
        validateDocumentUpload();


    if (validationMessage) {

        showDocumentMessage(
            validationMessage,
            "error"
        );

        return;
    }


    const formData =
        createDocumentFormData();


    if (USE_DUMMY_DATA) {

        uploadDummyDocument(
            formData
        );

        return;
    }


    await uploadDocumentToApi(
        formData
    );
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateDocumentUpload() {

    if (
        !reservationId ||
        !reservationId.value
    ) {

        return "Please select a reservation.";
    }


    if (
        !documentType ||
        !documentType.value
    ) {

        return "Please select a document type.";
    }


    if (!documentState.selectedFile) {

        return "Please select a document file.";
    }


    return "";
}


/* =========================================================
   CREATE FORM DATA
   ========================================================= */

function createDocumentFormData() {

    const formData =
        new FormData();


    formData.append(
        "reservation_id",
        reservationId?.value || ""
    );


    formData.append(
        "document_type",
        documentType?.value || ""
    );


    if (documentState.selectedFile) {

        formData.append(
            "document_file",
            documentState.selectedFile
        );
    }


    return formData;
}


/* =========================================================
   DUMMY UPLOAD

   This does NOT perform OCR.

   The newly uploaded record exists only in memory until
   the page is refreshed.
   ========================================================= */

function uploadDummyDocument(
    formData
) {

    setSubmittingState(true);


    window.setTimeout(
        () => {

            const reservation =
                documentState.reservations.find(
                    item =>
                        String(item.id) ===
                        String(
                            formData.get(
                                "reservation_id"
                            )
                        )
                );


            const file =
                formData.get(
                    "document_file"
                );


            const newDocument = {

                id:
                    createTemporaryDocumentId(),

                client_id:
                    documentState.client?.id ??
                    null,

                reservation_id:
                    reservation?.id ??
                    null,

                reservation_reference:
                    reservation?.reference ||
                    "",

                document_type:
                    formData.get(
                        "document_type"
                    ),

                file_name:
                    file instanceof File
                        ? file.name
                        : "",

                verification_status:
                    "Pending Verification"

            };


            documentState.documents.unshift(
                newDocument
            );


            renderDocuments();


            resetUploadForm();


            showDocumentMessage(
                "Document uploaded for frontend preview. OCR processing and verification have not been performed.",
                "success"
            );


            setSubmittingState(false);

        },
        700
    );
}


/* =========================================================
   TEMPORARY DUMMY ID
   ========================================================= */

function createTemporaryDocumentId() {

    const currentIds =
        documentState.documents
            .map(
                item =>
                    Number(item.id)
            )
            .filter(
                id =>
                    Number.isFinite(id)
            );


    if (currentIds.length === 0) {

        return 1;
    }


    return (
        Math.max(
            ...currentIds
        ) + 1
    );
}


/* =========================================================
   API UPLOAD

   Backend should:
   - receive multipart/form-data
   - store document record
   - store uploaded file
   - perform OCR processing
   - store OCR result / verification information as needed
   ========================================================= */

async function uploadDocumentToApi(
    formData
) {

    setSubmittingState(true);


    try {

        const response =
            await fetch(
                API_ENDPOINTS.uploadDocument,
                {
                    method: "POST",

                    credentials: "include",

                    body: formData
                }
            );


        /*
         * Do not manually set Content-Type here.
         * The browser supplies the multipart boundary.
         */


        if (!response.ok) {

            let errorMessage =
                "Unable to upload document.";


            try {

                const errorData =
                    await response.json();


                if (errorData?.message) {

                    errorMessage =
                        errorData.message;
                }

            } catch (error) {

                /*
                 * Keep default message when response
                 * is not JSON.
                 */
            }


            throw new Error(
                errorMessage
            );
        }


        const data =
            await response.json();


        const uploadedDocument =
            normalizeDocument(
                data?.document ||
                data
            );


        if (uploadedDocument) {

            documentState.documents.unshift(
                uploadedDocument
            );


            renderDocuments();
        }


        resetUploadForm();


        showDocumentMessage(
            data?.message ||
            "Document uploaded successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Document upload error:",
            error
        );


        showDocumentMessage(
            error.message ||
            "Unable to upload document.",
            "error"
        );


    } finally {

        setSubmittingState(false);
    }
}


/* =========================================================
   RESET UPLOAD FORM
   ========================================================= */

function resetUploadForm() {

    if (documentUploadForm) {

        documentUploadForm.reset();
    }


    documentState.selectedFile =
        null;


    hideSelectedFile();


    applyReservationFromUrl();
}


/* =========================================================
   SUBMITTING STATE + LUCIDE EFFECT
   ========================================================= */

function setSubmittingState(
    submitting
) {

    documentState.submitting =
        submitting;


    if (!submitDocumentButton) {

        return;
    }


    submitDocumentButton.disabled =
        submitting;


    submitDocumentButton.classList.toggle(
        "is-loading",
        submitting
    );


    const buttonText =
        submitDocumentButton.querySelector(
            "span"
        );


    if (buttonText) {

        buttonText.textContent =
            submitting
                ? "Uploading..."
                : "Upload Document";
    }
}


/* =========================================================
   FORM MESSAGE
   ========================================================= */

function showDocumentMessage(
    message,
    type = "info"
) {

    if (!documentFormMessage) {

        return;
    }


    const iconName =
        getMessageIcon(type);


    documentFormMessage.innerHTML = "";


    const icon =
        document.createElement("i");


    icon.setAttribute(
        "data-lucide",
        iconName
    );


    const messageText =
        document.createElement("span");


    messageText.textContent =
        message;


    documentFormMessage.append(
        icon,
        messageText
    );


    documentFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    documentFormMessage.classList.add(
        type
    );


    documentFormMessage.hidden =
        false;


    initializeIcons();
}


/* =========================================================
   MESSAGE ICON
   ========================================================= */

function getMessageIcon(
    type
) {

    switch (type) {

        case "success":

            return "circle-check";


        case "error":

            return "circle-alert";


        default:

            return "info";
    }
}


/* =========================================================
   CLEAR MESSAGE
   ========================================================= */

function clearDocumentMessage() {

    if (!documentFormMessage) {

        return;
    }


    documentFormMessage.innerHTML =
        "";


    documentFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    documentFormMessage.hidden =
        true;
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function showDocumentsEmptyState() {

    if (uploadedDocumentList) {

        uploadedDocumentList.hidden =
            true;
    }


    if (uploadedDocumentsEmptyState) {

        uploadedDocumentsEmptyState.hidden =
            false;
    }


    if (documentDetailCard) {

        documentDetailCard.hidden =
            true;
    }


    documentState.selectedDocument =
        null;


    initializeIcons();
}


function hideDocumentsEmptyState() {

    if (uploadedDocumentList) {

        uploadedDocumentList.hidden =
            false;
    }


    if (uploadedDocumentsEmptyState) {

        uploadedDocumentsEmptyState.hidden =
            true;
    }
}


/* =========================================================
   FILE SIZE
   ========================================================= */

function formatFileSize(
    bytes
) {

    const size =
        Number(bytes);


    if (
        !Number.isFinite(size) ||
        size < 0
    ) {

        return "—";
    }


    if (size < 1024) {

        return `${size} B`;
    }


    if (
        size <
        1024 * 1024
    ) {

        return `${(
            size / 1024
        ).toFixed(1)} KB`;
    }


    return `${(
        size /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    element,
    value
) {

    if (!element) {

        return;
    }


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        element.textContent =
            "—";

        return;
    }


    element.textContent =
        String(value);
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function initializeSidebar() {

    if (
        !sidebarToggle ||
        !clientApp
    ) {

        return;
    }


    sidebarToggle.addEventListener(
        "click",
        handleSidebarToggle
    );
}


function handleSidebarToggle() {

    const isMobile =
        window.matchMedia(
            "(max-width: 760px)"
        ).matches;


    if (isMobile) {

        clientApp.classList.toggle(
            "sidebar-mobile-open"
        );

        return;
    }


    clientApp.classList.toggle(
        "sidebar-collapsed"
    );


    const collapsed =
        clientApp.classList.contains(
            "sidebar-collapsed"
        );


    sidebarToggle.setAttribute(
        "aria-expanded",
        String(!collapsed)
    );
}


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

function initializeProfileButton() {

    if (!clientProfileButton) {

        return;
    }


    clientProfileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "Profile.html";
        }
    );
}


/* =========================================================
   LUCIDE ICONS

   Must be called again whenever icons are inserted
   dynamically through JavaScript.
   ========================================================= */

function initializeIcons() {

    if (
        typeof lucide !== "undefined" &&
        typeof lucide.createIcons ===
            "function"
    ) {

        lucide.createIcons();
    }
}