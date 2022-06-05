const cartModel= require("../models/cartModel")
const orderModel = require("../models/orderModel")
const productModel=require("../models/productModel")
const userModel = require("../models/userModel")
const mongoose =require("mongoose")


//--------------------------------------------------------------------------//
const isValidObjectId = function (ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

//--------------------------------------------------------------------------//


const createOrder = async function(req,res){
    try{
        let body = req.body

        if(Object.keys(body).length===0){
            return res.status(400).send({Status: false , message: "Please enter some data in body"})
        }

        let{cartId,status,cancellable}=body

      
        if(!isValidObjectId(cartId)){
                return res.status(400).send({Status: false , message: "Please enter valid cartId"})
        }

        //-----------------------------Cart it existing validation -----------------------------------//

        let checkCartId = await cartModel.findById({_id:cartId})

        if(!checkCartId){
            return res.status(400).send({Status: false , message: "cart does not exist"})
        }



        //--------------checking userId in cart model , it exist or not -----------------------------//

        let checkUserwithCart= await cartModel.findOne({_id:cartId, userId:req.params.userId})
        if(!checkUserwithCart){
            return res.status(400).send({Status: false , message: "no cart found with this userId/cartId"})
        }

        if(checkUserwithCart.items.length === 0){
            return res.status(400).send({Status: false , message: "sorry cart has no items"})
        }


        if(checkUserwithCart.items.length>0){
            let sum = 0

            for(let i = 0 ; i<checkUserwithCart.items.length; i++ ){
                sum =sum + checkUserwithCart.items[i].quantity  
            }
            body.totalQuantity=sum     // this one is calculating total quantity
        }

        if(status || status == ""){
            status = status.toLowerCase()
            if(status == "pending" ||status == "completed" || status == "cancelled" ){
                body.status = status
            }else{
                return res.status(400).send({Status: false , message: "Please enter valid status"})
            }
        }

        if(cancellable || cancellable == ""){
          
            if(typeof cancellable === "boolean"){
                body.cancellable=cancellable
            }
           else{
                return res.status(400).send({Status: false , message: "Please enter valid cancellable, it must be boolean without having string"})
            }
        }



        body.totalItems = checkUserwithCart.totalItems
        body.items = checkUserwithCart.items
        body.totalPrice = checkUserwithCart.totalPrice
        body.userId=req.params.userId
        
        let createOrder = await orderModel.create(body)

        let findCreatedOrder =await orderModel.findById({_id:createOrder._id}).select({ "__v": 0})

        return res.status(201).send({ status: true, message: "Success", data: findCreatedOrder })

    }catch(err){
        return res.status(500).send({Status: false , message: err.message})
    }
}


const updateOrder= async function(req,res){
    try{

        let body=req.body

        let {orderId}=body

        if(Object.keys(body).length === 0 ){
            return res.status(400).send({Status: false , message: "Please provide data"})   
        }

        if(!orderId || orderId == ""){
            return res.status(400).send({Status: false , message: "Please provide orderId"})
        }
        if(!isValidObjectId(orderId)){
            return res.status(400).send({Status: false , message: "Please provide valid orderId"})  
        }

        let checkUser= await orderModel.findOne({userId:req.params.userId,isDeleted:false})
        if(!checkUser){
            return res.status(404).send({Status: false , message: "user has not created any order"})   
        }
        let checkOrder = await orderModel.findOne({_id:orderId,isDeleted:false})
        if(!checkOrder){
            return res.status(404).send({Status: false , message: "no order found with given orderId"})   
        }

        if(checkOrder.userId != req.params.userId){
            return res.status(400).send({Status: false , message: "This user does not exist this order"}) 
        }

        if(checkOrder.status === "cancelled"){
            return res.status(400).send({Status: false , message: "Your order has been cancelled"})  
        }

        if(checkOrder.cancellable == true){
            let updateOrderDetail= await orderModel.findOneAndUpdate({_id:orderId,isDeleted:false},{status:"cancelled",isDeleted:true,deletedAt: Date.now()},{new:true}).select({ "__v": 0})

            if(!updateOrderDetail){
                return res.status(400).send({Status: false , message: "Sorry it can not be cancelled"})   
            }

            return res.status(200).send({ status: true, message: "Success", data: updateOrderDetail })
        }

        return res.status(400).send({Status: false , message: "You can not cancelled this Item"})


    }catch(err){
        return res.status(500).send({Status: false , message: err.message})
    }
}


module.exports={createOrder,updateOrder}