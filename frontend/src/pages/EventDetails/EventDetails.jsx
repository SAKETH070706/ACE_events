import "./EventDetails.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FaQrcode, FaDownload, FaTimes, FaPlus, FaTrash, FaSearch, FaCheck, FaSync } from "react-icons/fa";
import TemplateEditor from "../../components/TemplateEditor/TemplateEditor";
import EmailTemplateEditor from "../../components/email/EmailTemplateEditor";
import Navbar from "../../components/layout/Navbar/Navbar";
import Button from "../../components/ui/Button/Button";
import Input from "../../components/ui/Input/Input";
import { generatePreview } from "../../services/templateApi";
import { getEventById, updateEventSettings } from "../../services/eventApi";
import { previewParticipants, runAutomation } from "../../services/automationApi";
import {
    previewRecipients,
    saveMarketingTemplate,
    sendMarketingEmails,
    sendTestMarketingEmail,
} from "../../services/marketingApi";
import {
    configureCheckIn,
    initializeCheckIn,
    getEventCheckIns,
    getParticipantQr,
} from "../../services/checkInApi";
import Loader from "../../components/ui/Loader/Loader";
import { buildPreviewVariables } from "../../utils/templates";

const PRE_VARIABLES = [
    { key: "recipientName", label: "Recipient Name" },
    { key: "eventName", label: "Event Name" },
    { key: "eventDate", label: "Event Date" },
    { key: "eventTime", label: "Event Time" },
    { key: "venue", label: "Venue" },
    { key: "description", label: "Description" },
    { key: "registrationLink", label: "Registration Link" },
];

const POST_VARIABLES = [
    { key: "participantName", label: "Participant Name" },
    { key: "eventName", label: "Event Name" },
    { key: "eventDate", label: "Event Date" },
    { key: "venue", label: "Venue" },
    { key: "certificateName", label: "Certificate Name" },
];

