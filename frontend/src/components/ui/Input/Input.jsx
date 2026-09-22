import "./Input.css";

function Input({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    ...props
}) {
    return (
        <div className="input-group">

            {label && <label>{label}</label>}

            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                name={name}
                {...props}
            />

        </div>
    );
}

export default Input;