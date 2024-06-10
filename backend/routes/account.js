const express = require('express');
const { authMiddleware } = require('../middleware');
const { Account } = require('../db');
const { default: mongoose } = require('mongoose');

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
    const account = await Account.findOne({
        userId: req.userId
    });

    res.json({
        balance: account.balance
    })
});

router.post("/transfer", authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();

   try {session.startTransaction();
    const { amount, to } = req.body;

    const account = await Account.findOne({ userId: req.userId }).session(session);

    if (!account || account.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
            message: "Insufficient balance"
        });
    }

    const toAccount = await Account.findOne({ userId: to }).session(session);

    if( account.userId.toString()  === toAccount.userId.toString() ){
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
            message: "Transferring to same account"
        })
    }

    if (!toAccount) {
        await session.abortTransaction();
        return res.status(400).json({
            message: "Invalid account"
        });
    }

    account.balance -= amount;
    toAccount.balance += amount;

    await account.save({ session });
    await toAccount.save({ session });

    // await Account.updateOne({ userId: req.userId }, { $inc: { balance: -amount } }).session(session);
    // await Account.updateOne({ userId: to }, { $inc: { balance: amount } }).session(session);

    await session.commitTransaction();
    session.endSession();
    res.json({
        message: "Transfer successful"
    });
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;