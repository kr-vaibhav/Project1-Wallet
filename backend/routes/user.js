const express = require("express");

const router = express.Router();

const jwt = require("jsonwebtoken");

const { Account } = require("../db");

const { User } = require("../db");

const { JWT_SECRET } = require("../config");

const zod = require("zod");
const { authMiddleware } = require("../middleware");

const signupSchema = zod.object({
    username : zod.string().email({message: "Invalid email address"}),
    firstName : zod.string().max(50),
    lastName : zod.string().max(50),
    password : zod.string().min(6)
});

router.post("/signup", async (req,res)=>{

    const userBody = req.body;
    const { success } = signupSchema.safeParse(req.body)

    if(!success){
        return res.status(400).json({
            message : "Email already taken / Incorrect inputs"
        });
    }

    
    try {
        const existingUser = await User.findOne({
            username: userBody.username
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'Email already taken / Incorrect inputs'
            });
        }

        const dbUser = await User.create({
            username: userBody.username,
            password: userBody.password,
            firstName: userBody.firstName,
            lastName: userBody.lastName
        });

        const userId = dbUser._id;

        console.log('User created successfully', dbUser);

        const account = await Account.create({
            userId,
            balance: 1 + Math.random() * 10000
        });

        console.log('Account created successfully', dbUser);

        const token = jwt.sign({
            userId
        }, JWT_SECRET);

        console.log('token created successfully', dbUser);


        res.json({
            message: 'User created successfully',
            token: token
        });

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({
            message: 'Internal Server Error'
        });
    }

});

const signinSchema = zod.object({
    username: zod.string().email(),
    password: zod.string().min(6)
})

router.post("/signin", async (req,res)=>{

    const { success } = signinSchema.safeParse(req.body);

    if(!success){
        return res.status(411).json({
            message : "Error while logging in"
        })
    }

    const existingUser = await User.findOne({
        username : req.body.username
    })

    if(existingUser){

        const token = jwt.sign({
            userId : existingUser._id
        },JWT_SECRET);
    
        res.json({
            token: token
        })

        return;
    }
    
    res.status(411).json({
        message : "Error while logging in"
    })
})

const updateBody = zod.object({
    password : zod.string().optional(),
    firstName : zod.string().optional,
    lastName : zod.string().optional
})


router.put("/", authMiddleware, async (req,res)=>{
    
    const { success } = updateBody.safeParse(req.body);

    if(!success){
        return res.status(411).json({
            message: "Error while updating information"
        })
    }

    await User.updateOne(req.body, {
        id: req.userId
    })
    
    res.json({
        message : "Updated Successfully"
    })


})


router.get("/bulk", authMiddleware, async(req,res)=>{

    const filter = req.query.filter || "";

    const users = await User.find({

        $or : [{
            firstName : {
                "$regex": filter
            }
        },{
            lastName :{
                "$regex": filter
            }
        }]
    })

    res.json({
        user : users.map(user=>({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })

    
})


module.exports = router;