import mongoose from "mongoose"
import { WORKSPACE_ROLES } from "../../shared/constants/roles.constants.js";

const workspaceMemberSchema=new mongoose.Schema(
    {
       workspaceId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Workspace",
        required:true,
       },
       userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,

       },
           role: {
      type: String,
      enum: Object.values(WORKSPACE_ROLES),
      default: WORKSPACE_ROLES.MEMBER,
    },

    /**
     * When the member joined.
     * Different from createdAt — useful for audit displays.
     */
    joinedAt: {
      type: Date,
      default: Date.now,
    },



    },{
         timestamps: true 
    }
)
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ userId: 1 });           // "All workspaces for user" query
workspaceMemberSchema.index({ workspaceId: 1 }); 

export const WorkspaceMemberModel=mongoose.model("WorkspaceMember",workspaceMemberSchema)