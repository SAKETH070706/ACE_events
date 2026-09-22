import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import EventDetails from "../pages/EventDetails/EventDetails";
import Dashboard from "../pages/Dashboard/Dashboard";
import Scanner from "../pages/Scanner/Scanner";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* ADMIN ONLY ROUTES */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/events/:id"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <EventDetails />
                        </ProtectedRoute>
                    }
                />

                {/* ADMIN + SCANNER ROUTES */}
                <Route
                    path="/scanner"
                    element={
                        <ProtectedRoute allowedRoles={["admin", "scanner"]}>
                            <Scanner />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/checkin/scan/:qrToken"
                    element={
                        <ProtectedRoute allowedRoles={["admin", "scanner"]}>
                            <Scanner />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;