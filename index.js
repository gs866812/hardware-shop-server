const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 4000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@graphicsaction.dpne6.mongodb.net/?retryWrites=true&w=majority&appName=Graphicsaction`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@hardwarestore.bbhhx17.mongodb.net/?retryWrites=true&w=majority&appName=hardwareStore`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();
    const database = client.db("hardwareShop");
    const categoryCollections = database.collection("categoryList");
    const brandCollections = database.collection("brandList");
    const unitCollections = database.collection("unitList");
    const productCollections = database.collection("productList");
    const supplierCollections = database.collection("supplierList");
    const transactionCollections = database.collection("transactionList");
    const mainBalanceCollections = database.collection("mainBalanceList");
    const costingBalanceCollections = database.collection("costingBalanceList");
    const tempPurchaseProductCollections = database.collection(
      "tempPurchaseProductList"
    );
    const tempSalesProductCollections = database.collection(
      "tempSalesProductList"
    );
    const stockCollections = database.collection("stockList");
    const purchaseInvoiceCollections = database.collection(
      "purchaseInvoiceList"
    );
    const salesInvoiceCollections = database.collection(
      "salesInvoiceList"
    );
    const customerCollections = database.collection("customerList");
    const supplierDueCollections = database.collection("supplierDueList");
    const customerDueCollections = database.collection("customerDueList");

    // add product
    app.post("/addProducts", async (req, res) => {
      const { product, categoryName, brandName, unitName } = req.body;
      const productName = product;

      const findCategory = await categoryCollections.findOne({
        category: categoryName,
      });
      const categoryCode = findCategory.categoryCode;

      // Find the latest product for the given category
      const latestProduct = await productCollections.findOne(
        { categoryName },
        { sort: { productCode: -1 } }
      );

      let productCode;
      if (latestProduct) {
        // Extract the numeric part of the product code and increment it
        const numericPart =
          parseInt(latestProduct.productCode.toString().slice(-5)) + 1;
        productCode = parseInt(
          `${categoryCode}${numericPart.toString().padStart(5, "0")}`
        );
      } else {
        // If no product exists for the category, start with 1
        productCode = parseInt(`${categoryCode}00001`);
      }

      const isExist = await productCollections.findOne({ productName });
      if (isExist) {
        res.json("Product already exists");
      } else {
        const result = await productCollections.insertOne({
          productName,
          categoryName,
          brandName,
          unitName,
          productCode,
        });
        res.send(result);
      }
    });

    // show products
    app.get("/products", async (req, res) => {
      // const products = await productCollections.find().toArray();
      const products = await productCollections
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(products);
    });

    // update product
    app.put("/updateProduct/:id", async (req, res) => {
      const id = req.params.id;
      const { updateProductName, updateCategory, updateBrand, updateUnit } =
        req.body;
      const checkProduct = updateProductName;

      // const isExist = await productCollections.findOne({productName: checkProduct});
      //   if(isExist) {
      //     res.json('Product already exists');
      //     return;
      //   }

      // update product code if category changed
      const findCategory = await categoryCollections.findOne({
        category: updateCategory,
      });
      const categoryCode = findCategory.categoryCode;

      // Check if the category has changed
      const existingProduct = await productCollections.findOne({
        _id: new ObjectId(id),
      });
      const categoryChanged = existingProduct.categoryName !== updateCategory;

      // Find the latest product for the given category
      const latestProduct = await productCollections.findOne(
        { updateCategory },
        { sort: { productCode: -1 } }
      );

      let productCode;
      if (categoryChanged) {
        // If the category has changed, start the product code serially for the new category
        const latestProduct = await productCollections.findOne(
          { categoryName: updateCategory },
          { sort: { productCode: -1 } }
        );
        if (latestProduct) {
          const numericPart =
            parseInt(latestProduct.productCode.toString().slice(-5)) + 1;
          productCode = parseInt(
            `${categoryCode}${numericPart.toString().padStart(5, "0")}`
          );
        } else {
          productCode = parseInt(`${categoryCode}00001`);
        }
      } else {
        // If the category hasn't changed, retain the existing product code
        productCode = existingProduct.productCode;
      }
      //
      const filter = { _id: new ObjectId(id) };
      const updateInfo = {
        $set: {
          productName: updateProductName,
          categoryName: updateCategory,
          brandName: updateBrand,
          unitName: updateUnit,
          productCode: productCode,
        },
      };
      const result = await productCollections.updateOne(filter, updateInfo);
      res.send(result);
    });

    // delete product
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollections.deleteOne(query);
      res.send(result);
    });

    // add category collection
    app.post("/addCategory", async (req, res) => {
      const { categoryValue, categoryCodeValue } = req.body;
      const categoryInfo = {
        category: categoryValue,
        categoryCode: categoryCodeValue,
      };

      // check if category and category code is already exists
      const isExist = await categoryCollections.findOne({
        category: categoryValue,
      });
      let isCategoryCode = await categoryCollections.findOne({
        categoryCode: categoryCodeValue,
      });

      if (isExist) {
        res.json("Category already exists");
      } else if (isCategoryCode) {
        res.json(
          `Category code used for ${isCategoryCode.category}`
        );
      } else {
        const result = await categoryCollections.insertOne(categoryInfo);
        res.send(result);
      }
    });
    // show category collection
    app.get("/categories", async (req, res) => {
      const result = await categoryCollections.find().toArray();
      res.send(result);
    });

    // add brand collection
    app.post("/brands/:brand", async (req, res) => {
      const brandName = { brand: req.params.brand };
      const isExist = await brandCollections.findOne(brandName);
      if (isExist) {
        res.json("Brand already exists");
      } else {
        const result = await brandCollections.insertOne(brandName);
        res.send(result);
      }
    });

    // show brand collections
    app.get("/brands", async (req, res) => {
      const result = await brandCollections.find().toArray();
      res.send(result);
    });

    // add unit collection
    app.post("/units/:unit", async (req, res) => {
      const unitName = { unit: req.params.unit };
      const isExist = await unitCollections.findOne(unitName);
      if (isExist) {
        res.json("Brand already exists");
      } else {
        const result = await unitCollections.insertOne(unitName);
        res.send(result);
      }
    });

    // show unit collections
    app.get("/units", async (req, res) => {
      const result = await unitCollections.find().toArray();
      res.send(result);
    });

    // add supplier.....................................
    app.post("/addSupplier", async (req, res) => {
      const supplierInfo = req.body;
      const { supplierName } = supplierInfo;
      const isSupplierExist = await supplierCollections.findOne({
        supplierName,
      });

      //add supplier list with serial
      const recentSupplier = await supplierCollections
      .find()
      .sort({ serial: -1 })
      .limit(1)
      .toArray();
  
    let nextSerial = 10; // Default starting serial number
    if (recentSupplier.length > 0 && recentSupplier[0].serial) {
      nextSerial = recentSupplier[0].serial + 1;
    }
    const newSupplierInfo = {...supplierInfo, serial: nextSerial};

      if (isSupplierExist) {
        res.json("Supplier already exists");
      } else {
        const result = await supplierCollections.insertOne(newSupplierInfo);
        res.send(result);
      }
    });

    // show supplier
    app.get("/suppliers", async (req, res) => {
      const result = await supplierCollections
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // update supplier
    app.put("/updateSupplier/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { supplierName, contactPerson, contactNumber, supplierAddress } =
        req.body;

      // const isSupplierExist = await supplierCollections.findOne({supplierName});
      // if(isSupplierExist){
      //   res.json('Supplier already exists');
      //   return;
      // }

      const updateInfo = {
        $set: {
          supplierName,
          contactPerson,
          contactNumber,
          supplierAddress,
        },
      };

      const result = await supplierCollections.updateOne(filter, updateInfo);
      res.send(result);
    });

    // delete supplier
    app.delete("/deleteSupplier/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await supplierCollections.deleteOne(query);
      res.send(result);
    });

    // add total balance
    app.post("/addBalance", async (req, res) => {
      const { note, date, type } = req.body;
      const parseAmount = parseFloat(req.body.confirmAmount);
      const newBalance = parseFloat(parseAmount.toFixed(2));

      const existingBalanceDoc = await mainBalanceCollections.findOne();
      if (existingBalanceDoc) {
        // Update existing document by adding newBalance to mainBalance
        const updatedMainBalance = existingBalanceDoc.mainBalance + newBalance;
        await mainBalanceCollections.updateOne(
          {},
          { $set: { mainBalance: updatedMainBalance } }
        );
      } else {
        // Insert new document with newBalance as mainBalance
        await mainBalanceCollections.insertOne({ mainBalance: newBalance });
      }

      //add transaction list with serial
      const recentSerialTransaction = await transactionCollections
      .find()
      .sort({ serial: -1 })
      .limit(1)
      .toArray();
  
    let nextSerial = 10; // Default starting serial number
    if (recentSerialTransaction.length > 0 && recentSerialTransaction[0].serial) {
      nextSerial = recentSerialTransaction[0].serial + 1;
    }
      

      const result = await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: newBalance,
        note,
        date,
        type,
      });

      res.send(result);
    });

    // costing balance
    app.post("/costingBalance", async (req, res) => {
      const { note, date, type } = req.body;
      const parseAmount = parseFloat(req.body.confirmCostAmount);
      const newCostingBalance = parseFloat(parseAmount.toFixed(2));

      // find main balance to update/deduct
      const existingBalanceDoc = await mainBalanceCollections.findOne();
      if (existingBalanceDoc.mainBalance >= newCostingBalance) {
        // Update balance by deducting new costingBalance
        const updatedMainBalance =
          existingBalanceDoc.mainBalance - newCostingBalance;
        await mainBalanceCollections.updateOne(
          {},
          { $set: { mainBalance: updatedMainBalance } }
        );
      } else {
        // await mainBalanceCollections.insertOne({ mainBalance: newCostingBalance });
        return res.json("Insufficient balance");
      }

      const existingCostingBalanceDoc =
        await costingBalanceCollections.findOne();
      if (existingCostingBalanceDoc) {
        // Update existing cost document by adding newCosting to costingBalance
        const updatedCostingBalance =
          existingCostingBalanceDoc.costingBalance + newCostingBalance;
        await costingBalanceCollections.updateOne(
          {},
          { $set: { costingBalance: updatedCostingBalance } }
        );
      } else {
        // Insert new document with newCostingBalance as costingBalance
        await costingBalanceCollections.insertOne({
          costingBalance: newCostingBalance,
        });
      }

      //add transaction list with serial
      const recentSerialTransaction = await transactionCollections
      .find()
      .sort({ serial: -1 })
      .limit(1)
      .toArray();
  
    let nextSerial = 10; // Default starting serial number
    if (recentSerialTransaction.length > 0 && recentSerialTransaction[0].serial) {
      nextSerial = recentSerialTransaction[0].serial + 1;
    }

      const result = await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: newCostingBalance,
        note,
        date,
        type,
      });

      res.send(result);
    });

    // show main balance only
    app.get("/mainBalance", async (req, res) => {
      const result = await mainBalanceCollections.find().toArray();
      res.send(result);
    });

    // show costing balance only
    app.get("/costingBalance", async (req, res) => {
      const result = await costingBalanceCollections.find().toArray();
      res.send(result);
    });

    // show all transactions list............................................
    app.get("/allTransactions", async (req, res) => {
      const serial = 10;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await transactionCollections
        .find()
        .skip((page - 1) * size)
        .limit(size)
        .sort({_id: -1 })
        .toArray();
      res.send(result);
    });

 
    // .....................................................................

    app.get("/transactionCount", async (req, res) => {
      const count = await transactionCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // .....................................................................................
    app.post('/getSalesPrice/:id', async (req, res) => {
      const productID = req.params.id;
      const findProduct = await stockCollections.findOne({productID});
      if(findProduct){
        res.send(findProduct);
      }else{
        res.json('Stock not available');
      }
    })
    // .....................................................................................

    //set temp sales product list
    app.post("/adTempSalesProductList", async (req, res) => {
      const {
        productID,
        productTitle,
        brand,
        salesQuantity,
        salesUnit,
        salesPrice,
        category,
      } = req.body;


      const result = await tempSalesProductCollections.insertOne({
        productID,
        productTitle,
        brand,
        salesQuantity,
        salesUnit,
        salesPrice,
        category
      });
      res.send(result);
    });
  
    //get temp sales product list..........................................
    app.get("/tempSalesProductList", async (req, res) => {
      const result = await tempSalesProductCollections.find().toArray();
      res.send(result);
    });
    // .....................................................................................

    //set temp purchase product list
    app.post("/adTempPurchaseProductList", async (req, res) => {
      const {
        productID,
        productTitle,
        brand,
        purchaseQuantity,
        purchaseUnit,
        purchasePrice,
        salesPrice,
        reOrderQuantity,
        category,
      } = req.body;
      const parsePurchasePrice = parseFloat(purchasePrice).toFixed(2);
      const newParsePurchasePrice = parseFloat(parsePurchasePrice);

      const parsePurchaseQuantity = parseFloat(purchaseQuantity).toFixed(2);
      const newParsePurchaseQuantity = parseFloat(parsePurchaseQuantity);

      const parseSalesPrice = parseFloat(salesPrice).toFixed(2);
      const newParseSalesPrice = parseFloat(parseSalesPrice);

      const result = await tempPurchaseProductCollections.insertOne({
        productID,
        productTitle,
        brand,
        purchaseQuantity: newParsePurchaseQuantity,
        purchaseUnit,
        purchasePrice: newParsePurchasePrice,
        salesPrice: newParseSalesPrice,
        reOrderQuantity,
        category,
      });
      res.send(result);
    });

    //get temp purchase product list..........................................
    app.get("/tempPurchaseProductList", async (req, res) => {
      const result = await tempPurchaseProductCollections.find().toArray();
      res.send(result);
    });

    // delete temp product from purchase
    app.delete("/deleteTempProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tempPurchaseProductCollections.deleteOne(query);
      res.send(result);
    });

    // delete temp product from sales
    app.delete("/deleteSalesTempProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tempSalesProductCollections.deleteOne(query);
      res.send(result);
    });

    // new sales invoice...........................................
    app.post("/newSalesInvoice", async (req, res) => {
      const {
        customerSerial,
        date,
        customerName,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
      } = req.body;
      console.log(customerSerial);
    
      // Retrieve product list from temporary collection
      const productList = await tempSalesProductCollections.find().toArray();
      const filteredProductList = productList.map(({ _id, ...rest }) => rest);
    
      // Define the initial invoice number
      const firstInvoiceNumber = 35000001;
    
      // Find the latest invoice number
      const latestInvoice = await salesInvoiceCollections.findOne(
        {},
        { sort: { invoiceNumber: -1 } }
      );
    
      // Determine the next invoice number
      const nextInvoiceNumber = latestInvoice
        ? latestInvoice.invoiceNumber + 1
        : firstInvoiceNumber;
    
      // Check stock availability before proceeding
      const unavailableProducts = [];
      for (const product of filteredProductList) {
        const stockProduct = await stockCollections.findOne({ productID: product.productID });
        if (!stockProduct || stockProduct.purchaseQuantity < product.salesQuantity) {
          unavailableProducts.push(product.productTitle);
        }
      }
    
      if (unavailableProducts.length > 0) {
        return res.json(`Stock not available for the following products: ${unavailableProducts.join(", ")}`,
        );
      }
    
      // Insert the new sales invoice
      const result = await salesInvoiceCollections.insertOne({
        customerSerial,
        date,
        customerName,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
        productList: filteredProductList,
        invoiceNumber: nextInvoiceNumber,
      });
    
      // Find customer by serial
      const findCustomerBySerial = await customerDueCollections.findOne({ customerSerial });
      const findCustomer = await customerCollections.findOne({ serial: customerSerial });
    
      if (findCustomerBySerial) {
        await customerDueCollections.updateOne(
          { customerSerial },
          {
            $inc: {
              dueAmount: dueAmount,
            },
            $push: {
              salesHistory: {
                date,
                invoiceNumber: nextInvoiceNumber,
                grandTotal,
                finalPayAmount,
                dueAmount,
              },
            },
          }
        );
      } else {
        await customerDueCollections.insertOne({
          customerSerial,
          customerAddress: findCustomer.customerAddress,
          contactNumber: findCustomer.contactNumber,
          date,
          customerName,
          dueAmount,
          salesHistory: [
            { date, invoiceNumber: nextInvoiceNumber, grandTotal, finalPayAmount, dueAmount },
          ],
          paymentHistory: [],
        });
      }
    
      // Update stock quantities
      const bulkOps = filteredProductList.map((product) => ({
        updateOne: {
          filter: { productID: product.productID, purchaseQuantity: { $gte: product.salesQuantity } },
          update: {
            $inc: { purchaseQuantity: -product.salesQuantity },
          },
          upsert: true,
        },
      }));
    
      await stockCollections.bulkWrite(bulkOps);
    
      // Update the main balance
      const existingBalance = await mainBalanceCollections.findOne();
      const updatedMainBalance = existingBalance.mainBalance + finalPayAmount;
      await mainBalanceCollections.updateOne(
        {},
        { $set: { mainBalance: updatedMainBalance } }
      );
    
      // Add the transaction to the transaction list with serial
      const recentSerialTransaction = await transactionCollections
        .find()
        .sort({ serial: -1 })
        .limit(1)
        .toArray();
    
      let nextSerial = 10; // Default starting serial number
      if (recentSerialTransaction.length > 0 && recentSerialTransaction[0].serial) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }
    
      await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: finalPayAmount,
        note: `Sales ref, ${nextInvoiceNumber}`,
        date,
        type: "In",
      });
    
      // Now delete the temporary product list
      await tempSalesProductCollections.deleteMany({});
      res.send(result);
    });
    

    // get sales invoice list
    app.get("/salesInvoices", async (req, res) => {
      const result = await salesInvoiceCollections
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });


    // show customer Ledger start .............................................
    app.get('/customerLedger', async (req, res) => {
      const result = await customerDueCollections.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });
    // show customer Ledger end .............................................
    

    // new purchase invoice...........................................
    app.post("/newPurchaseInvoice", async (req, res) => {
      const {
        supplierSerial,
        date,
        supplierName,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
      } = req.body;
      console.log(supplierSerial);
      const productList = await tempPurchaseProductCollections.find().toArray();
      const filteredProductList = productList.map(({ _id, ...rest }) => rest);
      // Define the initial invoice number
      const firstInvoiceNumber = 45000001;

      // Find the latest invoice number
      const latestInvoice = await purchaseInvoiceCollections.findOne(
        {},
        { sort: { invoiceNumber: -1 } }
      );

      // Determine the next invoice number
      const nextInvoiceNumber = latestInvoice
        ? latestInvoice.invoiceNumber + 1
        : firstInvoiceNumber;

      const result = await purchaseInvoiceCollections.insertOne({
        supplierSerial,
        date,
        supplierName,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
        productList: filteredProductList,
        invoiceNumber: nextInvoiceNumber,
      });

      const findSupplierBySerial = await supplierDueCollections.findOne({ supplierSerial});
      const findSupplier = await supplierCollections.findOne({ serial: supplierSerial});


      if (findSupplierBySerial) {
        await supplierDueCollections.updateOne(
          { supplierSerial },
          {
            $inc: {
              dueAmount: dueAmount,
            },
            $push: {
              purchaseHistory: {
                date,
                invoiceNumber: nextInvoiceNumber,
                grandTotal,
                finalPayAmount,
                dueAmount
              }
            }
          }
        );
      } else {
        await supplierDueCollections.insertOne({
          supplierSerial,
          supplierAddress: findSupplier.supplierAddress,
          contactPerson: findSupplier.contactPerson,
          contactNumber: findSupplier.contactNumber,
          date,
          supplierName,
          dueAmount,
          purchaseHistory: [
            { date, invoiceNumber: nextInvoiceNumber, grandTotal, finalPayAmount, dueAmount }
          ],
          paymentHistory: [],
        });
      }


      const bulkOps = filteredProductList.map((product) => ({
        updateOne: {
          filter: { productID: product.productID },
          update: {
            $set: {
              purchasePrice: product.purchasePrice,
              salesPrice: product.salesPrice,
              reOrderQuantity: product.reOrderQuantity,
              productTitle: product.productTitle,
              brand: product.brand,
              category: product.category,
              purchaseUnit: product.purchaseUnit,
            },
            $inc: { purchaseQuantity: product.purchaseQuantity },
          },
          upsert: true,
        },
      }));

      stockCollections.bulkWrite(bulkOps);

      // get main balance to deduct purchase amount
      const existingBalance = await mainBalanceCollections.findOne();
      const updatedMainBalance = existingBalance.mainBalance - finalPayAmount;
      await mainBalanceCollections.updateOne(
        {},
        { $set: { mainBalance: updatedMainBalance } }
      );

      // add the transaction in transaction list
      //add transaction list with serial
      const recentSerialTransaction = await transactionCollections
      .find()
      .sort({ serial: -1 })
      .limit(1)
      .toArray();
  
    let nextSerial = 10; // Default starting serial number
    if (recentSerialTransaction.length > 0 && recentSerialTransaction[0].serial) {
      nextSerial = recentSerialTransaction[0].serial + 1;
    }

      await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: finalPayAmount,
        note: `Purchase ref, ${nextInvoiceNumber}`,
        date,
        type: "Out",
      });

      // now delete the temporary product list
      await tempPurchaseProductCollections.deleteMany({});
      res.send(result);
    });

    // show supplier Ledger start .............................................
    app.get('/supplierLedger', async (req, res) => {
      const result = await supplierDueCollections.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });
    // show supplier Ledger end .............................................

    // single supplier ledger start ...............................................
    app.get('/singleSupplier/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const result = await supplierDueCollections.findOne({supplierSerial:id}); 
      res.send(result);
    });
    // single supplier ledger end ...............................................

    // single customer ledger start ...............................................
    app.get('/singleCustomer/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const result = await customerDueCollections.findOne({customerSerial:id}); 
      res.send(result);
    });
    // single customer ledger end ...............................................

    // supplier payment start .................................................
    app.post('/paySupplier/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const {date, paidAmount, paymentMethod, payNote} = req.body;
      const supplier = await supplierDueCollections.findOne({supplierSerial:id});


      if(supplier) {
        const updatedDueAmount = supplier.dueAmount - paidAmount;
        await supplierDueCollections.updateOne(
          { supplierSerial: id},
          {
            $set: { dueAmount: updatedDueAmount },
            $push: {
              paymentHistory: {
                date,
                paidAmount,
                paymentMethod,
                payNote,
              }
            }
          }
        );
        res.json('success');
      } 

    })
    // supplier payment end .................................................

    // supplier payment start .................................................
    app.post('/payCustomer/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const {date, paidAmount, paymentMethod, payNote} = req.body;
      const customer = await customerDueCollections.findOne({customerSerial:id});


      if(customer) {
        const updatedDueAmount = customer.dueAmount - paidAmount;
        await customerDueCollections.updateOne(
          { customerSerial: id},
          {
            $set: { dueAmount: updatedDueAmount },
            $push: {
              paymentHistory: {
                date,
                paidAmount,
                paymentMethod,
                payNote,
              }
            }
          }
        );
        res.json('success');
      } 

    })
    // supplier payment end .................................................

    // get invoice list
    app.get("/invoices", async (req, res) => {
      const result = await purchaseInvoiceCollections
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // get current stock balance
    app.get("/stockBalance", async (req, res) => {
      const result = await stockCollections.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // add customer.....................................
    app.post("/addCustomer", async (req, res) => {
      const customerInfo = req.body;
      const { customerName } = customerInfo;
      const isCustomerExist = await customerCollections.findOne({
        customerName,
      });

      //add supplier list with serial
      const recentCustomer = await customerCollections
      .find()
      .sort({ serial: -1 })
      .limit(1)
      .toArray();
  
    let nextSerial = 10; // Default starting serial number
    if (recentCustomer.length > 0 && recentCustomer[0].serial) {
      nextSerial = recentCustomer[0].serial + 1;
    }
    const newCustomerInfo = {...customerInfo, serial: nextSerial};


      if (isCustomerExist) {
        res.json("Customer already exists");
      } else {
        const result = await customerCollections.insertOne(newCustomerInfo);
        res.send(result);
      }
    });

    // show customer...................................
    app.get("/customers", async (req, res) => {
      const result = await customerCollections
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // update customer
    app.put("/updateCustomer/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { customerName, contactNumber, customerAddress } = req.body;

      const updateInfo = {
        $set: {
          customerName,
          contactNumber,
          customerAddress,
        },
      };

      const result = await customerCollections.updateOne(filter, updateInfo);
      res.send(result);
    });


// delete customer
    app.delete("/deleteCustomer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await customerCollections.deleteOne(query);
      res.send(result);
    });



// ..................................................................................................................................
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
