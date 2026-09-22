import "./Dashboard.css";
import { useEffect, useState } from "react";
import { archiveEvent, deleteEvent, getEvents } from "../../services/eventApi";
import { toast } from "react-hot-toast";
import Navbar from "../../components/layout/Navbar/Navbar";
import Welcome from "../../components/dashboard/Welcome/Welcome";
import EventCard from "../../components/dashboard/EventCard/EventCard";
import Pagination from "../../components/dashboard/Pagination/Pagination";
import CreateEventModal from "../../components/dashboard/CreateEventModal/CreateEventModal.jsx";
import Loader from "../../components/ui/Loader/Loader"; 

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");

  const [archivingId, setArchivingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents(currentPage, 6, filter);
      setEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentPage, filter]);

  const handleArchive = async (event) => {
    if (archivingId || deletingId) return;
    try {
      setArchivingId(event._id);
      await archiveEvent(event._id, !event.archived);
      toast.success(event.archived ? "Event restored." : "Event archived.");
      await fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update event.");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (event) => {
    if (deletingId || archivingId) return;
    if (!window.confirm(`Permanently delete "${event.eventName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(event._id);
      await deleteEvent(event._id);
      toast.success("Event deleted.");
      await fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        {loading ? (
          <Loader />
        ) : (
          <>
            <Welcome onCreate={() => setShowModal(true)} />

            <div className="dashboard-filters">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={filter === item.id ? "active" : ""}
                  onClick={() => {
                    setFilter(item.id);
                    setCurrentPage(1);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="events-list">
              {events.length === 0 ? (
                <p>No events found.</p>
              ) : (
                events.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    isArchiving={archivingId === event._id}
                    isDeleting={deletingId === event._id}
                  />
                ))
              )}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {showModal && <CreateEventModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export default Dashboard;
