import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "react-hot-toast";
import { FaQrcode, FaCamera, FaKeyboard, FaCheckCircle, FaExclamationTriangle, FaRedo, FaTimesCircle } from "react-icons/fa";
import Navbar from "../../components/layout/Navbar/Navbar";
import Button from "../../components/ui/Button/Button";
import Input from "../../components/ui/Input/Input";
import Loader from "../../components/ui/Loader/Loader";
import { scanCheckIn, manualCheckIn } from "../../services/checkInApi";
import { getEvents } from "../../services/eventApi";
import "./Scanner.css";

const ERROR_MESSAGES = {
    INVALID_QR: "This QR code is invalid or not recognized.",
    CHECKIN_DISABLED: "Check-In is not enabled for this event.",
    NO_ACTIVE_SESSION: "There is currently no active check-in session.",
    SESSION_NOT_FOUND: "Session was not found for this event.",
    PARTICIPANT_NOT_FOUND: "Participant was not found for this event.",
    EVENT_NOT_FOUND: "Event was not found. Please select a valid event.",
    ALREADY_CHECKED_IN: "Participant is already checked in for this session.",
    INVALID_EVENT_ID: "Invalid Event ID provided.",
};

function Scanner() {
    const { qrToken: routeQrToken } = useParams();

    const [mode, setMode] = useState("camera"); // 'camera' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [startingScanner, setStartingScanner] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [scanResult, setScanResult] = useState(null);
    const [lastScanType, setLastScanType] = useState(null); // 'success' | 'warning' | 'error'

    // Manual check-in states
    const [manualForm, setManualForm] = useState({
        eventId: localStorage.getItem("last_event_id") || "",
        participantId: "",
        sessionId: "",
    });

    // Optional event selection for admins
    const [eventsList, setEventsList] = useState([]);
    const [selectedEventObj, setSelectedEventObj] = useState(null);

    const html5QrCodeRef = useRef(null);
    const scannerRegionId = "qr-reader-region";

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        currentUser = null;
    }

    // Load available events to facilitate manual check-in
    useEffect(() => {
        getEvents(1, 100, "all")
            .then((data) => {
                const list = data?.events || [];
                setEventsList(list);

                if (list.length > 0) {
                    const savedId = localStorage.getItem("last_event_id");
                    const matched = list.find((ev) => ev._id === savedId);
                    const active = matched || list[0];
                    setSelectedEventObj(active);

                    const activeSessions = active.checkIn?.sessions || [];
                    const defaultSessionId = activeSessions[0]?.sessionId || "";

                    setManualForm((prev) => ({
                        ...prev,
                        eventId: active._id,
                        sessionId: defaultSessionId,
                    }));
                    localStorage.setItem("last_event_id", active._id);
                } else {
                    setSelectedEventObj(null);
                }
            })
            .catch((err) => {
                console.error("Failed to load events for scanner:", err);
            });
    }, []);

    const handleEventChange = (newEventId) => {
        const found = eventsList.find((ev) => ev._id === newEventId);
        setSelectedEventObj(found || null);
        const defaultSessionId = found?.checkIn?.sessions?.[0]?.sessionId || "";

        setManualForm((prev) => ({
            ...prev,
            eventId: newEventId,
            sessionId: defaultSessionId,
        }));

        if (newEventId) {
            localStorage.setItem("last_event_id", newEventId);
        }
    };

    // Handle token from URL if loaded as /checkin/scan/:qrToken
    useEffect(() => {
        if (routeQrToken) {
            handleScanToken(routeQrToken);
        }
    }, [routeQrToken]);

    const extractToken = (rawText) => {
        if (!rawText) return "";
        const clean = rawText.trim();
        // Check if QR text contains URL like .../checkin/scan/<token>
        if (clean.includes("/checkin/scan/")) {
            const parts = clean.split("/checkin/scan/");
            return parts[1]?.split("?")[0]?.split("/")[0] || clean;
        }
        return clean;
    };

    const handleScanToken = async (rawToken) => {
        if (processing) return;
        const token = extractToken(rawToken);
        if (!token) return;

        try {
            setProcessing(true);
            setScanResult(null);

            const res = await scanCheckIn(token);

            if (res.success) {
                setScanResult({
                    type: "success",
                    title: "Check-In Successful",
                    message: res.message || "Participant checked in successfully.",
                    participant: res.participant,
                    session: res.session,
                    attendance: res.attendance,
                });
                setLastScanType("success");
                toast.success("Check-In Successful!");
            }
        } catch (err) {
            const data = err.response?.data;
            const code = data?.code || "INVALID_QR";
            const userMsg = ERROR_MESSAGES[code] || data?.message || "Failed to process scan.";

            if (code === "ALREADY_CHECKED_IN") {
                setScanResult({
                    type: "warning",
                    title: "Already Checked In",
                    message: userMsg,
                    participant: data?.participant,
                    session: data?.session,
                    attendance: data?.attendance,
                });
                setLastScanType("warning");
                toast.error(userMsg);
            } else {
                setScanResult({
                    type: "error",
                    title: "Check-In Failed",
                    message: userMsg,
                });
                setLastScanType("error");
                toast.error(userMsg);
            }
        } finally {
            setProcessing(false);
        }
    };

    // Camera Lifecycle
    const startScanner = async () => {
        if (startingScanner || scanning) return;
        setCameraError("");
        setScanResult(null);

        try {
            setStartingScanner(true);
            const element = document.getElementById(scannerRegionId);
            if (!element) {
                throw new Error(`HTML Element with id=${scannerRegionId} not found`);
            }

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
            }

            if (html5QrCodeRef.current.isScanning) {
                console.log("Scanner is already scanning.");
                setScanning(true);
                return;
            }

            const config = {
                fps: 10,
                qrbox: { width: 260, height: 260 },
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            };

            await html5QrCodeRef.current.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Stop scanning temporarily after detect to prevent spamming
                    pauseScanner();
                    handleScanToken(decodedText);
                },
                () => {
                    // Scanning in progress...
                }
            );

            setScanning(true);
        } catch (err) {
            console.error("Camera start error:", err);
            let message = "Camera access is unavailable. Use Manual Check-In instead.";

            if (err?.name === "NotAllowedError" || String(err).includes("Permission")) {
                message = "Camera permission was denied. Please grant permission or use Manual Check-In.";
            } else if (err?.name === "NotFoundError" || String(err).includes("NotFound")) {
                message = "No camera found on this device. Use Manual Check-In.";
            } else if (window.isSecureContext === false && window.location.hostname !== "localhost") {
                message = "Camera requires HTTPS in production. Use Manual Check-In.";
            }

            setCameraError(message);
            setScanning(false);
            toast.error(message);
        } finally {
            setStartingScanner(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
            } catch (err) {
                console.error("Camera stop error:", err);
            } finally {
                setScanning(false);
            }
        } else {
            setScanning(false);
        }
    };

    const pauseScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.pause(true);
                }
            } catch (e) {
                // Ignore pause error
            }
        }
    };

    const resumeScanner = async () => {
        if (processing || startingScanner) return;
        setScanResult(null);
        if (html5QrCodeRef.current && scanning) {
            try {
                html5QrCodeRef.current.resume();
            } catch (e) {
                startScanner();
            }
        } else {
            startScanner();
        }
    };

    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try {
                    if (html5QrCodeRef.current.isScanning) {
                        html5QrCodeRef.current.stop().catch(() => {});
                    }
                } catch (e) {}
            }
        };
    }, []);

    // Manual Submit
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (processing) return;

        const trimmedEventId = manualForm.eventId.trim();
        const trimmedParticipantId = manualForm.participantId.trim();
        const trimmedSessionId = manualForm.sessionId.trim();

        if (!trimmedEventId) {
            toast.error("Event is required. Please select or enter an Event.");
            return;
        }

        if (!trimmedParticipantId) {
            toast.error("Participant ID or Email is required.");
            return;
        }

        if (!trimmedSessionId) {
            toast.error("Session is required. Please select or enter a Session ID.");
            return;
        }

        try {
            setProcessing(true);
            setScanResult(null);

            localStorage.setItem("last_event_id", trimmedEventId);

            const res = await manualCheckIn({
                eventId: trimmedEventId,
                participantId: trimmedParticipantId,
                sessionId: trimmedSessionId,
            });

            if (res.success) {
                setScanResult({
                    type: "success",
                    title: "Manual Check-In Successful",
                    message: res.message || "Participant manually checked in successfully.",
                    participant: res.participant,
                    session: res.session,
                    attendance: res.attendance,
                });
                setLastScanType("success");
                toast.success(res.message || "Check-In Successful!");
            }
        } catch (err) {
            const data = err.response?.data;
            const code = data?.code || "ERROR";
            const userMsg = (code && ERROR_MESSAGES[code]) || data?.message || "Failed to process manual check-in.";

            if (code === "ALREADY_CHECKED_IN") {
                setScanResult({
                    type: "warning",
                    title: "Already Checked In",
                    message: userMsg,
                    participant: data?.participant,
                    session: data?.session,
                    attendance: data?.attendance,
                });
                setLastScanType("warning");
                toast.error(userMsg);
            } else {
                setScanResult({
                    type: "error",
                    title: "Manual Check-In Failed",
                    message: userMsg,
                });
                setLastScanType("error");
                toast.error(userMsg);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="scanner-container">
                {/* Header Card */}
                <div className="scanner-header-card">
                    <div className="scanner-title-group">
                        <div className="scanner-icon-circle">
                            <FaQrcode />
                        </div>
                        <div>
                            <h1>ACE Attendance Scanner</h1>
                            <p>Scan participant QR codes or perform manual check-in for active sessions.</p>
                        </div>
                    </div>

                    <div className="mode-toggle">
                        <button
                            className={mode === "camera" ? "mode-btn active" : "mode-btn"}
                            onClick={() => {
                                setMode("camera");
                                setScanResult(null);
                            }}
                        >
                            <FaCamera /> Scan QR
                        </button>
                        <button
                            className={mode === "manual" ? "mode-btn active" : "mode-btn"}
                            onClick={() => {
                                stopScanner();
                                setMode("manual");
                                setScanResult(null);
                            }}
                        >
                            <FaKeyboard /> Manual Entry
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="scanner-content-grid">
                    {/* Left/Scanner Box */}
                    <div className="scanner-panel">
                        <div className="camera-section" style={{ display: mode === "camera" ? "block" : "none" }}>
                            <div className="camera-viewport-wrap">
                                <div id={scannerRegionId} className="qr-viewport"></div>

                                {!scanning && !processing && (
                                    <div className="camera-overlay-placeholder">
                                        <FaCamera className="placeholder-icon" />
                                        <p>Camera is currently idle</p>
                                        <Button onClick={startScanner} disabled={startingScanner}>
                                            {startingScanner ? "Starting Camera..." : "Start Camera"}
                                        </Button>
                                    </div>
                                )}

                                {processing && (
                                    <div className="camera-overlay-processing">
                                        <Loader />
                                        <p>Processing check-in...</p>
                                    </div>
                                )}
                            </div>

                            {cameraError && (
                                <div className="camera-error-banner">
                                    <FaExclamationTriangle />
                                    <span>{cameraError}</span>
                                </div>
                            )}

                            <div className="camera-controls">
                                {scanning ? (
                                    <Button variant="secondary" onClick={stopScanner}>
                                        Stop Camera
                                    </Button>
                                ) : (
                                    <Button onClick={startScanner} disabled={startingScanner}>
                                        {startingScanner ? "Starting Camera..." : "Start Camera"}
                                    </Button>
                                )}

                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        stopScanner();
                                        setMode("manual");
                                    }}
                                >
                                    Use Manual Entry
                                </Button>
                            </div>
                        </div>

                        <div className="manual-section" style={{ display: mode === "manual" ? "block" : "none" }}>
                            <form className="manual-form" onSubmit={handleManualSubmit}>
                                <h2>Manual Check-In</h2>
                                <p className="helper-text">
                                    Support both ACE members (ACE ID) and non-ACE participants (Email).
                                </p>

                                {eventsList.length > 0 ? (
                                    <div className="input-group">
                                        <label>Select Event</label>
                                        <select
                                            value={manualForm.eventId}
                                            onChange={(e) => handleEventChange(e.target.value)}
                                        >
                                            {eventsList.map((ev) => (
                                                <option key={ev._id} value={ev._id}>
                                                    {ev.eventName} ({new Date(ev.eventDate).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <Input
                                        label="Event ID"
                                        placeholder="Paste Event ID (MongoDB ObjectId)"
                                        value={manualForm.eventId}
                                        onChange={(e) =>
                                            setManualForm((prev) => ({
                                                ...prev,
                                                eventId: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                )}

                                <Input
                                    label="Participant ID"
                                    placeholder="Enter ACE ID or Email address"
                                    value={manualForm.participantId}
                                    onChange={(e) =>
                                        setManualForm({
                                            ...manualForm,
                                            participantId: e.target.value,
                                        })
                                    }
                                    required
                                />

                                {selectedEventObj?.checkIn?.sessions?.length > 0 ? (
                                    <div className="input-group">
                                        <label>Select Session</label>
                                        <select
                                            value={manualForm.sessionId}
                                            onChange={(e) =>
                                                setManualForm({
                                                    ...manualForm,
                                                    sessionId: e.target.value,
                                                })
                                            }
                                        >
                                            {selectedEventObj.checkIn.sessions.map((s) => (
                                                <option key={s.sessionId} value={s.sessionId}>
                                                    {s.name} ({s.date} {s.startTime}-{s.endTime})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <Input
                                        label="Session ID"
                                        placeholder="Enter Session ID (e.g. session-1)"
                                        value={manualForm.sessionId}
                                        onChange={(e) =>
                                            setManualForm({
                                                ...manualForm,
                                                sessionId: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                )}

                                <Button type="submit" disabled={processing}>
                                    {processing ? "Checking In..." : "Submit Manual Check-In"}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Right/Result Box */}
                    <div className="result-panel">
                        <h2>Attendance Status</h2>

                        {scanResult ? (
                            <div className={`scan-result-card ${scanResult.type}`}>
                                <div className="result-header">
                                    {scanResult.type === "success" && <FaCheckCircle className="status-icon success" />}
                                    {scanResult.type === "warning" && <FaExclamationTriangle className="status-icon warning" />}
                                    {scanResult.type === "error" && <FaTimesCircle className="status-icon error" />}

                                    <div>
                                        <h3>{scanResult.title}</h3>
                                        <p className="result-msg">{scanResult.message}</p>
                                    </div>
                                </div>

                                {scanResult.participant && (
                                    <div className="participant-info-block">
                                        <div className="info-item">
                                            <span>Participant Name</span>
                                            <strong>{scanResult.participant.name}</strong>
                                        </div>

                                        <div className="info-item">
                                            <span>Member Type</span>
                                            <span className={`member-tag ${scanResult.participant.memberType}`}>
                                                {scanResult.participant.memberType === "ace" ? "ACE Member" : "Non-ACE"}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <span>ACE ID</span>
                                            <strong>{scanResult.participant.aceId || "N/A"}</strong>
                                        </div>

                                        <div className="info-item">
                                            <span>Email</span>
                                            <strong>{scanResult.participant.email}</strong>
                                        </div>
                                    </div>
                                )}

                                {scanResult.session && (
                                    <div className="session-info-block">
                                        <h4>Session Details</h4>
                                        <div className="info-item">
                                            <span>Session Name</span>
                                            <strong>{scanResult.session.name}</strong>
                                        </div>
                                        <div className="info-item">
                                            <span>Date & Time</span>
                                            <strong>
                                                {scanResult.session.date}{" "}
                                                {scanResult.session.startTime
                                                    ? `(${scanResult.session.startTime} - ${scanResult.session.endTime})`
                                                    : ""}
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                {scanResult.attendance && (
                                    <div className="attendance-summary-block">
                                        <h4>Attendance Progress</h4>
                                        <div className="progress-grid">
                                            <div className="progress-box">
                                                <span>Attended</span>
                                                <strong>
                                                    {scanResult.attendance.attendedSessions} / {scanResult.attendance.totalSessions}
                                                </strong>
                                            </div>
                                            <div className="progress-box">
                                                <span>Percentage</span>
                                                <strong>{scanResult.attendance.percentage}%</strong>
                                            </div>
                                            <div className="progress-box">
                                                <span>Eligibility</span>
                                                <strong className={scanResult.attendance.eligible ? "eligible" : "not-eligible"}>
                                                    {scanResult.attendance.eligible ? "Eligible" : "Not Eligible"}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="result-actions">
                                    <Button onClick={resumeScanner} disabled={processing || startingScanner}>
                                        <FaRedo /> Scan Next
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-result-state">
                                <FaQrcode className="empty-icon" />
                                <p>Ready to scan QR codes or submit manual attendance records.</p>
                                <span className="helper-hint">Position the QR code within the camera frame.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Scanner;
