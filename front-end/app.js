const camera = document.getElementById("camera");
const canvas = document.getElementById("detectionCanvas");
const uploadedVideo =
    document.getElementById("uploadedVideo");

const uploadCanvas =
    document.getElementById("uploadDetectionCanvas");

const startCameraButton =
    document.getElementById("startCamera");

const snapshotButton =
    document.getElementById("snapshotButton");

const analysisButton =
    document.getElementById("analysisButton");

const snapshot =
    document.getElementById("snapshot");

const snapshotPlaceholder =
    document.getElementById("snapshotPlaceholder");

const cameraMessage =
    document.getElementById("cameraMessage");

const analysisResult =
    document.getElementById("analysisResult");

const analysisStatus =
    document.getElementById("analysisStatus");

const videoUpload =
    document.getElementById("videoUpload");

const uploadMessage =
    document.getElementById("uploadMessage");

const uploadStatus =
    document.getElementById("uploadStatus");

const videoAnalysisButton =
    document.getElementById("videoAnalysisButton");


// Canvas used ONLY for YOLO frame capture
const frameCanvas =
    document.createElement("canvas");

const frameContext =
    frameCanvas.getContext("2d");

// Canvas used ONLY for drawing boxes
const detectionContext =
    canvas.getContext("2d");

const uploadDetectionContext =
    uploadCanvas.getContext("2d");


let stream = null;
let detectionRunning = false;
let detectionBusy = false;

let lastDetectionTime = 0;

let uploadVideoUrl = null;
let uploadDetectionRunning = false;
let uploadDetectionBusy = false;
let lastUploadDetectionTime = 0;

const DETECTION_INTERVAL_MS = 350;
const DETECTION_WIDTH = 640;

// =========================================================
// START CAMERA
// =========================================================

startCameraButton.addEventListener(
    "click",
    async () => {

        try {

            stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: {
                            ideal: 1280
                        },
                        height: {
                            ideal: 720
                        }
                    },
                    audio: false
                });

            camera.srcObject = stream;

            await camera.play();

            cameraMessage.style.display =
                "none";

            startCameraButton.disabled =
                true;

            snapshotButton.disabled =
                false;


            // Set overlay dimensions
            canvas.width =
                camera.videoWidth;

            canvas.height =
                camera.videoHeight;


            // Small resolution for YOLO
            setDetectionFrameSize(camera);


            detectionRunning = true;

            requestAnimationFrame(
                detectionLoop
            );


        } catch (error) {

            console.error(error);

            cameraMessage.textContent =
                "Unable to access camera.";

        }

    }
);


// =========================================================
// DETECTION LOOP
// =========================================================

function detectionLoop(timestamp) {

    if (!detectionRunning) {
        return;
    }


    /*
        Run detection only every 350ms.

        That's roughly:
        1000 / 350 ≈ 2.8 FPS

        The CAMERA itself remains 30 FPS.
    */

    if (
        timestamp - lastDetectionTime > DETECTION_INTERVAL_MS &&
        !detectionBusy
    ) {

        lastDetectionTime =
            timestamp;

        runDetection(
            camera,
            canvas,
            detectionContext,
            () => detectionBusy = true,
            () => detectionBusy = false
        );
    }


    requestAnimationFrame(
        detectionLoop
    );
}


// =========================================================
// SEND LOW-RES FRAME TO YOLO
// =========================================================

