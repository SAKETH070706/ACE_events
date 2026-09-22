import "./Button.css";

function Button({
    children,
    type = "button",
    onClick,
    disabled = false,
    variant = "primary",
}) {
    return (
        <button
            type={type}
            className={`btn ${variant}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

export default Button;