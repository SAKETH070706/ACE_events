import "./EventCard.css";
import { useNavigate } from "react-router-dom";
import Button from "../../ui/Button/Button";
import { getLifecycleStatus } from "../../../utils/templates";


function EventCard({ event, onArchive, onDelete, isArchiving = false, isDeleting = false }) {
   
    const navigate = useNavigate();
    const lifecycle = event.lifecycleStatus || getLifecycleStatus(event.eventDate);

    return (

        <div className="event-card">

            <div>

                <h2>{event.eventName}</h2>

                <p>
                    📅 {new Date(event.eventDate).toLocaleDateString()}
                </p>

                <p>
                    📄 {event.registrationSource}
                </p>

                <span className={`lifecycle ${lifecycle}`}>
                    {lifecycle}
                    {event.archived ? " · archived" : ""}
                </span>

            </div>

            <div className="event-card-actions">

                <Button
                    onClick={() => navigate(`/events/${event._id}`)}
                    disabled={isArchiving || isDeleting}
                >
                    Continue →
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => onArchive?.(event)}
                    disabled={isArchiving || isDeleting}
                >
                    {isArchiving ? "Updating..." : event.archived ? "Restore" : "Archive"}
                </Button>

                <Button
                    variant="danger"
                    onClick={() => onDelete?.(event)}
                    disabled={isDeleting || isArchiving}
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </Button>

            </div>

        </div>

    );

}

export default EventCard;
