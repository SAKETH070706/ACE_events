import Event from "../models/Event.js";
export const uploadTemplate = async (req, res, next) => {

    try {

        if (!req.file) {
            const err = new Error("No template uploaded.");
            err.statusCode = 400;
            throw err;
        }

        res.status(201).json({
            success: true,
            message: "Template uploaded successfully.",
            template: req.file
        });

    } catch (err) {
        next(err);
    }

};

export const updateTemplateSettings = async (req, res, next) => {

    try {

        const event = await Event.findById(req.params.id);

        if (!event) {

            return res.status(404).json({

                success:false,

                message:"Event not found"

            });

        }

        if(req.body.namePosition){

            event.template.namePosition = {

                ...event.template.namePosition,

                ...req.body.namePosition

            };

        }

        if(req.body.font){

            event.template.font = {

                ...event.template.font,

                ...req.body.font

            };

        }

        if(req.body.rotation !== undefined){

            event.template.rotation = req.body.rotation;

        }

        if(req.body.maxWidth !== undefined){

            event.template.maxWidth = req.body.maxWidth;

        }

        await event.save();

        res.json({

            success:true,

            template:event.template

        });

    }

    catch(err){

        next(err);

    }

};