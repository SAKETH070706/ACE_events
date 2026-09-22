import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaQrcode, FaThLarge } from "react-icons/fa";
import { logout } from "../../../utils/auth";

function Navbar() {
    const navigate = useNavigate();
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    const isAdmin = user?.role === "admin";
    const isScanner = user?.role === "scanner";

    const handleBrandClick = () => {
        if (isAdmin) {
            navigate("/dashboard");
        } else {
            navigate("/scanner");
        }
    };

    return (
        <nav className="main-navbar">
            <div className="nav-brand" onClick={handleBrandClick}>
                <h2>ACE Automation</h2>
            </div>

            <div className="nav-actions">
                {isAdmin && (
                    <div className="nav-links">
                        <Link to="/dashboard" className="nav-link">
                            <FaThLarge /> Dashboard
                        </Link>
                        <Link to="/scanner" className="nav-link">
                            <FaQrcode /> Scanner
                        </Link>
                    </div>
                )}

                <div className="user-info">
                    <span className="user-name">{user?.name || "User"}</span>
                    <span className={`role-badge ${user?.role || "scanner"}`}>
                        {user?.role ? user.role.toUpperCase() : "SCANNER"}
                    </span>
                </div>

                <button className="logout-btn" onClick={logout}>
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
}

export default Navbar;