async function runDetection(
    source,
    targetCanvas,
    targetContext,
    markBusy,
    markReady
) {

    if (
        !source.videoWidth ||
        !source.videoHeight
    ) {
        return;
    }


    markBusy();


    try {

        setDetectionFrameSize(source);

        // Capture small frame
        frameContext.drawImage(
            source,
            0,
            0,
            frameCanvas.width,
            frameCanvas.height
        );


        const blob =
            await new Promise(resolve => {

                frameCanvas.toBlob(
                    resolve,
                    "image/jpeg",
                    0.65
                );

            });


        const formData =
            new FormData();


        formData.append(
            "file",
            blob,
            "frame.jpg"
        );


        const response =
            await fetch(
                "http://127.0.0.1:8000/detect",
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {
            throw new Error(
                "YOLO request failed"
            );
        }


        const data =
            await response.json();


        drawDetections(
            data.detections,
            data.width,
            data.height,
            targetCanvas,
            targetContext
        );


    } catch (error) {

        console.error(
            "Detection error:",
            error
        );

    } finally {

        markReady();

    }
}


// =========================================================
// DRAW DETECTIONS
// =========================================================

function drawDetections(
    detections,
    sourceWidth,
    sourceHeight,
    targetCanvas = canvas,
    targetContext = detectionContext
) {

    // Clear previous boxes
    targetContext.clearRect(
        0,
        0,
        targetCanvas.width,
        targetCanvas.height
    );


    const scaleX =
        targetCanvas.width / sourceWidth;

    const scaleY =
        targetCanvas.height / sourceHeight;


    detections.forEach(
        detection => {

            const [
                x1,
                y1,
                x2,
                y2
            ] = detection.box;


            const boxX =
                x1 * scaleX;

            const boxY =
                y1 * scaleY;

            const boxWidth =
                (x2 - x1) * scaleX;

            const boxHeight =
                (y2 - y1) * scaleY;


            const confidence =
                (
                    detection.confidence * 100
                ).toFixed(1);


            const label =
               `${detection.class.toUpperCase()} ${confidence}%`;


            // Bounding box
            targetContext.strokeStyle =
                "#38bdf8";

            targetContext.lineWidth = 3;

            targetContext.strokeRect(
                boxX,
                boxY,
                boxWidth,
                boxHeight
            );


            // Label
            targetContext.font =
                "bold 14px Arial";


            const textWidth =
                targetContext
                    .measureText(label)
                    .width;


            targetContext.fillStyle =
                "#38bdf8";


            targetContext.fillRect(
                boxX,
                Math.max(0, boxY - 27),
                textWidth + 14,
                27
            );


            targetContext.fillStyle =
                "#061016";


            targetContext.fillText(
                label,
                boxX + 7,
                Math.max(19, boxY - 8)
            );

        }
    );
}

function setDetectionFrameSize(source) {

    const aspectRatio =
        source.videoHeight / source.videoWidth ||
        9 / 16;

    frameCanvas.width =
        DETECTION_WIDTH;

    frameCanvas.height =
        Math.round(DETECTION_WIDTH * aspectRatio);
}

function setOverlaySize(source, targetCanvas) {

    targetCanvas.width =
        source.videoWidth;

    targetCanvas.height =
        source.videoHeight;
}


// =========================================================
// SNAPSHOT
// =========================================================

snapshotButton.addEventListener(
    "click",
    () => {

        if (!stream) return;

        captureIncidentFromSource(
            camera,
            "Incident captured successfully. Press <strong>AI ANALYSIS</strong> to analyze the image."
        );

    }
);

function captureIncidentFromSource(
    source,
    successMessage
) {

        const snapshotCanvas =
            document.createElement(
                "canvas"
            );


        snapshotCanvas.width =
            source.videoWidth;

        snapshotCanvas.height =
            source.videoHeight;


        const snapshotContext =
            snapshotCanvas.getContext(
                "2d"
            );


        snapshotContext.drawImage(
            source,
            0,
            0,
            snapshotCanvas.width,
            snapshotCanvas.height
        );


        const imageData =
            snapshotCanvas.toDataURL(
                "image/jpeg",
                0.9
            );


        snapshot.src =
            imageData;


        snapshot.style.display =
            "block";


        snapshotPlaceholder.style.display =
            "none";


        analysisButton.disabled =
            false;


        analysisStatus.textContent =
            "READY";


        analysisResult.innerHTML = `
            <p>
                ${successMessage}
            </p>
        `;

}

// =========================================================
// VIDEO UPLOAD
// =========================================================

videoUpload.addEventListener(
    "change",
    () => {

        const file =
            videoUpload.files[0];

        if (!file) {
            return;
        }

        if (uploadVideoUrl) {
            URL.revokeObjectURL(
                uploadVideoUrl
            );
        }

        uploadVideoUrl =
            URL.createObjectURL(file);

        uploadedVideo.src =
            uploadVideoUrl;

        uploadedVideo.load();

        uploadMessage.style.display =
            "none";

        uploadStatus.textContent =
            "LOADED";

        videoAnalysisButton.disabled =
            false;

        uploadDetectionContext.clearRect(
            0,
            0,
            uploadCanvas.width,
            uploadCanvas.height
        );

    }
);

uploadedVideo.addEventListener(
    "loadedmetadata",
    () => {

        uploadedVideo.parentElement.style.aspectRatio =
            `${uploadedVideo.videoWidth} / ${uploadedVideo.videoHeight}`;

        setOverlaySize(
            uploadedVideo,
            uploadCanvas
        );

    }
);

uploadedVideo.addEventListener(
    "play",
    () => {

        uploadDetectionRunning =
            true;

        uploadStatus.textContent =
            "DETECTING";

        requestAnimationFrame(
            uploadDetectionLoop
        );

    }
);

uploadedVideo.addEventListener(
    "pause",
    () => {

        uploadDetectionRunning =
            false;

        uploadStatus.textContent =
            "PAUSED";

    }
);

uploadedVideo.addEventListener(
    "ended",
    () => {

        uploadDetectionRunning =
            false;

        uploadStatus.textContent =
            "COMPLETE";

    }
);

function uploadDetectionLoop(timestamp) {

    if (
        !uploadDetectionRunning ||
        uploadedVideo.paused ||
        uploadedVideo.ended
    ) {
        return;
    }

    if (
        timestamp - lastUploadDetectionTime > DETECTION_INTERVAL_MS &&
        !uploadDetectionBusy
    ) {

        lastUploadDetectionTime =
            timestamp;

        runDetection(
            uploadedVideo,
            uploadCanvas,
            uploadDetectionContext,
            () => uploadDetectionBusy = true,
            () => uploadDetectionBusy = false
        );
    }

    requestAnimationFrame(
        uploadDetectionLoop
    );
}

videoAnalysisButton.addEventListener(
    "click",
    async () => {

        if (
            !uploadedVideo.src ||
            !uploadedVideo.videoWidth
        ) {
            return;
        }

        captureIncidentFromSource(
            uploadedVideo,
            "Uploaded video frame captured. Running <strong>AI ANALYSIS</strong> now."
        );

        await runAIAnalysis(
            "AI is analyzing the uploaded video frame..."
        );

    }
);

// =========================================================
// AI ANALYSIS
// =========================================================

analysisButton.addEventListener(
    "click",
    () => runAIAnalysis(
        "AI is analyzing the incident..."
    )
);

async function runAIAnalysis(loadingMessage) {

    if (!snapshot.src) {
        return;
    }


        analysisButton.disabled = true;
        videoAnalysisButton.disabled = true;

        analysisStatus.textContent =
            "ANALYZING";


        analysisResult.innerHTML = `
            <p>
                ${loadingMessage}
            </p>
        `;


        try {

            // Convert snapshot data URL to Blob
            const response =
                await fetch(snapshot.src);

            const blob =
                await response.blob();


            // Prepare form data
            const formData =
                new FormData();

            formData.append(
                "file",
                blob,
                "incident.jpg"
            );


            // Send to FastAPI
            const aiResponse =
                await fetch(
                    "http://127.0.0.1:8000/analyze",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await aiResponse.json();


            if (!data.success) {
                throw new Error(
                    data.error ||
                    "AI analysis failed"
                );
            }


            // Display result
            analysisStatus.textContent =
                "COMPLETE";


            analysisResult.innerHTML =
                formatAIResponse(
                    data.analysis
                );


        } catch (error) {

            console.error(
                "AI analysis error:",
                error
            );


            analysisStatus.textContent =
                "ERROR";


            analysisResult.innerHTML = `
                <p>
                    ⚠️ Unable to analyze
                    the incident.
                </p>

                <p>
                    ${error.message}
                </p>
            `;


        } finally {

            analysisButton.disabled =
                false;

            videoAnalysisButton.disabled =
                !uploadedVideo.src;

        }

}

function formatAIResponse(text) {

    return text
        .replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        )
        .replace(
            /^(PEOPLE|ENVIRONMENT|POTENTIAL HAZARDS|POSSIBLE CONCERNS|RECOMMENDED ATTENTION)$/gm,
            "<strong class=\"ai-section\">$1</strong>"
        )
        .replace(/\n/g, "<br>");
}
