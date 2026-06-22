import mongoose from "mongoose"

const workspaceSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"workspace name is required"],
        trim:true,
        minlength:[2,"name must be at least 2 characters"],
        maxlength:[50,"name cannot exceed 50 characters"]
    },
    slug:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"]
    },
    description:{
        type:String,
        trim:true,
        maxlength:[200,"description cannot exceed 200 characters"],
        default:null,
    },
    logo:{
        type:String,
        default:null
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    isInviteOnly:{
        type:Boolean,
        default:true,
    },

},{
    timestamps:true
})

       
workspaceSchema.index({ owner: 1 });        // "My workspaces" query


export const WorkspaceModel=mongoose.model("Workspace",workspaceSchema);