import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Button from "../../ui/Button/Button";
import Input from "../../ui/Input/Input";

import { createEvent } from "../../../services/eventApi";

import "./CreateEventModal.css";

function CreateEventModal({ onClose }) {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        eventName: "",
        description: "",
        eventDate: "",
        time: "",
        venue: "",
        workflow: "both",
        registrationSource: "google",
        googleFormUrl: "",
        googleSheetUrl: "",
    });

    const [template, setTemplate] = useState(null);

    const [loading, setLoading] = useState(false);

    const postEventEnabled = formData.workflow !== "pre";

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

    };

   const handleFileChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {

        toast.error("Template size should be under 5 MB.");

        return;

    }

    setTemplate(file);

};

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (loading) return;

        if (
            !formData.eventName ||
            !formData.eventDate
        ) {
            toast.error("Please fill all required fields.");
            return;
        }

        if (postEventEnabled && !template) {
            toast.error("Post-event workflow requires a certificate template.");
            return;
        }

        if (formData.googleFormUrl && !formData.googleFormUrl.includes("docs.google.com/forms")) {
            toast.error("Please enter a valid Google Form URL.");
            return;
        }

        if (formData.googleSheetUrl && !formData.googleSheetUrl.includes("docs.google.com/spreadsheets")) {
            toast.error("Please enter a valid Google Sheet URL.");
            return;
        }

        try {

            setLoading(true);

            const data = new FormData();

            data.append("eventName", formData.eventName);
            data.append("description", formData.description);
            data.append("eventDate", formData.eventDate);
            data.append("time", formData.time);
            data.append("venue", formData.venue);
            data.append("workflow", formData.workflow);
            data.append("registrationSource", formData.registrationSource);
            data.append("googleFormUrl", formData.googleFormUrl);
            data.append("googleSheetUrl", formData.googleSheetUrl);
            if (template) {
                data.append("template", template);
            }

            const response = await createEvent(data);

            toast.success(response.message);
            setFormData({
    eventName: "",
    description: "",
    eventDate: "",
    time: "",
    venue: "",
    workflow: "both",
    registrationSource: "google",
    googleFormUrl: "",
    googleSheetUrl: "",
});

setTemplate(null);

            onClose();

            navigate(`/events/${response.event._id}`);

        } catch (error) {

            const message =
    error.response?.data?.message ||
    error.message ||
    "Something went wrong.";

toast.error(message);

        } finally {

            setLoading(false);

        }

    };

    return (
        <div className="modal-overlay">

            <div className="create-event-modal">

                <h2>Create New Event</h2>

<p className="subtitle">
    Fill in the details below to begin the certificate automation workflow.
</p>


                <form onSubmit={handleSubmit}>

                    <Input
                        label="Event Name"
                        name="eventName"
                        placeholder="ACE Coding Contest"
                        value={formData.eventName}
                        onChange={handleChange}
                    />

                    <div className="input-group">

    <label>Description</label>

    <textarea
        rows="4"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Enter event description..."
    />

</div>

                    <Input
    label="Event Date"
    type="date"
    name="eventDate"
    min={new Date().toISOString().split("T")[0]}
    value={formData.eventDate}
    onChange={handleChange}
/>

                    <Input
                        label="Event Time"
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                    />

                    <Input
                        label="Venue"
                        name="venue"
                        placeholder="Main Auditorium"
                        value={formData.venue}
                        onChange={handleChange}
                    />

                    <div className="input-group">
                        <label>Event Workflow</label>
                        <div className="workflow-options">
                            {[
                                { value: "pre", label: "Pre-Event" },
                                { value: "post", label: "Post-Event" },
                                { value: "both", label: "Both" },
                            ].map((option) => (
                                <label key={option.value} className="workflow-option">
                                    <input
                                        type="radio"
                                        name="workflow"
                                        value={option.value}
                                        checked={formData.workflow === option.value}
                                        onChange={handleChange}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Google Form URL"
                        name="googleFormUrl"
                        placeholder="https://docs.google.com/forms/..."
                        value={formData.googleFormUrl}
                        onChange={handleChange}
                    />

                    <Input
                        label="Google Sheet URL"
                        name="googleSheetUrl"
                        placeholder="https://docs.google.com/spreadsheets/..."
                        value={formData.googleSheetUrl}
                        onChange={handleChange}
                    />

                    {postEventEnabled && (
                    <div className="file-upload">

                        <label className="upload-btn">

    Choose Template

    <input
        hidden
        type="file"
        accept="image/png"
        onChange={handleFileChange}
    />

</label>
                        {
    template && (

        <p className="selected-file">
    📄 {template.name}
</p>

    )
}
                    </div>
                    )}

                    <div className="modal-buttons">

                        <Button
                            type="button"
                            variant="secondary"
                            disabled={loading}
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Event"}
                        </Button>

                    </div>

                </form>

            </div>

        </div>
    );

}

export default CreateEventModal;
