document.addEventListener('DOMContentLoaded', () => {
    // Structural DOM References
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');
    const removeBtn = document.getElementById('removeBtn');
    
    const metaBox = document.getElementById('metaBox');
    const metaName = document.getElementById('metaName');
    const metaType = document.getElementById('metaType');
    
    const predictBtn = document.getElementById('predictBtn');
    const trackBtn = document.getElementById('trackBtn');
    
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    
    // Output DOM References
    const viewportPlaceholder = document.getElementById('viewportPlaceholder');
    const viewportLoading = document.getElementById('viewportLoading');
    const outputImage = document.getElementById('outputImage');
    const outputVideoContainer = document.getElementById('outputVideoContainer');
    const outputVideo = document.getElementById('outputVideo');

    let activeFile = null;

    // Base API Endpoint Configuration
    const BASE_URL = 'http://127.0.0.1:8000';

    /* ------------------------------------------------------------- */
    /* Drag & Drop Management Engine                                */
    /* ------------------------------------------------------------- */

    // Trigger input on zone click (preventing bubble loop on remove click)
    dropZone.addEventListener('click', (e) => {
        if (!removeBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFileInversion(e.target.files[0]);
    });

    // Intercept Window dragover defaults
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Stylize Drag States
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    // Handle File Drop
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFileInversion(file);
    });

    /* ------------------------------------------------------------- */
    /* File Processing & UI Mutations                              */
    /* ------------------------------------------------------------- */

    function handleFileInversion(file) {
        if (!file) return;
        activeFile = file;

        // Populate Structural Metadata
        metaName.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
        metaType.textContent = file.type || 'Unknown Node';
        metaBox.classList.remove('hidden');

        // Segment media structures for previewing
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        previewContainer.classList.remove('hidden');

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                videoPreview.classList.add('hidden');
            };
            reader.readAsDataURL(file);

            // Context-aware Action State Mutation
            setButtonState(predictBtn, true);
            setButtonState(trackBtn, false);
        } else if (isVideo) {
            const url = URL.createObjectURL(file);
            videoPreview.src = url;
            videoPreview.classList.remove('hidden');
            imagePreview.classList.add('hidden');
            videoPreview.play();

            setButtonState(predictBtn, false);
            setButtonState(trackBtn, true);
        }
    }

    // Interactive State Reset Button
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetExtractionState();
    });

    function resetExtractionState() {
        activeFile = null;
        fileInput.value = '';
        
        // Clear components
        imagePreview.src = '';
        videoPreview.src = '';
        imagePreview.classList.add('hidden');
        videoPreview.classList.add('hidden');
        previewContainer.classList.add('hidden');
        metaBox.classList.add('hidden');

        // Neutralize actions
        setButtonState(predictBtn, false);
        setButtonState(trackBtn, false);
        
        setMachineState('idle', 'Ready');
        clearOutputViewport();
    }

    function setButtonState(btn, enable) {
        if (enable) {
            btn.classList.remove('disabled');
            btn.removeAttribute('disabled');
        } else {
            btn.classList.add('disabled');
            btn.setAttribute('disabled', 'true');
        }
    }

    function setMachineState(state, text) {
        statusBadge.className = `status-badge state-${state}`;
        statusText.textContent = text;
    }

    function clearOutputViewport() {
        viewportPlaceholder.classList.remove('hidden');
        viewportLoading.classList.add('hidden');
        outputImage.classList.add('hidden');
        outputVideoContainer.classList.add('hidden');
        outputImage.src = '';
        outputVideo.src = '';
    }

    /* ------------------------------------------------------------- */
    /* Asynchronous API Orchestration                              */
    /* ------------------------------------------------------------- */

    predictBtn.addEventListener('click', () => {
        if (!activeFile || predictBtn.hasAttribute('disabled')) return;
        executeInferencePipeline(`${BASE_URL}/predict`, 'image');
    });

    trackBtn.addEventListener('click', () => {
        if (!activeFile || trackBtn.hasAttribute('disabled')) return;
        executeInferencePipeline(`${BASE_URL}/track`, 'video');
    });

    async function executeInferencePipeline(endpoint, mode) {
        // Prepare UI state for computation
        setMachineState('processing', 'Processing');
        viewportPlaceholder.classList.add('hidden');
        outputImage.classList.add('hidden');
        outputVideoContainer.classList.add('hidden');
        viewportLoading.classList.remove('hidden');

        // Formulate request structure
        const formData = new FormData();
        formData.append('file', activeFile);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status}`);
            }

            // Extract application data blob
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Interface Rendering Operations
            viewportLoading.classList.add('hidden');

            if (mode === 'image') {
                outputImage.src = blobUrl;
                outputImage.classList.remove('hidden');
            } else if (mode === 'video') {
                outputVideo.src = blobUrl;
                outputVideoContainer.classList.remove('hidden');
                outputVideo.load();
            }

            setMachineState('success', 'Success');

        } catch (error) {
            console.error('Inference Error Stack:', error);
            setMachineState('error', 'Error');
            
            // Render visible error framework inside the viewport
            viewportLoading.classList.add('hidden');
            viewportPlaceholder.classList.remove('hidden');
            viewportPlaceholder.querySelector('p').innerHTML = `
                <span style="color: var(--error-red); font-weight: 500;">
                    Network Execution Failure
                </span><br>${error.message}
            `;
        }
    }
});