function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [running, setRunning] = useState(false);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [activePhase, setActivePhase] = useState("pre");

    // Pre-Event States
    const [recipientSource, setRecipientSource] = useState("googleSheet");
    const [googleFormUrl, setGoogleFormUrl] = useState("");
    const [googleSheetUrl, setGoogleSheetUrl] = useState("");
    const [recipientFile, setRecipientFile] = useState(null);
    const [recipientCount, setRecipientCount] = useState(0);
    const [recipientPreview, setRecipientPreview] = useState([]);
    const [recipientError, setRecipientError] = useState("");
    const [marketingSubject, setMarketingSubject] = useState("");
    const [marketingHtml, setMarketingHtml] = useState("");
    const [testEmail, setTestEmail] = useState("");
    const [sendingMarketing, setSendingMarketing] = useState(false);
    const [savingMarketing, setSavingMarketing] = useState(false);
    const [sendingTestEmail, setSendingTestEmail] = useState(false);
    const [loadingRecipientPreview, setLoadingRecipientPreview] = useState(false);
    const [preStep, setPreStep] = useState("recipients");

    // Post-Event States
    const [participantSource, setParticipantSource] = useState("googleSheet");
    const [participantFile, setParticipantFile] = useState(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [participantPreview, setParticipantPreview] = useState([]);
    const [participantError, setParticipantError] = useState("");
    const [certificateSubject, setCertificateSubject] = useState("");
    const [certificateHtml, setCertificateHtml] = useState("");
    const [loadingParticipantPreview, setLoadingParticipantPreview] = useState(false);
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const [postStep, setPostStep] = useState("participants");

    // Check-In States
    const [checkInStep, setCheckInStep] = useState("config");
    const [checkInEnabled, setCheckInEnabled] = useState(false);
    const [checkInAttendanceRequired, setCheckInAttendanceRequired] = useState(75);
    const [checkInParticipantSource, setCheckInParticipantSource] = useState("csv");
    const [checkInGoogleFormUrl, setCheckInGoogleFormUrl] = useState("");
    const [checkInGoogleSheetUrl, setCheckInGoogleSheetUrl] = useState("");
    const [checkInSessions, setCheckInSessions] = useState([]);
    const [savingCheckInConfig, setSavingCheckInConfig] = useState(false);

    // New Session Form State
    const [newSession, setNewSession] = useState({
        sessionId: "",
        name: "",
        date: "",
        startTime: "09:00",
        endTime: "12:00",
    });

    // Check-In Initialization State
    const [checkInInitFile, setCheckInInitFile] = useState(null);
    const [initializingCheckIn, setInitializingCheckIn] = useState(false);
    const [checkInInitResult, setCheckInInitResult] = useState(null);

    // Check-In Records State
    const [checkInRecords, setCheckInRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [recordsSearch, setRecordsSearch] = useState("");
    const [selectedQrParticipant, setSelectedQrParticipant] = useState(null);
    const [qrImageUrl, setQrImageUrl] = useState("");
    const [loadingQr, setLoadingQr] = useState(false);

    const automationStatus = event?.automation?.status;

    const displayStatus =
        automationStatus === "Running"
            ? "Processing"
            : automationStatus === "Completed"
            ? "Completed"
            : automationStatus === "Failed"
            ? "Partially Completed"
            : event?.status || "Draft";

    const fetchEvent = async () => {
        try {
            setLoading(true);
            const data = await getEventById(id);
            setEvent(data.event);
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to load event."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (event?.automation?.status !== "Running") return;
        const interval = setInterval(() => {
            fetchEvent();
        }, 2000);
        return () => clearInterval(interval);
    }, [event?.automation?.status]);

    useEffect(() => {
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!event) return;

        // Pre-event init
        setRecipientSource(event.preEvent?.recipientSource || "googleSheet");
        setGoogleFormUrl(event.preEvent?.sourceConfig?.googleFormUrl || event.googleForm?.url || "");
        setGoogleSheetUrl(event.preEvent?.sourceConfig?.googleSheetUrl || event.googleSheet?.url || "");
        setMarketingSubject(event.preEvent?.emailTemplate?.subject || "");
        setMarketingHtml(event.preEvent?.emailTemplate?.html || "");

        // Post-event init
        setParticipantSource(event.postEvent?.participantSource || "googleSheet");
        setCertificateSubject(event.postEvent?.certificateEmailTemplate?.subject || "");
        setCertificateHtml(event.postEvent?.certificateEmailTemplate?.html || "");
        setRecipientCount(event.preEvent?.totalRecipients || 0);
        setParticipantCount(event.postEvent?.totalRecipients || 0);

        // Check-in init
        setCheckInEnabled(event.checkIn?.enabled || false);
        setCheckInAttendanceRequired(event.checkIn?.attendanceRequired ?? 75);
        setCheckInParticipantSource(event.checkIn?.participantSource || "csv");
        setCheckInGoogleFormUrl(event.checkIn?.sourceConfig?.googleFormUrl || event.googleForm?.url || "");
        setCheckInGoogleSheetUrl(event.checkIn?.sourceConfig?.googleSheetUrl || event.googleSheet?.url || "");
        setCheckInSessions(event.checkIn?.sessions || []);

        if (event.eventDate) {
            const eventDateStr = new Date(event.eventDate).toISOString().slice(0, 10);
            setNewSession((prev) => ({
                ...prev,
                date: prev.date || eventDateStr,
                sessionId: prev.sessionId || `session-${(event.checkIn?.sessions?.length || 0) + 1}`,
            }));
        }

        const preEnabled = event.workflow?.preEvent !== false;
        const postEnabled = event.workflow?.postEvent !== false;
        setActivePhase(preEnabled ? "pre" : "checkin");
    }, [event?._id]);

    // Load Check-In records when switching to check-in phase or records step
    const fetchRecords = async () => {
        if (!event?._id || loadingRecords) return;
        try {
            setLoadingRecords(true);
            const data = await getEventCheckIns(event._id);
            setCheckInRecords(data.checkIns || []);
        } catch (error) {
            // Check-in might not be initialized yet
            setCheckInRecords([]);
        } finally {
            setLoadingRecords(false);
        }
    };

    useEffect(() => {
        if (activePhase === "checkin" && checkInStep === "records") {
            fetchRecords();
        }
    }, [activePhase, checkInStep]);

    const preEnabled = event?.workflow?.preEvent !== false;
    const postEnabled = event?.workflow?.postEvent !== false;

    const previewVars = useMemo(
        () => buildPreviewVariables(event || {}),
        [event]
    );

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="event-details-container">
                    <Loader />
                </div>
            </>
        );
    }

    // Automation Handler
    const handleAutomation = async () => {
        if (running) return;
        if (!window.confirm("Start certificate automation?")) return;

        try {
            setRunning(true);
            toast.loading("Generating certificates...", { id: "automation" });

            await updateEventSettings(event._id, {
                participantSource,
                certificateEmailSubject: certificateSubject,
                certificateEmailHtml: certificateHtml,
            });

            const formData = new FormData();
            formData.append("participantSource", participantSource);
            if (participantFile) {
                formData.append("file", participantFile);
            }

            const res = await runAutomation(event._id, formData);
            await fetchEvent();
            toast.success(
                `Automation Completed\n\nProcessed: ${res.result.processed}/${res.result.total}\nSent: ${res.result.sent}\nFailed: ${res.result.failed}`,
                { id: "automation" }
            );
        } catch (err) {
            toast.error(err.response?.data?.message || "Automation failed", {
                id: "automation",
            });
        } finally {
            setRunning(false);
        }
    };

    const automationFinished = automationStatus === "Completed";

    const handlePreview = async () => {
        if (generatingPreview || !event.template?.url) return;
        try {
            setGeneratingPreview(true);
            const blob = await generatePreview({
                eventId: event._id,
            });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (err) {
            toast.error("Failed to generate preview");
        } finally {
            setGeneratingPreview(false);
        }
    };

    const handleRecipientPreview = async () => {
        if (loadingRecipientPreview) return;
        setRecipientError("");
        try {
            setLoadingRecipientPreview(true);
            const formData = new FormData();
            formData.append("recipientSource", recipientSource);
            formData.append("googleFormUrl", googleFormUrl);
            formData.append("googleSheetUrl", googleSheetUrl);
            if (recipientFile) formData.append("file", recipientFile);

            const result = await previewRecipients(event._id, formData);
            setRecipientCount(result.total);
            setRecipientPreview(result.recipients || []);
            toast.success(`${result.total} valid recipients found.`);
        } catch (error) {
            const message = error.response?.data?.message || "Failed to load recipients.";
            setRecipientError(message);
            setRecipientPreview([]);
            toast.error(message);
        } finally {
            setLoadingRecipientPreview(false);
        }
    };

    const handleSaveMarketing = async () => {
        if (savingMarketing) return;
        try {
            setSavingMarketing(true);
            await saveMarketingTemplate(event._id, {
                recipientSource,
                googleFormUrl,
                googleSheetUrl,
                subject: marketingSubject,
                html: marketingHtml,
            });
            toast.success("Marketing template saved.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save template.");
        } finally {
            setSavingMarketing(false);
        }
    };

    const handleTestEmail = async () => {
        if (sendingTestEmail || savingMarketing || sendingMarketing) return;
        try {
            setSendingTestEmail(true);
            await saveMarketingTemplate(event._id, {
                recipientSource,
                googleFormUrl,
                googleSheetUrl,
                subject: marketingSubject,
                html: marketingHtml,
            });
            await sendTestMarketingEmail(event._id, testEmail);
            toast.success("Test email sent.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send test email.");
        } finally {
            setSendingTestEmail(false);
        }
    };

    const handleSendMarketing = async () => {
        if (sendingMarketing || savingMarketing) return;
        if (!window.confirm("Send marketing emails to all valid recipients?")) return;

        try {
            setSendingMarketing(true);
            await saveMarketingTemplate(event._id, {
                recipientSource,
                googleFormUrl,
                googleSheetUrl,
                subject: marketingSubject,
                html: marketingHtml,
            });

            const formData = new FormData();
            formData.append("recipientSource", recipientSource);
            formData.append("googleFormUrl", googleFormUrl);
            formData.append("googleSheetUrl", googleSheetUrl);
            if (recipientFile) formData.append("file", recipientFile);

            toast.loading("Sending marketing emails...", { id: "marketing" });
            const res = await sendMarketingEmails(event._id, formData);
            await fetchEvent();
            toast.success(
                `Sent: ${res.result.sent}  Failed: ${res.result.failed}`,
                { id: "marketing" }
            );
        } catch (error) {
            toast.error(error.response?.data?.message || "Marketing send failed.", {
                id: "marketing",
            });
        } finally {
            setSendingMarketing(false);
        }
    };

    const handleParticipantPreview = async () => {
        if (loadingParticipantPreview) return;
        setParticipantError("");
        try {
            setLoadingParticipantPreview(true);
            const formData = new FormData();
            formData.append("participantSource", participantSource);
            if (participantFile) formData.append("file", participantFile);
            const result = await previewParticipants(event._id, formData);
            setParticipantCount(result.total);
            setParticipantPreview(result.participants || []);
            toast.success(`${result.total} valid participants found.`);
        } catch (error) {
            const message = error.response?.data?.message || "Failed to load participants.";
            setParticipantError(message);
            setParticipantPreview([]);
            toast.error(message);
        } finally {
            setLoadingParticipantPreview(false);
        }
    };

    // ============================================================
    // CHECK-IN HANDLERS
    // ============================================================

    const handleAddSession = (e) => {
        e.preventDefault();

        if (!newSession.sessionId.trim()) {
            toast.error("Session ID is required.");
            return;
        }

        if (!newSession.name.trim()) {
            toast.error("Session Name is required.");
            return;
        }

        if (!newSession.date.trim()) {
            toast.error("Session Date is required.");
            return;
        }

        if (!newSession.startTime.trim() || !newSession.endTime.trim()) {
            toast.error("Start Time and End Time are required.");
            return;
        }

        if (newSession.startTime >= newSession.endTime) {
            toast.error("Start Time must be before End Time.");
            return;
        }

        const duplicate = checkInSessions.find(
            (s) => s.sessionId.toLowerCase() === newSession.sessionId.toLowerCase().trim()
        );

        if (duplicate) {
            toast.error(`Session ID "${newSession.sessionId}" already exists.`);
            return;
        }

        const updatedSessions = [
            ...checkInSessions,
            {
                sessionId: newSession.sessionId.trim(),
                name: newSession.name.trim(),
                date: newSession.date.trim(),
                startTime: newSession.startTime.trim(),
                endTime: newSession.endTime.trim(),
            },
        ];

        setCheckInSessions(updatedSessions);

        setNewSession({
            sessionId: `session-${updatedSessions.length + 1}`,
            name: "",
            date: newSession.date,
            startTime: "09:00",
            endTime: "12:00",
        });

        toast.success("Session added. Click 'Save Check-In Configuration' to persist changes.");
    };

    const handleRemoveSession = (sessionId) => {
        setCheckInSessions(checkInSessions.filter((s) => s.sessionId !== sessionId));
        toast.success("Session removed.");
    };

    const handleSaveCheckInConfig = async () => {
        if (savingCheckInConfig) return;
        try {
            setSavingCheckInConfig(true);

            const payload = {
                enabled: checkInEnabled,
                attendanceRequired: Number(checkInAttendanceRequired),
                participantSource: checkInParticipantSource,
                sourceConfig: {
                    googleFormUrl: checkInGoogleFormUrl,
                    googleSheetUrl: checkInGoogleSheetUrl,
                },
                sessions: checkInSessions,
            };

            await configureCheckIn(event._id, payload);
            await fetchEvent();
            toast.success("Check-In configuration saved successfully.");
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to save Check-In configuration."
            );
        } finally {
            setSavingCheckInConfig(false);
        }
    };

    const handleInitializeCheckIn = async () => {
        if (initializingCheckIn) return;
        if (!checkInEnabled) {
            toast.error("Please enable Check-In and save configuration first.");
            return;
        }

        if (checkInSessions.length === 0) {
            toast.error("Please configure at least one session before initializing participants.");
            return;
        }

        try {
            setInitializingCheckIn(true);
            setCheckInInitResult(null);

            let data;
            if (checkInParticipantSource === "csv" || checkInParticipantSource === "excel") {
                if (!checkInInitFile) {
                    toast.error(`Please select a ${checkInParticipantSource.toUpperCase()} file to initialize.`);
                    setInitializingCheckIn(false);
                    return;
                }
                const formData = new FormData();
                formData.append("file", checkInInitFile);
                formData.append("source", checkInParticipantSource);
                data = formData;
            } else {
                data = {
                    source: checkInParticipantSource,
                };
            }

            const res = await initializeCheckIn(event._id, data);
            setCheckInInitResult(res);
            toast.success("Check-In records initialized successfully!");
            await fetchRecords();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to initialize Check-In records."
            );
        } finally {
            setInitializingCheckIn(false);
        }
    };

    const handleViewQr = async (participant) => {
        if (loadingQr) return;
        try {
            setSelectedQrParticipant(participant);
            setLoadingQr(true);
            setQrImageUrl("");

            const blob = await getParticipantQr(event._id, participant.participantId);
            const objectUrl = URL.createObjectURL(blob);
            setQrImageUrl(objectUrl);
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to generate QR code."
            );
            setSelectedQrParticipant(null);
        } finally {
            setLoadingQr(false);
        }
    };

    const handleDownloadQr = () => {
        if (!qrImageUrl || !selectedQrParticipant) return;
        const link = document.createElement("a");
        link.href = qrImageUrl;
        link.download = `QR_${selectedQrParticipant.name.replace(/\s+/g, "_")}_${selectedQrParticipant.participantId}.png`;
        link.click();
    };

    const filteredRecords = checkInRecords.filter((rec) => {
        if (!recordsSearch) return true;
        const q = recordsSearch.toLowerCase();
        return (
            rec.name?.toLowerCase().includes(q) ||
            rec.email?.toLowerCase().includes(q) ||
            rec.participantId?.toLowerCase().includes(q) ||
            rec.aceId?.toLowerCase().includes(q) ||
            rec.memberType?.toLowerCase().includes(q)
        );
    });

    const aceCount = checkInRecords.filter((r) => r.memberType === "ace").length;
    const nonAceCount = checkInRecords.filter((r) => r.memberType === "non-ace").length;
    const eligibleCount = checkInRecords.filter((r) => r.eligible).length;

    return (
        <>
            <Navbar />

            <div className="event-details-container">
                <button className="back-btn" onClick={() => navigate("/dashboard")}>
                    ← Back
                </button>

                <div className="event-header">
                    <div>
                        <h1>{event.eventName}</h1>
                        <p className="event-description">
                            {event.description || "No description available."}
                        </p>
                    </div>

                    <span className={`status ${displayStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                        {displayStatus}
                    </span>
                </div>

                <div className="phase-tabs">
                    {preEnabled && (
                        <button
                            className={activePhase === "pre" ? "phase-tab active" : "phase-tab"}
                            onClick={() => setActivePhase("pre")}
                        >
                            PRE-EVENT
                        </button>
                    )}

                    <button
                        className={activePhase === "checkin" ? "phase-tab active" : "phase-tab"}
                        onClick={() => setActivePhase("checkin")}
                    >
                        CHECK-IN
                    </button>

                    {postEnabled && (
                        <button
                            className={activePhase === "post" ? "phase-tab active" : "phase-tab"}
                            onClick={() => setActivePhase("post")}
                        >
                            POST-EVENT
                        </button>
                    )}
                </div>

                {/* ============================================================ */}
                {/* PRE-EVENT PHASE */}
                {/* ============================================================ */}
                {activePhase === "pre" && preEnabled && (
                    <div className="event-content single-column">
                        <div className="step-tabs">
                            <button
                                className={preStep === "recipients" ? "step-tab active" : "step-tab"}
                                onClick={() => setPreStep("recipients")}
                            >
                                1. Recipients
                            </button>
                            <button
                                className={preStep === "campaign" ? "step-tab active" : "step-tab"}
                                onClick={() => setPreStep("campaign")}
                            >
                                2. Email Campaign
                            </button>
                        </div>

                        {preStep === "recipients" && (
                            <div className="card">
                                <h2>Recipients &amp; Data Source</h2>
                                <p className="helper-text">Choose who will receive the marketing email.</p>

                                <div className="input-group">
                                    <label>Recipient Source</label>
                                    <select
                                        value={recipientSource}
                                        onChange={(e) => {
                                            setRecipientSource(e.target.value);
                                            setRecipientPreview([]);
                                            setRecipientError("");
                                        }}
                                    >
                                        <option value="googleForm">Google Form</option>
                                        <option value="csv">CSV</option>
                                        <option value="excel">Excel</option>
                                    </select>
                                </div>

                                {recipientSource === "googleForm" && (
                                    <>
                                        <Input
                                            label="Google Form URL"
                                            value={googleFormUrl}
                                            onChange={(e) => setGoogleFormUrl(e.target.value)}
                                        />
                                        <Input
                                            label="Linked Google Sheet URL"
                                            value={googleSheetUrl}
                                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                        />
                                        <p className="helper-text">
                                            Recipients are loaded from the linked Google Form response sheet using the existing Sheets integration.
                                        </p>
                                    </>
                                )}

                                {(recipientSource === "csv" || recipientSource === "excel") && (
                                    <>
                                        <p className="helper-text">
                                            Required columns: <strong>ACE ID, Name, Email, Branch, Email Status</strong>
                                        </p>
                                        <div className="file-upload">
                                            <label className="upload-btn">
                                                Choose {recipientSource === "csv" ? "CSV" : "Excel"} file
                                                <input
                                                    hidden
                                                    type="file"
                                                    accept={recipientSource === "csv" ? ".csv" : ".xlsx,.xls"}
                                                    onChange={(e) => {
                                                        setRecipientFile(e.target.files[0]);
                                                        setRecipientPreview([]);
                                                        setRecipientError("");
                                                    }}
                                                />
                                            </label>
                                            {recipientFile && (
                                                <p className="selected-file">📄 {recipientFile.name}</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {recipientError && (
                                    <p className="error-text">⚠ {recipientError}</p>
                                )}

                                <div className="info-row">
                                    <span>Valid recipients</span>
                                    <strong>{recipientCount}</strong>
                                </div>

                                <Button variant="secondary" onClick={handleRecipientPreview} disabled={loadingRecipientPreview}>
                                    {loadingRecipientPreview ? "Loading..." : "Load Recipients"}
                                </Button>

                                {recipientPreview.length > 0 && (
                                    <div className="preview-table-wrap">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th>ACE ID</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Branch</th>
                                                    <th>Email Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recipientPreview.map((row, i) => (
                                                    <tr key={row.email || i}>
                                                        <td>{row.aceId || "--"}</td>
                                                        <td>{row.name || "--"}</td>
                                                        <td>{row.email}</td>
                                                        <td>{row.branch || "--"}</td>
                                                        <td>{row.emailStatus || "--"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {preStep === "campaign" && (
                            <div className="card">
                                <h2>Email Campaign</h2>
                                <p className="helper-text">Compose what recipients will receive.</p>

                                <Input
                                    label="Email Subject"
                                    value={marketingSubject}
                                    onChange={(e) => setMarketingSubject(e.target.value)}
                                />

                                <EmailTemplateEditor
                                    value={marketingHtml}
                                    onChange={setMarketingHtml}
                                    variables={PRE_VARIABLES}
                                    previewVariables={previewVars}
                                />

                                <Input
                                    label="Optional Test Email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="you@example.com"
                                />

                                <div className="action-buttons">
                                    <Button variant="secondary" onClick={handleSaveMarketing} disabled={savingMarketing || sendingMarketing}>
                                        {savingMarketing ? "Saving..." : "Save Template"}
                                    </Button>
                                    <Button variant="secondary" onClick={handleTestEmail} disabled={sendingTestEmail || savingMarketing || sendingMarketing || !testEmail}>
                                        {sendingTestEmail ? "Sending Test..." : "Send Test Email"}
                                    </Button>
                                    <Button onClick={handleSendMarketing} disabled={sendingMarketing || savingMarketing}>
                                        {sendingMarketing ? "Sending..." : "Send Marketing Emails"}
                                    </Button>
                                </div>

                                <div className="info-row">
                                    <span>Status</span>
                                    <strong>{event.preEvent?.status || "Idle"}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Total</span>
                                    <strong>{event.preEvent?.totalRecipients || 0}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Sent</span>
                                    <strong>{event.preEvent?.sent || 0}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Failed</span>
                                    <strong>{event.preEvent?.failed || 0}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* CHECK-IN PHASE */}
                {/* ============================================================ */}
                {activePhase === "checkin" && (
                    <div className="event-content single-column">
                        <div className="step-tabs">
                            <button
                                className={checkInStep === "config" ? "step-tab active" : "step-tab"}
                                onClick={() => setCheckInStep("config")}
                            >
                                1. Configuration &amp; Sessions
                            </button>
                            <button
                                className={checkInStep === "initialize" ? "step-tab active" : "step-tab"}
                                onClick={() => setCheckInStep("initialize")}
                            >
                                2. Initialize Participants
                            </button>
                            <button
                                className={checkInStep === "records" ? "step-tab active" : "step-tab"}
                                onClick={() => setCheckInStep("records")}
                            >
                                3. Check-In Records &amp; QR ({checkInRecords.length})
                            </button>
                        </div>

                        {/* 1. CONFIGURATION & SESSIONS */}
                        {checkInStep === "config" && (
                            <div className="checkin-config-grid">
                                <div className="card">
                                    <h2>Check-In Settings</h2>
                                    <p className="helper-text">
                                        Enable Check-In and set overall attendance rules for this event.
                                    </p>

                                    <div className="toggle-group">
                                        <label className="switch-label">
                                            <input
                                                type="checkbox"
                                                checked={checkInEnabled}
                                                onChange={(e) => setCheckInEnabled(e.target.checked)}
                                            />
                                            <span className="switch-custom"></span>
                                            <strong>Enable Check-In for this event</strong>
                                        </label>
                                    </div>

                                    <Input
                                        label="Required Attendance Percentage (%)"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={checkInAttendanceRequired}
                                        onChange={(e) => setCheckInAttendanceRequired(e.target.value)}
                                        placeholder="75"
                                    />

                                    <div className="input-group">
                                        <label>Participant Data Source</label>
                                        <select
                                            value={checkInParticipantSource}
                                            onChange={(e) => setCheckInParticipantSource(e.target.value)}
                                        >
                                            <option value="csv">CSV File</option>
                                            <option value="excel">Excel File (.xlsx, .xls)</option>
                                            <option value="googleSheet">Google Sheet / Form</option>
                                        </select>
                                    </div>

                                    {checkInParticipantSource === "googleSheet" && (
                                        <>
                                            <Input
                                                label="Google Form URL"
                                                value={checkInGoogleFormUrl}
                                                onChange={(e) => setCheckInGoogleFormUrl(e.target.value)}
                                                placeholder="https://docs.google.com/forms/..."
                                            />
                                            <Input
                                                label="Linked Google Sheet URL"
                                                value={checkInGoogleSheetUrl}
                                                onChange={(e) => setCheckInGoogleSheetUrl(e.target.value)}
                                                placeholder="https://docs.google.com/spreadsheets/..."
                                            />
                                        </>
                                    )}

                                    <div style={{ marginTop: "20px" }}>
                                        <Button
                                            onClick={handleSaveCheckInConfig}
                                            disabled={savingCheckInConfig}
                                        >
                                            {savingCheckInConfig ? "Saving..." : "Save Check-In Configuration"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="card">
                                    <h2>Sessions Management</h2>
                                    <p className="helper-text">
                                        Configure attendance sessions with dates and time windows (IST).
                                    </p>

                                    {/* Add Session Form */}
                                    <form className="add-session-box" onSubmit={handleAddSession}>
                                        <h3>Add New Session</h3>
                                        <div className="session-inputs-grid">
                                            <Input
                                                label="Session ID"
                                                value={newSession.sessionId}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, sessionId: e.target.value })
                                                }
                                                placeholder="e.g. session-1"
                                                required
                                            />

                                            <Input
                                                label="Session Name"
                                                value={newSession.name}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, name: e.target.value })
                                                }
                                                placeholder="e.g. Morning Keynote"
                                                required
                                            />

                                            <Input
                                                label="Date (YYYY-MM-DD)"
                                                type="date"
                                                value={newSession.date}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, date: e.target.value })
                                                }
                                                required
                                            />

                                            <div className="time-inputs-row">
                                                <Input
                                                    label="Start Time"
                                                    type="time"
                                                    value={newSession.startTime}
                                                    onChange={(e) =>
                                                        setNewSession({ ...newSession, startTime: e.target.value })
                                                    }
                                                    required
                                                />
                                                <Input
                                                    label="End Time"
                                                    type="time"
                                                    value={newSession.endTime}
                                                    onChange={(e) =>
                                                        setNewSession({ ...newSession, endTime: e.target.value })
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <Button type="submit" variant="secondary">
                                            <FaPlus /> Add Session
                                        </Button>
                                    </form>

                                    {/* Configured Sessions List */}
                                    <div className="sessions-list-wrap">
                                        <h3>Configured Sessions ({checkInSessions.length})</h3>
                                        {checkInSessions.length === 0 ? (
                                            <p className="no-items-text">No sessions configured yet.</p>
                                        ) : (
                                            <div className="sessions-cards">
                                                {checkInSessions.map((s, idx) => (
                                                    <div key={s.sessionId || idx} className="session-card-item">
                                                        <div className="session-card-info">
                                                            <strong>
                                                                {s.name} <span className="session-id-tag">#{s.sessionId}</span>
                                                            </strong>
                                                            <span>📅 {s.date} | ⏰ {s.startTime} - {s.endTime}</span>
                                                        </div>
                                                        <button
                                                            className="delete-session-btn"
                                                            type="button"
                                                            onClick={() => handleRemoveSession(s.sessionId)}
                                                            title="Remove Session"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. INITIALIZE PARTICIPANTS */}
                        {checkInStep === "initialize" && (
                            <div className="card">
                                <h2>Initialize Check-In Participants</h2>
                                <p className="helper-text">
                                    Import participants to generate unique QR tokens and snapshot event sessions.
                                </p>

                                <div className="identity-rules-banner">
                                    <h4>Universal Participant Identity Model:</h4>
                                    <ul>
                                        <li>
                                            <strong>ACE Members:</strong> Require <code>ACE ID</code>. Identified by <code>participantId = ACE ID</code>.
                                        </li>
                                        <li>
                                            <strong>Non-ACE Participants:</strong> No ACE ID required. Identified by <code>participantId = email</code>.
                                        </li>
                                        <li>
                                            <strong>Check-In File Columns:</strong> Required: <code>Name, Email</code>. Optional: <code>ACE ID</code>.
                                        </li>
                                    </ul>
                                </div>

                                {(checkInParticipantSource === "csv" || checkInParticipantSource === "excel") && (
                                    <div className="file-upload">
                                        <label className="upload-btn">
                                            Choose {checkInParticipantSource === "csv" ? "CSV" : "Excel"} Participant File
                                            <input
                                                hidden
                                                type="file"
                                                accept={checkInParticipantSource === "csv" ? ".csv" : ".xlsx,.xls"}
                                                onChange={(e) => {
                                                    setCheckInInitFile(e.target.files[0]);
                                                    setCheckInInitResult(null);
                                                }}
                                            />
                                        </label>
                                        {checkInInitFile && (
                                            <p className="selected-file">📄 {checkInInitFile.name}</p>
                                        )}
                                    </div>
                                )}

                                {checkInParticipantSource === "googleSheet" && (
                                    <p className="helper-text">
                                        Participants will be read from the linked Google Sheet URL configured in Step 1.
                                    </p>
                                )}

                                <Button
                                    onClick={handleInitializeCheckIn}
                                    disabled={initializingCheckIn || !checkInEnabled || checkInSessions.length === 0}
                                >
                                    {initializingCheckIn ? "Initializing Participants..." : "Initialize Check-In Records"}
                                </Button>

                                {checkInInitResult && (
                                    <div className="init-results-card">
                                        <h3>✓ Initialization Complete</h3>
                                        <div className="init-stats-grid">
                                            <div className="init-stat-box">
                                                <span>Total Loaded</span>
                                                <strong>{checkInInitResult.totalParticipants}</strong>
                                            </div>
                                            <div className="init-stat-box created">
                                                <span>New Created</span>
                                                <strong>{checkInInitResult.created}</strong>
                                            </div>
                                            <div className="init-stat-box existing">
                                                <span>Already Existing</span>
                                                <strong>{checkInInitResult.existing}</strong>
                                            </div>
                                            <div className="init-stat-box failed">
                                                <span>Failed</span>
                                                <strong>{checkInInitResult.failed}</strong>
                                            </div>
                                        </div>

                                        {checkInInitResult.failures?.length > 0 && (
                                            <div className="failures-list">
                                                <h4>Failures / Warnings:</h4>
                                                <ul>
                                                    {checkInInitResult.failures.map((f, i) => (
                                                        <li key={i}>
                                                            {f.email || f.participantId || "Unknown"}: {f.error}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div style={{ marginTop: "16px" }}>
                                            <Button
                                                variant="secondary"
                                                onClick={() => setCheckInStep("records")}
                                            >
                                                View Check-In Records →
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. CHECK-IN RECORDS & QR */}
                        {checkInStep === "records" && (
                            <div className="card">
                                <div className="records-header-row">
                                    <div>
                                        <h2>Check-In Records &amp; QR Codes</h2>
                                        <p className="helper-text">
                                            Live participant attendance, percentage, eligibility, and individual QR codes.
                                        </p>
                                    </div>
                                    <Button variant="secondary" onClick={fetchRecords} disabled={loadingRecords}>
                                        <FaSync /> {loadingRecords ? "Refreshing..." : "Refresh"}
                                    </Button>
                                </div>

                                {/* Summary Stats */}
                                <div className="records-summary-grid">
                                    <div className="summary-stat-box">
                                        <span>Total Participants</span>
                                        <strong>{checkInRecords.length}</strong>
                                    </div>
                                    <div className="summary-stat-box">
                                        <span>ACE Members</span>
                                        <strong style={{ color: "#4338ca" }}>{aceCount}</strong>
                                    </div>
                                    <div className="summary-stat-box">
                                        <span>Non-ACE Participants</span>
                                        <strong style={{ color: "#4b5563" }}>{nonAceCount}</strong>
                                    </div>
                                    <div className="summary-stat-box">
                                        <span>Eligible Participants</span>
                                        <strong style={{ color: "#16a34a" }}>{eligibleCount}</strong>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="search-bar-wrap">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, ACE ID, or participant ID..."
                                        value={recordsSearch}
                                        onChange={(e) => setRecordsSearch(e.target.value)}
                                    />
                                </div>

                                {loadingRecords ? (
                                    <Loader />
                                ) : checkInRecords.length === 0 ? (
                                    <p className="no-items-text">
                                        No check-in records found. Please initialize participants in Step 2.
                                    </p>
                                ) : (
                                    <div className="preview-table-wrap">
                                        <table className="preview-table records-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Type</th>
                                                    <th>ACE ID</th>
                                                    <th>Participant ID</th>
                                                    <th>Attended</th>
                                                    <th>Percentage</th>
                                                    <th>Eligibility</th>
                                                    <th>QR Code</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRecords.map((rec) => (
                                                    <tr key={rec._id}>
                                                        <td>
                                                            <strong>{rec.name}</strong>
                                                        </td>
                                                        <td>{rec.email}</td>
                                                        <td>
                                                            <span className={`member-tag ${rec.memberType}`}>
                                                                {rec.memberType === "ace" ? "ACE" : "Non-ACE"}
                                                            </span>
                                                        </td>
                                                        <td>{rec.aceId || "N/A"}</td>
                                                        <td className="mono-text">{rec.participantId}</td>
                                                        <td>
                                                            {rec.attendedSessions} / {rec.totalSessions}
                                                        </td>
                                                        <td>
                                                            <strong>{rec.attendancePercentage}%</strong>
                                                        </td>
                                                        <td>
                                                            <span className={`eligibility-badge ${rec.eligible ? "eligible" : "not-eligible"}`}>
                                                                {rec.eligible ? "Eligible" : "Not Eligible"}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="qr-view-btn"
                                                                onClick={() => handleViewQr(rec)}
                                                                disabled={loadingQr}
                                                            >
                                                                <FaQrcode /> {loadingQr && selectedQrParticipant?.participantId === rec.participantId ? "Loading..." : "View QR"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* POST-EVENT PHASE */}
                {/* ============================================================ */}
                {activePhase === "post" && postEnabled && (
                    <div className="event-content single-column">
                        <div className="step-tabs">
                            <button
                                className={postStep === "participants" ? "step-tab active" : "step-tab"}
                                onClick={() => setPostStep("participants")}
                            >
                                1. Participants
                            </button>
                            <button
                                className={postStep === "certificate" ? "step-tab active" : "step-tab"}
                                onClick={() => setPostStep("certificate")}
                            >
                                2. Certificate Email
                            </button>
                        </div>

                        {postStep === "participants" && (
                            <div className="event-content">
                                {/* LEFT */}
                                <div className="left-column">
                                    <div className="card">
                                        <h2>Event Information</h2>

                                        <div className="info-row">
                                            <span>📅 Event Date</span>
                                            <strong>
                                                {new Date(event.eventDate).toLocaleDateString()}
                                            </strong>
                                        </div>

                                        <div className="info-row">
                                            <span>⏰ Event Time</span>
                                            <strong>{event.eventTime || "--"}</strong>
                                        </div>

                                        <div className="info-row">
                                            <span>📍 Venue</span>
                                            <strong>{event.venue || "--"}</strong>
                                        </div>

                                        <div className="info-row">
                                            <span>📝 Registration Source</span>
                                            <strong>{event.registrationSource}</strong>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h2>Participants &amp; Data Source</h2>
                                        <p className="helper-text">Choose who will receive a certificate.</p>

                                        <div className="input-group">
                                            <select
                                                value={participantSource}
                                                onChange={(e) => {
                                                    setParticipantSource(e.target.value);
                                                    setParticipantPreview([]);
                                                    setParticipantError("");
                                                }}
                                            >
                                                <option value="googleSheet">Google Sheet</option>
                                                <option value="csv">CSV</option>
                                                <option value="excel">Excel</option>
                                                <option value="checkIn">Check-In Participants</option>
                                            </select>
                                        </div>

                                        {participantSource === "googleSheet" && (
                                            <>
                                                <div className="link-row">
                                                    <span>Google Form</span>
                                                    <a
                                                        href={event.googleForm?.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open ↗
                                                    </a>
                                                </div>

                                                <div className="link-row">
                                                    <span>Google Sheet</span>
                                                    <a
                                                        href={event.googleSheet?.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open ↗
                                                    </a>
                                                </div>
                                            </>
                                        )}
                                        {participantSource === "checkIn" && (
                                            <p className="helper-text">
                                                Retrieves participants directly from the Check-In database records. No upload required.
                                            </p>
                                        )}

                                        {(participantSource === "csv" || participantSource === "excel") && (
                                            <>
                                                <p className="helper-text">
                                                    Required columns: <strong>ACE ID, Name, Email, Branch, Email Status</strong>
                                                </p>
                                                <div className="file-upload">
                                                    <label className="upload-btn">
                                                        Choose {participantSource === "csv" ? "CSV" : "Excel"} file
                                                        <input
                                                            hidden
                                                            type="file"
                                                            accept={participantSource === "csv" ? ".csv" : ".xlsx,.xls"}
                                                            onChange={(e) => {
                                                                setParticipantFile(e.target.files[0]);
                                                                setParticipantPreview([]);
                                                                setParticipantError("");
                                                            }}
                                                        />
                                                    </label>
                                                    {participantFile && (
                                                        <p className="selected-file">📄 {participantFile.name}</p>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {participantError && (
                                            <p className="error-text">⚠ {participantError}</p>
                                        )}

                                        <div className="info-row">
                                            <span>Valid participants</span>
                                            <strong>{participantCount}</strong>
                                        </div>

                                        <Button variant="secondary" onClick={handleParticipantPreview} disabled={loadingParticipantPreview}>
                                            {loadingParticipantPreview ? "Loading..." : "Load Participants"}
                                        </Button>

                                        {participantPreview.length > 0 && (
                                            <div className="preview-table-wrap">
                                                <table className="preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>ACE ID</th>
                                                            <th>Name</th>
                                                            <th>Email</th>
                                                            <th>Branch</th>
                                                            <th>Email Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {participantPreview.map((row, i) => (
                                                            <tr key={row.email || i}>
                                                                <td>{row.aceId || "--"}</td>
                                                                <td>{row.name || "--"}</td>
                                                                <td>{row.email}</td>
                                                                <td>{row.branch || "--"}</td>
                                                                <td>{row.emailStatus || "--"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div className="right-column">
                                    <div className="card">
                                        <h2>Certificate Template</h2>
                                        {event.template?.url ? (
                                            <img
                                                src={event.template.url}
                                                alt="Certificate Template"
                                                className="certificate-preview"
                                            />
                                        ) : (
                                            <p>No certificate template uploaded.</p>
                                        )}

                                        <Button
                                            onClick={() => setShowEditor(true)}
                                            disabled={!event.template?.url}
                                        >
                                            Edit Placement
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {postStep === "certificate" && (
                            <div className="event-content">
                                {/* LEFT */}
                                <div className="left-column">
                                    <div className="card">
                                        <h2>Certificate Email</h2>
                                        <p className="helper-text">
                                            Compose what participants will receive alongside their certificate.
                                        </p>
                                        <Input
                                            label="Email Subject"
                                            value={certificateSubject}
                                            onChange={(e) => setCertificateSubject(e.target.value)}
                                        />
                                        <EmailTemplateEditor
                                            value={certificateHtml}
                                            onChange={setCertificateHtml}
                                            variables={POST_VARIABLES}
                                            previewVariables={previewVars}
                                        />
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div className="right-column">
                                    <div className="card">
                                        <h2>Automation</h2>

                                        <div className="info-row">
                                            <span>Status</span>
                                            <strong className={`status ${displayStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                                                {displayStatus}
                                            </strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Total Participants</span>
                                            <strong>{event.automation.totalParticipants}</strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Processed</span>
                                            <strong>
                                                {event.automation.processed} / {event.automation.totalParticipants}
                                            </strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Success</span>
                                            <strong>{event.automation.success}</strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Failed</span>
                                            <strong>{event.automation.failed}</strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Started</span>
                                            <strong>
                                                {event.automation.startedAt
                                                    ? new Date(event.automation.startedAt).toLocaleString()
                                                    : "--"}
                                            </strong>
                                        </div>

                                        <div className="info-row">
                                            <span>Completed</span>
                                            <strong>
                                                {event.automation.completedAt
                                                    ? new Date(event.automation.completedAt).toLocaleString()
                                                    : "--"}
                                            </strong>
                                        </div>

                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: `${
                                                        event.automation.totalParticipants === 0
                                                            ? 0
                                                            : (event.automation.processed /
                                                                  event.automation.totalParticipants) *
                                                              100
                                                    }%`,
                                                }}
                                            />
                                        </div>

                                        <p className="progress-text">
                                            {event.automation.totalParticipants === 0
                                                ? 0
                                                : Math.round(
                                                      (event.automation.processed /
                                                          event.automation.totalParticipants) *
                                                          100
                                                  )}
                                            %
                                        </p>

                                        <div className="action-buttons">
                                            <Button onClick={handlePreview} disabled={generatingPreview || !event.template?.url}>
                                                {generatingPreview ? "Generating..." : "Generate Preview"}
                                            </Button>

                                            <Button
                                                onClick={handleAutomation}
                                                disabled={
                                                    running ||
                                                    automationFinished ||
                                                    automationStatus === "Running" ||
                                                    !event.template?.url
                                                }
                                            >
                                                {automationStatus === "Running"
                                                    ? "Running..."
                                                    : running
                                                    ? "Starting..."
                                                    : automationFinished
                                                    ? "Completed ✓"
                                                    : "Run Automation"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* QR Modal */}
            {selectedQrParticipant && (
                <div className="modal-backdrop" onClick={() => setSelectedQrParticipant(null)}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="qr-modal-header">
                            <h3>Participant QR Code</h3>
                            <button
                                className="close-modal-btn"
                                onClick={() => setSelectedQrParticipant(null)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="qr-modal-body">
                            <div className="qr-participant-details">
                                <h4>{selectedQrParticipant.name}</h4>
                                <span className={`member-tag ${selectedQrParticipant.memberType}`}>
                                    {selectedQrParticipant.memberType === "ace" ? "ACE Member" : "Non-ACE"}
                                </span>
                                <p>
                                    <strong>Participant ID:</strong> {selectedQrParticipant.participantId}
                                </p>
                                {selectedQrParticipant.aceId && (
                                    <p>
                                        <strong>ACE ID:</strong> {selectedQrParticipant.aceId}
                                    </p>
                                )}
                                <p>
                                    <strong>Email:</strong> {selectedQrParticipant.email}
                                </p>
                            </div>

                            <div className="qr-image-display">
                                {loadingQr ? (
                                    <Loader />
                                ) : qrImageUrl ? (
                                    <img src={qrImageUrl} alt="Participant QR Code" className="qr-img" />
                                ) : (
                                    <p>Failed to load QR code.</p>
                                )}
                            </div>
                        </div>

                        <div className="qr-modal-footer">
                            <Button onClick={handleDownloadQr} disabled={!qrImageUrl}>
                                <FaDownload /> Download QR Code
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showEditor && (
                <TemplateEditor
                    event={event}
                    onClose={() => setShowEditor(false)}
                    onSave={() => {
                        fetchEvent();
                        setShowEditor(false);
                    }}
                />
            )}
        </>
    );
}

export default EventDetails;
