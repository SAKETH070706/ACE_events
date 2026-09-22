import "./TemplateEditor.css";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

import { updateTemplate } from "../../services/templateApi";
import Input from "../ui/Input/Input";

const FONT_FAMILIES = {
    TimesRoman: "Times New Roman, Times, serif",
    Helvetica: "Arial, Helvetica, sans-serif",
    Courier: "Courier New, Courier, monospace",
};

function TemplateEditor({ event, onClose, onSave }) {

    const certificateRef = useRef(null);
    const nameRef = useRef(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [templateSettings, setTemplateSettings] = useState({
    namePosition: {
        x: event.template?.namePosition?.x ?? 0,
        y: event.template?.namePosition?.y ?? 0,
        align: event.template?.namePosition?.align ?? "center"
    },
    font: event.template?.font || {
        family: "TimesRoman",
        weight: "Bold",
        size: 80,
        color: "#8B5A2B",
    },
    rotation: event.template?.rotation || 0,
    maxWidth: event.template?.maxWidth || 0,
});

    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);

    const [offset, setOffset] = useState({

        x: 0,
        y: 0

    });

    const getScale = () => {
        const img = certificateRef.current?.querySelector("img");
        if (!img?.naturalWidth) return { x: 1, y: 1 };
        return {
            x: img.clientWidth / img.naturalWidth,
            y: img.clientHeight / img.naturalHeight,
        };
    };

    const handleMouseDown = (e) => {

        e.preventDefault();

        const rect = certificateRef.current.getBoundingClientRect();
        const scale = getScale();

        setDragging(true);

        setOffset({

            x:
                e.clientX -
                rect.left -
                templateSettings.namePosition.x * scale.x,

            y:
                e.clientY -
                rect.top -
                templateSettings.namePosition.y * scale.y

        });

    };

    const handleMouseMove = (e) => {

        if (!dragging) return;

        const rect = certificateRef.current.getBoundingClientRect();
        const scale = getScale();
        const img = certificateRef.current.querySelector("img");

        let displayX = e.clientX - rect.left - offset.x;
        let displayY = e.clientY - rect.top - offset.y;

        displayX = Math.max(0, Math.min(displayX, img.clientWidth));
        displayY = Math.max(0, Math.min(displayY, img.clientHeight));

        setTemplateSettings((prev) => ({

            ...prev,

            namePosition: {

                ...prev.namePosition,

                x: displayX / scale.x,
                y: displayY / scale.y

            }

        }));

    };

    const handleMouseUp = () => {

        setDragging(false);

    };

    useEffect(() => {

        if (!dragging) return;

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {

            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);

        };

    }, [dragging, offset, templateSettings.namePosition.x, templateSettings.namePosition.y]);

    const handleSave = async () => {
        if (saving) return;
        try {
            setSaving(true);
            await updateTemplate(event._id, templateSettings);

            toast.success("Template updated successfully.");
            onSave();
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Failed to save template."
            );
        } finally {
            setSaving(false);
        }
    };

    const updatePosition = (key, value) => {
        setTemplateSettings((prev) => ({
            ...prev,
            namePosition: {
                ...prev.namePosition,
                [key]: key === "align" ? value : Number(value) || 0,
            },
        }));
    };

    const updateFont = (key, value) => {
        setTemplateSettings((prev) => ({
            ...prev,
            font: {
                ...prev.font,
                [key]: key === "size" ? Number(value) || 0 : value,
            },
        }));
    };

    const scale = imageLoaded ? getScale() : { x: 1, y: 1 };
    const displayX = templateSettings.namePosition.x * scale.x;
    const displayY = templateSettings.namePosition.y * scale.y;
    const maxWidth = (templateSettings.maxWidth || 0) * scale.x;
    const align = templateSettings.namePosition.align;
    const translateX = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";

    return (

        <div className="editor-overlay">

            <div className="editor-modal">

                <h2>Edit Certificate Placement</h2>

                <div className="editor-layout">

                <div

                    ref={certificateRef}

                    className="certificate-container"

                >

                  <img
    src={event.template.url}
    alt="Certificate"
    className="editor-image"
    onLoad={() => setImageLoaded(true)}
/>

                    <div
    ref={nameRef}
    className="name-placeholder"
    onMouseDown={handleMouseDown}
    style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
        fontSize: `${templateSettings.font.size * scale.x}px`,
        color: templateSettings.font.color,
        fontWeight:
            templateSettings.font.weight === "Bold" ||
            templateSettings.font.weight === "BoldItalic"
                ? "bold"
                : "normal",
        fontStyle:
            templateSettings.font.weight === "Italic" ||
            templateSettings.font.weight === "BoldItalic"
                ? "italic"
                : "normal",
        fontFamily: FONT_FAMILIES[templateSettings.font.family] || FONT_FAMILIES.TimesRoman,
        maxWidth: maxWidth ? `${maxWidth}px` : "90%",
        textAlign: align,
        transform: `translateX(${translateX}) rotate(${templateSettings.rotation || 0}deg)`,
        cursor: dragging ? "grabbing" : "grab"
    }}
>
    John Doe
</div>

                </div>

                <div className="editor-controls">
                    <Input
                        label="X"
                        type="number"
                        value={Math.round(templateSettings.namePosition.x)}
                        onChange={(e) => updatePosition("x", e.target.value)}
                    />
                    <Input
                        label="Y"
                        type="number"
                        value={Math.round(templateSettings.namePosition.y)}
                        onChange={(e) => updatePosition("y", e.target.value)}
                    />
                    <div className="input-group">
                        <label>Font family</label>
                        <select
                            value={templateSettings.font.family}
                            onChange={(e) => updateFont("family", e.target.value)}
                        >
                            <option value="TimesRoman">Times Roman</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Courier">Courier</option>
                        </select>
                    </div>
                    <Input
                        label="Font size"
                        type="number"
                        value={templateSettings.font.size}
                        onChange={(e) => updateFont("size", e.target.value)}
                    />
                    <div className="input-group">
                        <label>Font weight</label>
                        <select
                            value={templateSettings.font.weight}
                            onChange={(e) => updateFont("weight", e.target.value)}
                        >
                            <option value="Regular">Regular</option>
                            <option value="Bold">Bold</option>
                            <option value="Italic">Italic</option>
                            <option value="BoldItalic">Bold Italic</option>
                        </select>
                    </div>
                    <Input
                        label="Font color"
                        type="color"
                        value={templateSettings.font.color}
                        onChange={(e) => updateFont("color", e.target.value)}
                    />
                    <div className="input-group">
                        <label>Alignment</label>
                        <select
                            value={templateSettings.namePosition.align}
                            onChange={(e) => updatePosition("align", e.target.value)}
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <Input
                        label="Rotation"
                        type="number"
                        value={templateSettings.rotation}
                        onChange={(e) =>
                            setTemplateSettings((prev) => ({
                                ...prev,
                                rotation: Number(e.target.value) || 0,
                            }))
                        }
                    />
                    <Input
                        label="Maximum width"
                        type="number"
                        value={templateSettings.maxWidth || 0}
                        onChange={(e) =>
                            setTemplateSettings((prev) => ({
                                ...prev,
                                maxWidth: Number(e.target.value) || 0,
                            }))
                        }
                    />
                </div>
                </div>

                <div className="editor-buttons">

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Position"}
                    </button>

                </div>

            </div>

        </div>

    );

}

export default TemplateEditor;
