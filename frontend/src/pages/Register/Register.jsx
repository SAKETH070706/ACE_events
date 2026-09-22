import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Register.css";
import { toast } from "react-hot-toast";
import Card from "../../components/ui/Card/Card";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";

import { registerUser } from "../../services/authApi";

function Register() {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        try {

            setLoading(true);

            const response = await registerUser(formData);

           

            toast.success("Account created successfully. Please log in.");


            navigate("/");

        } catch (error) {

            toast.error(
    error.response?.data?.message ||
    "Registration failed. Please try again."
);

        } finally {

            setLoading(false);

        }
    };

    return (
        <div className="register-page">

            <Card>

                <h1>Create Account</h1>

                <p>Register to use ACE Automation</p>

                <form onSubmit={handleSubmit}>

                    <Input
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                    />

                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Register"}
                    </Button>

                </form>

                <p className="login-link">
                    Already have an account?{" "}
                    <Link to="/">Login</Link>
                </p>

            </Card>

        </div>
    );
}

export default Register;