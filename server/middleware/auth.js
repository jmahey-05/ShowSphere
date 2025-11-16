import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next)=>{
    try {
        const { userId } = req.auth();

        const user = await clerkClient.users.getUser(userId)

        if(user.privateMetadata.role !== 'admin'){
            return res.json({success: false, message: "not authorized"})
        }

        next();
    } catch (error) {
        return res.json({ success: false, message: "not authorized" });
    }
}

// Middleware to require authentication for regular users
export const requireAuth = async (req, res, next)=>{
    try {
        const { userId } = req.auth();
        
        if (!userId) {
            return res.status(401).json({success: false, message: "Authentication required. Please login to proceed."});
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication required. Please login to proceed." });
    }
}