import Joi from "joi"

export const sendInvitationSchema=Joi.object({
    email:Joi.string().email().required(),
    role:Joi.string().valid("ADMIN","MEMBER").default("MEMBER")
})

export const acceptInvitationSchema=Joi.object({
    token:Joi.string().required()
})


