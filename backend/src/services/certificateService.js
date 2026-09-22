import fs from "fs/promises";
import path from "path";
import {
    PDFDocument,
    StandardFonts,
    rgb,
    degrees
} from "pdf-lib";

const hexToRgb = (hex) => {

    hex = hex.replace("#", "");

    return rgb(
        parseInt(hex.substring(0, 2), 16) / 255,
        parseInt(hex.substring(2, 4), 16) / 255,
        parseInt(hex.substring(4, 6), 16) / 255
    );
};

const FONT_MAP = {
    TimesRoman: {
        Regular: StandardFonts.TimesRoman,
        Bold: StandardFonts.TimesRomanBold,
        Italic: StandardFonts.TimesRomanItalic,
        BoldItalic: StandardFonts.TimesRomanBoldItalic,
    },
    Helvetica: {
        Regular: StandardFonts.Helvetica,
        Bold: StandardFonts.HelveticaBold,
        Italic: StandardFonts.HelveticaOblique,
        BoldItalic: StandardFonts.HelveticaBoldOblique,
    },
    Courier: {
        Regular: StandardFonts.Courier,
        Bold: StandardFonts.CourierBold,
        Italic: StandardFonts.CourierOblique,
        BoldItalic: StandardFonts.CourierBoldOblique,
    },
};

const getPdfFont = (family, weight) => {
    const fonts = FONT_MAP[family] || FONT_MAP.TimesRoman;
    return fonts[weight] || fonts.Bold || StandardFonts.TimesRomanBold;
};

export const generateCertificate = async (
    templatePath,
    participantName,
    participantPhone,
    templateConfig
) => {

    const phone = String(participantPhone);

    // Read Template
    const imageBytes = await fs.readFile(templatePath);

    const pdfDoc = await PDFDocument.create();

    const pngImage = await pdfDoc.embedPng(imageBytes);

    const page = pdfDoc.addPage([
        pngImage.width,
        pngImage.height
    ]);

    page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height
    });

    // Font
    const font = await pdfDoc.embedFont(
        getPdfFont(
            templateConfig.font.family,
            templateConfig.font.weight
        )
    );
    const { width, height } = page.getSize();

    const configuredMaxWidth = Number(templateConfig.maxWidth) || 0;
    const MAX_WIDTH = configuredMaxWidth > 0 ? configuredMaxWidth : width * 0.9;

    const fontSize = templateConfig.font.size;
    let size = fontSize;

    while (size > 10 &&font.widthOfTextAtSize(participantName, size) > MAX_WIDTH) {
       size--;
    }

    const color = hexToRgb(
        templateConfig.font.color
    );

    // Text Width
    const textWidth =
        font.widthOfTextAtSize(
            participantName,
            size
        );
    
    let x;

    switch (templateConfig.namePosition.align) {

        case "left":
            x = templateConfig.namePosition.x;
            break;

        case "right":
            x =
                templateConfig.namePosition.x -
                textWidth;
            break;

        case "center":
default:
    x =
        templateConfig.namePosition.x -
        textWidth / 2;
    }

   const ascent = size * 0.8;

const y =
    height -
    templateConfig.namePosition.y -
    ascent;
    page.drawText(participantName, {

        x,
        y,

        size: size,

        font,

        color,

        rotate: degrees(
            Number(templateConfig.rotation) || 0
        )
    });

    const pdfBytes = await pdfDoc.save();

    // Create generated folder
    const generatedDir = path.join(
        process.cwd(),
        "src",
        "generated"
    );

    await fs.mkdir(generatedDir, {
        recursive: true
    });
    const safeName =
    participantName
        .normalize("NFKD")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim() || "participant";
   const phoneSuffix = participantPhone
    ? String(participantPhone).slice(-6)
    : String(Date.now()).slice(-6);

const outputPath = path.join(
    generatedDir,
    `${safeName}-${phoneSuffix}.pdf`
);
   

    await fs.writeFile(
        outputPath,
        pdfBytes
    );

    return outputPath;
};
