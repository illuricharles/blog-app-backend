import { Router } from "express";
import { UserSchema } from "@charles_ben/zod-validation-blog-app";
import prisma from "../db";
import  bcrypt from "bcrypt"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import jwt from "jsonwebtoken"

const router = Router()

router.post('/register', async (req, res) => {
    const {username, password} = req.body
    const validationDetails = UserSchema.safeParse({
        username,
        password
    })
    if(!validationDetails.success) {
        res.status(400).json({
            message: validationDetails.error.errors[0].message
        })
        return
    }
    const {data} = validationDetails
    
    try {
        const hashedPassword = await bcrypt.hash(data.password, 10)

        const response = await prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword
            }
        })
        res.status(201).json({
            message: "user created successfully."
        })
        return 
    }
    catch(e) {
        if(e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
            res.status(409).json({
                message: "username already exist."
            })
            return
        }
        res.status(500).json({
            message: "Internal Server Error."
        })
        return

    }
})

router.post('/signin', async(req, res) => {
    const {username, password} = req.body
    const validateData = UserSchema.safeParse({
        username,
        password
    })
    if(!validateData.success) {
        res.status(400).json({
            message: validateData.error.errors[0].message || "username or password is in invalid format."
        })
        return
    }
    const {data} = validateData
    try {
        const user = await prisma.user.findUnique({
            where: {
                username: data.username
            }
        })

        if(!user) {
            res.status(400).json({
                message: "username or password is invalid."
            })
            return 
        }

        const isHashPasswordSame = await bcrypt.compare(data.password, user.password)
        if(!isHashPasswordSame) {
            res.status(400).json({
                message: "Invalid username or password"
            })
            return 
        }
        if(process.env.JWT_SECRET) {
            const token = jwt.sign({id: user.id}, process.env.JWT_SECRET)
            res.cookie("token", token, {
                maxAge: 86400000,
                httpOnly: false, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            })
            res.status(200).json({
                message: "user login successful."
            })
            return
        }
        else {
            throw new Error("invalid jwt secret")
        }


    }catch(e) {
        res.status(500).json({
            message: "Internal server error."
        })
        return 
    }
})




export default router