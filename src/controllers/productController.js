const productModel = require('../models/productModel')
const aws = require('aws-sdk')
const mongoose = require('mongoose')
const { is } = require('express/lib/request')
const { uploadFile } = require("../aws/awsController")



// ******************************************Validations ************************************************************ //

const isValidObjectId = function (ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

let stringRegex = /^[A-Za-z]{1}[A-Za-z 0-9-_]{1,1000}$/

let descriptionRegex = /^[A-Za-z1-9]{1}[A-Za-z 0-9.@#-_*]{1,10000}$/

let priceRegex = /^\d+(,\d{3})*(\.\d{1,2})?$/
let numberPattern = /^[0-9]{1}[0-9]{0,1000}$/


// let validForEnum = function (value) {
//     let enumValue = ["S", "XS", "M", "X", "L", "XXL", "XL"]
//     value = JSON.parse(value)
//     for (let x of value) {
//         if (enumValue.includes(x) == false) {
//             return false
//         }
//     }
//     return true
// }
// // ************************************************************* Ends ************************************************************ //

// const isValidDetails = function (requestBody) {
//     return Object.keys(requestBody).length > 0

// }
// const isValidSize = (sizes) => {
//     return ["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizes);
// }

// ************************************************************* Create products ************************************************************ //

const createProduct = async function (req, res) {
    try {

        let data = JSON.parse(JSON.stringify(req.body))

        let files = req.files
        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, message: "plzz enter some  data " })
        }


        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, productImage, isDeleted } = data

        // *****************------------------ Title validation ------------------------***************************** //

        if (!title) {

            return res.status(400).send({ status: false, message: "title is required" })
        }
        if (!stringRegex.test(title)) {

            return res.status(400).send({ Status: false, message: "title name is not valid" })
        }
        let duplicateTitle = await productModel.findOne({ title: title })

        if (duplicateTitle) {

            return res.status(400).send({ status: false, message: "title already exist" })
        }

        // ***************---------- Description Validation ---------------------------********************** //
        if (!description) {
            return res.status(400).send({ status: false, message: "description is required" })
        }
        if (!descriptionRegex.test(description)) {
            return res.status(400).send({ status: false, message: "plzz enter valid description" })
        }
        if (!price) {
            return res.status(400).send({ status: false, message: "price is required" })
        }
        if (!priceRegex.test(price)) {
            return res.status(400).send({ status: false, message: "plzz enter valid price" })
        }

        if (currencyId) {
            currencyId = currencyId.toUpperCase()
            if (currencyId !== "INR") {
                return res.status(400).send({ status: false, message: "Currency ID Must be in INR" })
            }
        } else {
            data.currencyId = "INR"
        }

        if (currencyFormat) {
            if (currencyId !== "₹") {
                return res.status(400).send({ status: false, message: "currency format must be ₹ " })
            }
        } else {
            data.currencyFormat = "₹"
        }

        // ------------------------------------if isFreeShipping coming from body---------------------------------------//
        if (isFreeShipping === "") {
            return res.status(400).send({ status: false, message: " plzz provide isFreeShipping,it must be Boolean " })
        }

        if (isFreeShipping) {

            isFreeShipping = isFreeShipping.toLowerCase()

            if (isFreeShipping == "true" || isFreeShipping == "false") {
                data.isFreeShipping = isFreeShipping
            }
            else {
                return res.status(400).send({ status: false, message: "is Free Shipping not a valid , Please use true/false" })
            }
        }
        //-----------------------------------------if style is given----------------------------------------------------------------------//
        if (style === "") {
            return res.status(400).send({ status: false, message: " plzz provide style " })
        }
        if (style) {
            if (!stringRegex.test(style)) {
                return res.status(400).send({ status: false, message: "enter valid style" })
            }
        }
        //----------------------------------------validation for availble sizes---------------------------------------------------//

        if (availableSizes === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid product size" })
        }

        if (availableSizes) {
            availableSizes=availableSizes.toUpperCase()
            let array = availableSizes.split(",").map(x => x.trim())
          
            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}`})
                }
                let uniqueAvailableSize= [...new Set(array)]   //if multiple size of same name
                data.availableSizes=uniqueAvailableSize
            }
        }


        if (installments) {
            if (!numberPattern.test(installments)) {
                return res.status(400).send({ status: false, message: "plzz provide valid installments" })
            }
        }

        if (files.length <= 0) {
            return res.status(400).send({ status: false, message: "plzz upload the product image files" })
        }

        var profileImage = await uploadFile(files[0])
        data.productImage = profileImage

        const productCreate = await productModel.create(data)
        return res.status(201).send({ status: true, message: "Success", data: productCreate })

    }

    catch (err) {
        return res.status(500).send({ Status: false, message: err.message })
    }

}
// **************************************** GET /products ************************************************************ //

const getProduct = async function (req, res) {
    try {
        let data = req.query
        let priceGreaterThan = req.query.priceGreaterThan
        let priceLessThan = req.query.priceLessThan
        let priceSort = req.query.priceSort
        let name = req.query.name
        let availableSizes = req.query.size;
        let title = name
        //console.log(availableSizes)
        //Fetching all products
        if (Object.keys(data).length == 0) {
            let allProdtucts = await productModel.find({ isDeleted: false })
            if (allProdtucts) {
                return res.status(200).send({ status: true, message: 'Success', data: allProdtucts })
            }
        }
        //Fetchin products using filters,
        if (title) {
            let filteredProducts = await productModel.find({ isDeleted: false, title: title }).collation({ locale: 'en', strength: 2 })
            if (filteredProducts.length === 0) {
                return res.status(404).send({ status: false, message: 'No Products Found' })
            }
            return res.status(200).send({ status: true, message: 'Success', data: filteredProducts })
        }
        if (availableSizes) {
            filteredProducts = await productModel.find({ isDeleted: false, availableSizes: availableSizes })
            return res.status(200).send({ status: false, message: 'Succes', data: filteredProducts })
        }
        if (priceSort) {
            if (!priceSort == 1 || !priceSort == -1) {
                return res.status(400).send({ status: false, message: 'Plz, Provide priceSort as 1 or -1' })
            }
        }

        // price range handling
        if (priceGreaterThan && priceLessThan) {
            if (priceGreaterThan === priceLessThan) {
                return res.status(400).send({ status: false, message: 'Plz, Provide valid price range' })
            }

            let productFound = await productModel.find({
                $and: [{ isDeleted: false }, { price: { $gt: priceGreaterThan } },
                { price: { $lt: priceLessThan } }]
            }).sort({ price: priceSort })
            if (productFound.length === 0) {
                return res.status(400).send({ status: false, message: "No products found" })

            }
            return res.status(200).send({ status: true, message: "Success", data: productFound })

        }

        if (priceGreaterThan) {
            let productFound = await productModel.find({ $and: [{ isDeleted: false }, { price: { $gt: priceGreaterThan } }] }).sort({ price: priceSort })
            console.log(productFound)
            if (productFound.length === 0) {
                return res.status(400).send({ status: false, message: "No available products" })
            }
            return res.status(200).send({ status: true, message: "Success", data: productFound })


        }
        else if (priceLessThan) {
            let productFound = await productModel.find({ $and: [{ isDeleted: false }, { price: { $lt: priceLessThan } }] }).sort({ price: priceSort })
            if (productFound.length === 0) {
                return res.status(400).send({ status: false, message: 'No available products' })
            }
            return res.status(200).send({ status: true, message: "Success", data: productFound })

        }
    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }

}

// ******************************************************** GET /products/:productId ******************************************************* //

const getProductById = async function (req, res) {
    try {
        const productId = req.params.productId



        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "product id is invalid" })
        }


        const findproduct = await productModel.findById(productId)

        if (!findproduct) {
            return res.status(400).send({ status: false, message: "product doesnt exists" })
        }

        if (findproduct.isDeleted == true) {
            return res.status(404).send({ status: false, message: "product is deleted" })
        }
        return res.status(200).send({ status: true, message: "product  found ", data: findproduct })


    }
    catch (err) {
        console.log("This is the error :", err.message)
        res.status(500).send({ msg: "Error", error: err.message })
    }
}


//--------------------------------------------------------Put api---------------------------------//
const UpdateProduct = async function (req, res) {
    try {
        let productId = req.params.productId


        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "product id is invalid" })
        }

        let checkProductId = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!checkProductId) {
            return res.status(400).send({ status: false, msg: "the product id is not valid/deleted product" })
        }

        //--------------------------------------------------------------------------------------------------//
        let data = JSON.parse(JSON.stringify(req.body))

        let files = req.files

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, productImage, isDeleted } = data


        // *********************************Title Validation ********************************************* //       

        if (title === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid title" })
        }

        if (title) {

            if (!stringRegex.test(title)) {

                return res.status(400).send({ Status: false, message: "title name is not valid" })
            }
            else {
                let duplicateTitle = await productModel.findOne({ title: title })

                if (duplicateTitle) {

                    return res.status(400).send({ status: false, message: "title already exist" })
                }
            }
        }

        // *************------------ Description Validation -------------------------------************** //
        if (description === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid description" })
        }

        if (description) {
            if (!stringRegex.test(description)) {
                return res.status(400).send({ status: false, message: "plzz enter valid description" })
            }
        }


        //------------------------------------Price Checking--------------------------------------------------//
        if (price === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid price" })
        }

        if (price) {
            if (!priceRegex.test(price)) {
                return res.status(400).send({ status: false, message: "plzz enter valid price" })
            }
        }

        // ---------------------------------------------------------------------------------------------------//

        if (currencyId === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid currencyId" })
        }

        if (currencyId) {
            currencyId = currencyId.toUpperCase()
            if (currencyId !== "INR") {
                return res.status(400).send({ status: false, message: "Currency ID Must be in INR" })
            }
            else {
                data.currencyId = "INR"
            }
        }
        //----------------------------------------------------------------------------------------------------------//
        if (currencyFormat === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid currencyFormat" })
        }
        if (currencyFormat) {
            if (currencyId !== "₹") {
                return res.status(400).send({ status: false, message: "currency format must be ₹ " })
            }
            else {
                data.currencyFormat = "₹"
            }
        }
        // -----------------------------------------------------------------------------------------------------------------//
        if (isFreeShipping === "") {
            return res.status(400).send({ status: false, message: " plzz provide isFreeShipping,it must be Boolean " })
        }

        if (isFreeShipping) {

            isFreeShipping = isFreeShipping.toLowerCase()

            if (isFreeShipping == "true" || isFreeShipping == "false") {
                data.isFreeShipping = data
            }
            else {
                return res.status(400).send({ status: false, message: "is Free Shipping not a valid , Please use true/false" })
            }
        }

        if (isDeleted === "") {
            return res.status(400).send({ status: false, message: " plzz provide the valid isDeleted " })
        }
        if (isDeleted) {
            if (isDeleted == "true" || isDeleted == "false") {
                data.isDeleted = data
            }
            else {
                return res.status(400).send({ status: false, message: " plzz provide the valid isDeleted either true/false " })
            }

        }

        if (style === "") {
            return res.status(400).send({ status: false, message: " plzz provide the valid style " })
        }
        if (style) {
            if (!stringRegex.test(style)) {
                return res.status(400).send({ status: false, message: "enter valid style" })
            }
        }
        //-----------------------------validation for installments-------------------------------------------//
        if (installments === "") {
            return res.status(400).send({ status: false, message: "plzz enter the installments" })
        }

        if (installments) {
            if (!numberPattern.test(installments)) {
                return res.status(400).send({ status: false, message: "plzz provide valid installments" })
            }
        }

        //------------------------If Available Sze to be update--------------------------------------------------//
        if (availableSizes === "") {
            return res.status(400).send({ status: false, message: "plzz provide the valid product size" })
        }

        if (availableSizes) {
            availableSizes=availableSizes.toUpperCase()
            let array = availableSizes.split(",").map(x => x.trim())
          
            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}`})
                }
                let uniqueAvailableSize= [...new Set(array)]
                data.availableSizes=uniqueAvailableSize
            }
        }

        //--------------------------------------If Profile image is to be update------------------------------------//


        if (files) {
            if (files.length > 0) {
                var productPic = await uploadFile(files[0])

                if (productPic.length === 0) {
                    return res.status(400).send({ status: false, message: "No file upload" })
                }

                data.productImage = productPic
            }

        }

        //-----------------------------------------------------------------------------------------------------//


        const updateData = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { title: title, description: description, price: price, currencyId: currencyId, currencyFormat: currencyFormat, productImage: productPic, installments: installments, style: style, isFreeShipping: isFreeShipping, availableSizes: availableSizes, isDeleted: isDeleted }, { new: true })

        if (!updateData) {
            return res.status(400).send({ status: false, message: "No data found to update" })
        }
        return res.status(201).send({ status: true, message: "Success", data: updateData })

    } catch (err) {
        res.status(500).send({ msg: "Error", error: err.message })
    }
}






//------------------------------{delete api}---------------------------------//

const deleteProduct = async function (req, res) {

    try {
        const productId = req.params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "not a valid product id" })
        }

        const findproduct = await productModel.findById(productId)

        if (!findproduct) {
            return res.status(404).send({ status: false, message: "product doesnt exists" })
        }
        if (findproduct.isDeleted == true) {
            return res.status(404).send({ status: false, message: "product Not Found" })
        }

        const deletedDetails = await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true })
        return res.status(200).send({ status: true, message: "product deleted", data: deletedDetails })
    }
    catch (err) {
        return res.status(500).send({ Status: false, message: err.message })
    }

}
module.exports = { createProduct, deleteProduct, getProductById, getProduct, UpdateProduct }
