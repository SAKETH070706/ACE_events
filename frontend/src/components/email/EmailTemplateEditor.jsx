import { Extension } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { renderTemplate } from "../../utils/templates";
import "./EmailTemplateEditor.css";

const FontSize = Extension.create({
    name: "fontSize",
    addGlobalAttributes() {
        return [
            {
                types: ["textStyle"],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
});

const editorExtensions = [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    FontSize,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false }),
];

function EmailTemplateEditor({
    value = "",
    onChange,
    variables = [],
    previewVariables = {},
}) {
    const editor = useEditor({
        extensions: editorExtensions,
        content: value || "<p></p>",
        onUpdate: ({ editor: current }) => {
            onChange?.(current.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (value && value !== current) {
            editor.commands.setContent(value, false);
        }
    }, [value, editor]);

    if (!editor) return null;

    const insertVariable = (key) => {
        editor.chain().focus().insertContent(`{{${key}}}`).run();
    };

    const setLink = () => {
        const url = window.prompt("Enter URL");
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <div className="email-editor">
            <div className="email-toolbar">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
                    B
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
                    I
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    U
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    H
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    List
                </button>
                <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                    Left
                </button>
                <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                    Center
                </button>
                <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                    Right
                </button>
                <button type="button" onClick={setLink}>
                    Link
                </button>
                <select
                    onChange={(e) =>
                        editor.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run()
                    }
                    defaultValue=""
                >
                    <option value="" disabled>
                        Font size
                    </option>
                    <option value="14px">14</option>
                    <option value="16px">16</option>
                    <option value="18px">18</option>
                    <option value="24px">24</option>
                    <option value="32px">32</option>
                </select>
                <input
                    type="color"
                    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    title="Text color"
                />
                <select
                    defaultValue=""
                    onChange={(e) => {
                        if (e.target.value) insertVariable(e.target.value);
                        e.target.value = "";
                    }}
                >
                    <option value="" disabled>
                        Insert Variable
                    </option>
                    {variables.map((variable) => (
                        <option key={variable.key} value={variable.key}>
                            {variable.label}
                        </option>
                    ))}
                </select>
            </div>

            <EditorContent editor={editor} className="email-editor-content" />

            <div className="email-preview">
                <h3>Live Preview</h3>
                <div
                    className="email-preview-body"
                    dangerouslySetInnerHTML={{
                        __html: renderTemplate(value || "", previewVariables),
                    }}
                />
            </div>
        </div>
    );
}

export default EmailTemplateEditor;
