import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role || "scanner";

        if (!allowedRoles.includes(userRole)) {
            // Redirect unauthorized role to their respective landing page
            if (userRole === "scanner") {
                return <Navigate to="/scanner" replace />;
            }
            if (userRole === "admin") {
                return <Navigate to="/dashboard" replace />;
            }
            return <Navigate to="/" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;