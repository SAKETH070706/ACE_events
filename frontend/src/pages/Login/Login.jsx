import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Login.css";
import { toast } from "react-hot-toast";
import Card from "../../components/ui/Card/Card";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";

import { loginUser } from "../../services/authApi";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        try {
            setLoading(true);

            const response = await loginUser(formData);
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));
            toast.success("Account logged in successfully.");

            if (response.user?.role === "scanner") {
                navigate("/scanner");
            } else {
                navigate("/dashboard");
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Invalid email or password."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (token) {
            try {
                const user = JSON.parse(localStorage.getItem("user") || "null");
                if (user?.role === "scanner") {
                    navigate("/scanner");
                } else {
                    navigate("/dashboard");
                }
            } catch {
                navigate("/dashboard");
            }
        }
    }, [navigate]);

    return (
        <div className="login-page">
            <Card>
                <h1>Welcome Back</h1>
                <p>Sign in to continue.</p>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>

                <p className="register-link">
                    Don't have an account?{" "}
                    <Link to="/register">Register</Link>
                </p>
            </Card>
        </div>
    );
}

export default Login;