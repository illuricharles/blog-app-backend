import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../db";
import { PostSchema } from "@charles_ben/zod-validation-blog-app";
import { date } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const router = Router()


router.post('/', authMiddleware, async(req, res) => {
    if(!req.userId) {
        res.status(401).json({
            message: "Unauthorized: User not authenticated"
        })
        return
    }
    const {title, content, description, imageUrl} = req.body
    
    const validationDetails = PostSchema.safeParse({
        title,
        content,
        description,
        imageUrl
    })
    if(!validationDetails.success) {
        res.status(400).json({
            message: validationDetails.error.errors[0].message || "Invalid data"
        })
        return 
    }
    const {data} = validationDetails
    try {

        
        const postDetails = await prisma.post.create({
            data: {
                title: data.title,
                content: data.content,
                description: data.description,
                authorId: req.userId,
                imageUrl: data.imageUrl
            }
        })
        res.status(201).json({
            post: postDetails
        })
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal server error"
        })
        return
    }
})

router.post('/comment', authMiddleware, async(req, res) => {
    const {comment, postId}: {
        comment: string,
        postId: string
    } = req.body
    if(req.userId === undefined) {
        res.status(401).json({
            message: "user is unauthorized."
        })
        return 
    }
    if(comment === null || comment === undefined || comment.length === 0) {
        res.status(400).json({
            message: "comment shouldn't be empty."
        })
        return
    }
    if(postId === null || postId === undefined) {
        res.status(400).json({
            message: "Invalid post details."
        })
        return 
    }

    try {
        const post = await prisma.post.findUnique({
            where: {
                id: postId
            }
        })
        if(post === null) {
            res.status(400).json({
                message: "Invalid post details"
            })
            return 
        }
        const response = await prisma.comment.create({
            data: {
                comment,
                userId: req.userId,
                postId
            },
            select: {
                id: true,
                comment: true,
                userId: true,
                postId: true,
                createdAt: true,
                user: {
                    select: {
                        username: true
                    }
                }
                
            }
        })

        res.status(201).json({
            comment: response
        })
        return 
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal server error."
        })
    }

})

router.get('/', async (req, res) => {
    const search = req.query.search || ""
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 9)
    try {
        const posts = await prisma.post.findMany({
           where: search ?
           {
            OR: [
                {
                    title: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                },
                {
                    content: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                },
                {
                    description: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                }
            ]
           }
           : {},
            include: {
                author: {
                    select:{
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page-1) * limit,
            take: limit,

        })
        const totalPosts = await prisma.post.count({
            where: search ?
           {
            OR: [
                {
                    title: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                },
                {
                    content: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                },
                {
                    description: {
                        contains: String(search),
                        mode: "insensitive"
                    }
                }
            ]
           }
           : {},
        })

        res.status(200).json({
            posts,
            totalPosts,
            totalPages :Math.ceil(totalPosts/limit),
            currentPage: page
        })
        
        return
    }catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal server error"
        })
        return
    }
})

router.get('/user/posts', authMiddleware, async(req, res) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 9

    try {
        const posts = await prisma.post.findMany({
            where: {
                authorId: req.userId
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: (page - 1) * limit,
            take: limit
        })

        const totalPosts = await prisma.post.count({
            where: {
                authorId: req.userId
            }
        })

        res.status(200).json({
            posts,
            totalPosts,
            totalPages :Math.ceil(totalPosts/limit),
            currentPage: page
        })
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal Server Error."
        })
    }
})

router.get('/:postId', async (req, res) => {
    const {postId} = req.params
    try {
        const post = await prisma.post.findUnique({
            where: {
                id: postId
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                comments: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    select: {
                        id: true,
                        comment: true,
                        userId: true,
                        createdAt: true,
                        user: {
                            select: {
                                username: true
                            }
                        }
                    },
                    
                }
            }
        })
        res.json({
            post
        })
        return
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal server error"
        })
        return 
    }
})

router.put('/:postId',authMiddleware, async(req, res) => {
    const {title, content, description, imageUrl} = req.body
    const {postId} = req.params
   try {
    
        const post = await prisma.post.findUnique({
            where: {
                id: postId,
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                }
            }
        })

        if(post === null) {
            res.status(404).json({
                message: "Post Not Found."
            })
            return 
        }

        if(post.authorId !== req.userId) {
            res.status(403).json({
                message: "Your can't able to edit another users posts."
            })
            return
        }

        const validationDetails = PostSchema.safeParse({title, content, description})
        if(!validationDetails.success) {
            res.status(400).json({
                message: validationDetails.error.errors[0].message || "Invalid data."
            })
            return
        }

        const {data} = validationDetails

        const updatedPost = await prisma.post.update({
            where: {
                id: postId,
                authorId: req.userId
            },
            data: {
                title: data.title,
                content: data.content,
                description: data.description,
                imageUrl
            }
        })

        res.status(200).json({
            message: "post updated successfully"
        })
        return
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal Server Error."
        })
        return
    }
})

router.delete('/:postId', authMiddleware, async(req, res) => {
    const {postId} = req.params
    try {

        
        const post = await prisma.post.findFirst({
            where: {
                id: postId
            }
        })
        if(post === null) {
            res.status(404).json({
                message: "Post not found."
            })
            return
        }
        if(post.authorId !== req.userId) {
            res.status(403).json({
                message: "You can't able to delete another user posts."
            })
            return
        }
        const response = await prisma.post.delete({
            where: {
                id: postId,
                authorId: req.userId
            }
        })
        res.status(200).json({
            message: "Post deleted successfully."
        })
        return 
    }
    catch(e) {
        console.log(e)
        res.status(500).json({
            message: "Internal Server Error."
        })
        return
    }

})

router.delete('/comment/:commentId', authMiddleware, async(req, res) => {
    const {commentId} = req.params
    try {
        const comment = await prisma.comment.delete({
            where: {
                id: commentId,
                userId: req.userId
            }
        })
        res.status(200).json({
            comment,
            message: "comment deleted successfully."
        })
    }
    catch(e) {
        if(e instanceof PrismaClientKnownRequestError) {
            if(e.code === 'P2025') {
                res.status(404).json({
                    message: "Comment doesn't exist."
                })
                return
            }
            else {
                res.status(500).json({
                    message: "Internal Server Error."
                })
                return
            }
        }
        else {
            res.status(500).json({
                message: "Internal Server Error."
            })
            return
        }
    }
})




export default router