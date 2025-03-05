import express , { Request , Response } from "express";
import zod, { string } from "zod";
import db from "@repo/db/client"

const app = express();

const paymentSchema = zod.object({
    token:zod.string(),
    userId:zod.number(),
    amount:zod.number()
})

//@ts-ignore
app.post("/hdfcWebhook", async (req : Request , res : Response) => {

    const {success} = paymentSchema.safeParse(req.body)

    if(!success){
        return res.status(500).json({
            msg:"The input is wrong"
        })
    }

    const paymentInformation = {        
        token: req.body.token,
        userId: req.body.user_identifier,
        amount: req.body.amount
    };

    try {
        await db.$transaction([
            db.balance.update({
                where: {
                    userId: Number(paymentInformation.userId)
                },
                data: {
                    amount: {
                        increment: Number(paymentInformation.amount)
                    }
                }
            }),
            db.onRampTransaction.update({
                where: {
                    token: paymentInformation.token
                }, 
                data: {
                    status: "Success",
                }
            })
        ]);

        res.json({
            message: "Captured"
        })
    } catch(e) {
        console.error(e);
        res.status(411).json({
            message: "Error while processing webhook"
        })
    }

    // Update balance in db, add txn --> done
})


app.listen(3002)