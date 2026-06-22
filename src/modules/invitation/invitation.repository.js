import crypto from "crypto"
import { InvitationModel } from "./invitation.model.js"
import { BaseRepository } from "../../shared/repositories/BaseRepository.js"
import { raw } from "express"


class InvitationRepository extends BaseRepository{
    constructor(){
      super(InvitationModel)
    }

    async findByToken(rawToken){
        const hashed=crypto.createHash("sha256").update(rawToken).digest("hex")
        return InvitationModel.findOne({token:hashed}).select("+token")
    }

    async findPendingByEmailAndWorkspace(email,workspaceId){
        return InvitationModel.findOne({
            email,
            workspaceId,
            status:"PENDING"
        })
    }
    
    async findAllByWorkspace(workspaceId){
        return InvitationModel.find({workspaceId})
        .populate("invitedBy","name email")
        .sort({createdAt:-1});
    }


    async createInvitation({workspaceId,email,role,invitedBy}){
        const rawToken=crypto.randomBytes(32).toString("hex");
        const hashedToken=crypto.createHash("sha256").update(rawToken).digest("hex")

        await InvitationModel.create({
            workspaceId,
            email,
            role,
            invitedBy,
            token:hashedToken,
            expiresAt:new Date(Date.now()+7*24*60*60*1000)
        })

        return rawToken
    }

}

export const invitationRepository=new InvitationRepository()