import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"

interface User {
    id: string
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const {token} = req.cookies
    if(!token) {
        res.status(401).json({
            message: "Please login."
        })
        return
    }
    try {
        if(process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET) as User
                req.userId = decoded.id
                next()

            }catch(e) {
                res.clearCookie('token')
                res.status(403).json({
                    message: "Invalid or expired token."
                })
                return
            }
        }
        else {
            throw new Error("invalid jwt secret") 
        }

    }catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal server error."
        })
    } 

}