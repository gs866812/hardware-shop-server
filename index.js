const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "https://api.mozumdarhat.com"],
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

const port = process.env.PORT || 9000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@graphicsaction.dpne6.mongodb.net/?retryWrites=true&w=majority&appName=Graphicsaction`;

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@hardwarestore.bbhhx17.mongodb.net/?retryWrites=true&w=majority&appName=hardwareStore`;

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

// jwt
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Not authorized" });
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
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
    const tempQuotationProductCollections = database.collection(
      "tempQuotationProductList"
    );
    const stockCollections = database.collection("stockList");
    const purchaseInvoiceCollections = database.collection(
      "purchaseInvoiceList"
    );
    const salesInvoiceCollections = database.collection("salesInvoiceList");
    const quotationCollections = database.collection("quotationList");
    const customerCollections = database.collection("customerList");
    const supplierDueCollections = database.collection("supplierDueList");
    const customerDueCollections = database.collection("customerDueList");
    const profitCollections = database.collection("profitList");
    const supplierDueBalanceCollections = database.collection(
      "supplierDueBalanceList"
    );
    const customerDueBalanceCollections = database.collection(
      "customerDueBalanceList"
    );

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // add product.............................................................
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
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      // const products = await productCollections.find().toArray();
      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { productName: { $regex: new RegExp(search, "i") } },
              {
                productCode: numericSearch ? numericSearch : { $exists: false },
              },
              { categoryName: { $regex: new RegExp(search, "i") } },
              { brandName: { $regex: new RegExp(search, "i") } },
              { unitName: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const products = await productCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();

      const count = await productCollections.countDocuments(query);
      res.send({ products, count });
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
        res.json(`Category code used for ${isCategoryCode.category}`);
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
      const newSupplierInfo = { ...supplierInfo, serial: nextSerial };

      if (isSupplierExist) {
        res.json("Supplier already exists");
      } else {
        const result = await supplierCollections.insertOne(newSupplierInfo);
        res.send(result);
      }
    });

    // show supplier
    app.get("/suppliers", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { supplierName: { $regex: new RegExp(search, "i") } },
              { serial: numericSearch ? numericSearch : { $exists: false } },
              { contactPerson: { $regex: new RegExp(search, "i") } },
              { contactNumber: { $regex: new RegExp(search, "i") } },
              { supplierAddress: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await supplierCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();

      const count = await supplierCollections.countDocuments(query);
      res.send({ result, count });
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
      const { note, date, type, userName } = req.body;
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
      if (
        recentSerialTransaction.length > 0 &&
        recentSerialTransaction[0].serial
      ) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }

      const result = await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: newBalance,
        note,
        date,
        type,
        userName,
      });

      res.send(result);
    });

    // costing balance
    app.post("/costingBalance", async (req, res) => {
      const { note, date, type, userName } = req.body;
      const parseAmount = parseFloat(req.body.confirmCostAmount);
      const newCostingBalance = parseFloat(parseAmount.toFixed(2));

      // find balance to update/deduct
      const existingBalance = await mainBalanceCollections.findOne({});
      if (existingBalance.mainBalance >= newCostingBalance) {
        await mainBalanceCollections.updateOne(
          {},
          {
            $inc: { mainBalance: -newCostingBalance },
          }
        );
      } else {
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
          {
            $set: {
              costingBalance: updatedCostingBalance,
            },
          }
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
      if (
        recentSerialTransaction.length > 0 &&
        recentSerialTransaction[0].serial
      ) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }

      const result = await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: newCostingBalance,
        note,
        date,
        type,
        userName,
      });

      res.send(result);
    });

    // show main balance only
    app.get("/mainBalance", verifyToken, async (req, res) => {
      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const result = await mainBalanceCollections.find().toArray();
      res.send(result);
    });

    // show costing balance only
    app.get("/costingBalance", verifyToken, async (req, res) => {
      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const result = await costingBalanceCollections.find().toArray();
      res.send(result);
    });

    // show all transactions list............................................
    app.get("/allTransactions", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { note: { $regex: new RegExp(search, "i") } },
              { serial: numericSearch ? numericSearch : { $exists: false } },
              {
                totalBalance: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              { date: { $regex: new RegExp(search, "i") } },
              { type: { $regex: new RegExp(search, "i") } },
              { userName: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await transactionCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();

      const count = await transactionCollections.countDocuments(query);

      res.send({ result, count });
    });

    // .....................................................................

    app.get("/transactionCount", async (req, res) => {
      const count = await transactionCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // .....................................................................................

    app.get("/stockCount", async (req, res) => {
      const count = await stockCollections.estimatedDocumentCount();
      res.send({ count });
    });
    // .....................................................................................
    app.get("/customerCount", async (req, res) => {
      const count = await customerCollections.estimatedDocumentCount();
      res.send({ count });
    });
    // .....................................................................................
    app.post("/getSalesPrice/:id", async (req, res) => {
      const productID = req.params.id;
      const findProduct = await stockCollections.findOne({ productID });
      if (findProduct) {
        res.send(findProduct);
      } else {
        res.json("Stock not available");
      }
    });
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
        purchasePrice,
        category,
      } = req.body;

      const result = await tempSalesProductCollections.insertOne({
        productID,
        productTitle,
        brand,
        salesQuantity,
        salesUnit,
        salesPrice,
        purchasePrice,
        category,
      });
      res.send(result);
    });
    //set temp quotation product list
    app.post("/adTempQuotationProductList", async (req, res) => {
      const {
        productID,
        productTitle,
        brand,
        salesQuantity,
        salesUnit,
        salesPrice,
        purchasePrice,
        category,
      } = req.body;

      const result = await tempQuotationProductCollections.insertOne({
        productID,
        productTitle,
        brand,
        salesQuantity,
        salesUnit,
        salesPrice,
        purchasePrice,
        category,
      });
      res.send(result);
    });

    //get temp sales product list..........................................
    app.get("/tempSalesProductList", async (req, res) => {
      const result = await tempSalesProductCollections.find().toArray();
      res.send(result);
    });

    //get temp quotation product list..........................................
    app.get("/tempQuotationProductList", async (req, res) => {
      const result = await tempQuotationProductCollections.find().toArray();
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

    // delete temp product from sales
    app.delete("/deleteQuotationTempProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tempQuotationProductCollections.deleteOne(query);
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
        profit,
        userName,
      } = req.body;

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
        const stockProduct = await stockCollections.findOne({
          productID: product.productID,
        });
        if (
          !stockProduct ||
          stockProduct.purchaseQuantity < product.salesQuantity
        ) {
          unavailableProducts.push(product.productTitle);
        }
      }

      if (unavailableProducts.length > 0) {
        return res.json(
          `Stock not available for the following products: ${unavailableProducts.join(
            ", "
          )}`
        );
      }

      const isCustomer = await customerCollections.findOne({
        serial: customerSerial,
      });

      // Insert the new sales invoice
      const result = await salesInvoiceCollections.insertOne({
        customerSerial,
        date,
        customerName,
        customerAddress: isCustomer.customerAddress,
        customerMobile: isCustomer.contactNumber,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
        userName,
        productList: filteredProductList,
        invoiceNumber: nextInvoiceNumber,
      });

      const customerDue = await customerDueBalanceCollections.findOne({});
      if (customerDue) {
        await customerDueBalanceCollections.updateOne(
          {},
          {
            $inc: {
              customerDueBalance: dueAmount,
            },
          }
        );
      } else {
        await customerDueBalanceCollections.insertOne({
          customerDueBalance: dueAmount,
        });
      }

      const existingProfit = await profitCollections.findOne({});
      if (existingProfit) {
        await profitCollections.updateOne(
          {},
          {
            $inc: {
              profitBalance: profit,
            },
          }
        );
      } else {
        await profitCollections.insertOne({ profitBalance: profit });
      }

      // Find customer by serial
      const findCustomerBySerial = await customerDueCollections.findOne({
        customerSerial,
      });
      const findCustomer = await customerCollections.findOne({
        serial: customerSerial,
      });

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
                userName,
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
            {
              date,
              invoiceNumber: nextInvoiceNumber,
              grandTotal,
              finalPayAmount,
              dueAmount,
              userName,
            },
          ],
          paymentHistory: [],
        });
      }

      // Update stock quantities
      const bulkOps = filteredProductList.map((product) => ({
        updateOne: {
          filter: {
            productID: product.productID,
            purchaseQuantity: { $gte: product.salesQuantity },
          },
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
      if (
        recentSerialTransaction.length > 0 &&
        recentSerialTransaction[0].serial
      ) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }

      await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: finalPayAmount,
        note: `Sales ref, ${nextInvoiceNumber}`,
        date,
        type: "Sales",
        userName,
      });

      // Now delete the temporary product list
      await tempSalesProductCollections.deleteMany({});
      res.send(result);
    });

    // new quotation invoice...........................................
    app.post("/newQuotation", async (req, res) => {
      const {
        userName,
        customerSerial,
        contactNumber,
        date,
        customerName,
        totalAmount,
        discountAmount,
        grandTotal,
      } = req.body;

      // Retrieve product list from temporary collection
      const productList = await tempQuotationProductCollections
        .find()
        .toArray();
      const filteredProductList = productList.map(({ _id, ...rest }) => rest);

      // Insert the new sales invoice
      const result = await quotationCollections.insertOne({
        userName,
        customerSerial,
        contactNumber,
        date,
        customerName,
        totalAmount,
        discountAmount,
        grandTotal,
        productList: filteredProductList,
      });

      // Now delete the temporary product list
      await tempQuotationProductCollections.deleteMany({});
      res.send(result);
    });

    // get sales invoice list
    app.get("/salesInvoices", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { date: { $regex: new RegExp(search, "i") } },
              {
                grandTotal: numericSearch ? numericSearch : { $exists: false },
              },
              {
                invoiceNumber: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              { customerName: { $regex: new RegExp(search, "i") } },
              { userName: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await salesInvoiceCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      const count = await salesInvoiceCollections.countDocuments(query);
      res.send({ result, count });
    });

    // get quotation list
    app.get("/quotationInvoice", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { date: { $regex: new RegExp(search, "i") } },
              {
                grandTotal: numericSearch ? numericSearch : { $exists: false },
              },
              { customerName: { $regex: new RegExp(search, "i") } },
              { contactNumber: { $regex: new RegExp(search, "i") } },
              { userName: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await quotationCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      const count = await quotationCollections.countDocuments(query);
      res.send({ result, count });
    });

    // show customer Ledger start .............................................
    app.get("/customerLedger", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { customerName: { $regex: new RegExp(search, "i") } },
              {
                customerSerial: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              { customerAddress: { $regex: new RegExp(search, "i") } },
              { contactNumber: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await customerDueCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      const count = await customerDueCollections.countDocuments(query);
      res.send({ result, count });
    });
    // show customer Ledger end .............................................

    // new purchase invoice...........................................
    app.post("/newPurchaseInvoice", async (req, res) => {
      const {
        userName,
        supplierSerial,
        date,
        supplierName,
        totalAmount,
        discountAmount,
        grandTotal,
        finalPayAmount,
        dueAmount,
      } = req.body;

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

      const isSupplier = await supplierCollections.findOne({
        serial: supplierSerial,
      });
      const result = await purchaseInvoiceCollections.insertOne({
        userName,
        supplierSerial,
        supplierAddress: isSupplier.supplierAddress,
        supplierContact: isSupplier.contactNumber,
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

      const supplierDue = await supplierDueBalanceCollections.findOne({});
      if (supplierDue) {
        await supplierDueBalanceCollections.updateOne(
          {},
          {
            $inc: {
              supplierDueBalance: dueAmount,
            },
          }
        );
      } else {
        await supplierDueBalanceCollections.insertOne({
          supplierDueBalance: dueAmount,
        });
      }

      const findSupplierBySerial = await supplierDueCollections.findOne({
        supplierSerial,
      });
      const findSupplier = await supplierCollections.findOne({
        serial: supplierSerial,
      });

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
                dueAmount,
                userName,
              },
            },
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
            {
              date,
              invoiceNumber: nextInvoiceNumber,
              grandTotal,
              finalPayAmount,
              dueAmount,
              userName,
            },
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
      if (
        recentSerialTransaction.length > 0 &&
        recentSerialTransaction[0].serial
      ) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }

      await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: finalPayAmount,
        note: `Purchase ref, ${nextInvoiceNumber}`,
        date,
        type: "Purchase",
        userName,
      });

      // now delete the temporary product list
      await tempPurchaseProductCollections.deleteMany({});
      res.send(result);
    });

    // show supplier Ledger start .............................................
    app.get("/supplierLedger", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { supplierName: { $regex: new RegExp(search, "i") } },
              {
                supplierSerial: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              { supplierAddress: { $regex: new RegExp(search, "i") } },
              { contactPerson: { $regex: new RegExp(search, "i") } },
              { contactNumber: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await supplierDueCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ supplierSerial: -1 })
        .toArray();
      const count = await supplierDueCollections.countDocuments(query);
      res.send({ result, count });
    });
    // show supplier Ledger end .............................................

    // original single supplier ledger start ...............................................

    // app.get('/singleSupplier/:id', async (req, res) => {
    //   const id = parseInt(req.params.id);
    //   const result = await supplierDueCollections.findOne({supplierSerial:id});

    //   if (result && result.purchaseHistory) {
    //     result.purchaseHistory.sort((a, b) => b.invoiceNumber - a.invoiceNumber);
    //   }

    //   res.send(result);
    // });
    // original single supplier ledger end ...............................................

    // GPT start single supplier
    app.get("/singleSupplier/:id", verifyToken, async (req, res) => {
      const id = parseInt(req.params.id);
      const { searchTerm, page = 1, limit = 10 } = req.query; // Get search term, page, and limit from query parameters

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const supplier = await supplierDueCollections.findOne({
        supplierSerial: id,
      });

      if (!supplier) {
        return res.status(404).send({ message: "Supplier not found" });
      }

      let purchaseHistory = supplier.purchaseHistory || [];

      // Filter the purchase history if a search term is provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        purchaseHistory = purchaseHistory.filter(
          (purchase) =>
            purchase.invoiceNumber.toString().includes(searchTerm) ||
            purchase.grandTotal.toString().includes(searchTerm) ||
            purchase.finalPayAmount.toString().includes(searchTerm) ||
            purchase.dueAmount.toString().includes(searchTerm) ||
            purchase.date.toLowerCase().includes(searchLower)
        );
      }

      // Sort the purchase history by invoice number (descending)
      purchaseHistory.sort((a, b) => b.invoiceNumber - a.invoiceNumber);

      // Pagination logic
      const totalItems = purchaseHistory.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedHistory = purchaseHistory.slice(startIndex, endIndex);

      // Attach the paginated purchase history and metadata to the supplier object
      supplier.paginatedPurchaseHistory = paginatedHistory;
      supplier.totalItems = totalItems;
      supplier.currentPage = parseInt(page);
      supplier.totalPages = Math.ceil(totalItems / limit);

      res.send(supplier);
    });
    // GPT end single supplier
    // GPT start single customer
    app.get("/singleCustomer/:id", verifyToken, async (req, res) => {
      const id = parseInt(req.params.id);
      const { searchTerm, page = 1, limit = 10 } = req.query; // Get search term, page, and limit from query parameters

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const customer = await customerDueCollections.findOne({
        customerSerial: id,
      });

      if (!customer) {
        return res.status(404).send({ message: "Customer not found" });
      }

      let salesHistory = customer.salesHistory || [];

      // Filter the sales history if a search term is provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        salesHistory = salesHistory.filter(
          (sales) =>
            sales.invoiceNumber.toString().includes(searchTerm) ||
            sales.grandTotal.toString().includes(searchTerm) ||
            sales.finalPayAmount.toString().includes(searchTerm) ||
            sales.dueAmount.toString().includes(searchTerm) ||
            sales.date.toLowerCase().includes(searchLower)
        );
      }

      // Sort the sales history by invoice number (descending)
      salesHistory.sort((a, b) => b.invoiceNumber - a.invoiceNumber);

      // Pagination logic
      const totalItems = salesHistory.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedHistory = salesHistory.slice(startIndex, endIndex);

      // Attach the paginated sales history and metadata to the customer object
      customer.paginatedSalesHistory = paginatedHistory;
      customer.totalItems = totalItems;
      customer.currentPage = parseInt(page);
      customer.totalPages = Math.ceil(totalItems / limit);

      res.send(customer);
    });
    // GPT end single customer

    // single customer ledger start ...............................................
    // app.get('/singleCustomer/:id', async (req, res) => {
    //   const id = parseInt(req.params.id);
    //   const result = await customerDueCollections.findOne({customerSerial:id});

    //   if (result && result.salesHistory) {
    //     result.salesHistory.sort((a, b) => b.invoiceNumber - a.invoiceNumber);
    //   }

    //   res.send(result);
    // });
    // single customer ledger end ...............................................

    // supplier payment start .................................................
    app.post("/paySupplier/:id", async (req, res) => {
      const id = parseInt(req.params.id);
      const { date, paidAmount, paymentMethod, payNote, userName } = req.body;

      const existingBalance = await mainBalanceCollections.findOne();
      if (existingBalance.mainBalance > paidAmount) {
        await mainBalanceCollections.updateOne(
          {},
          { $inc: { mainBalance: -paidAmount } }
        );
      } else {
        return res.json("Insufficient balance");
      }

      const supplierDue = await supplierDueBalanceCollections.findOne({});
      if (supplierDue) {
        await supplierDueBalanceCollections.updateOne(
          {},
          {
            $inc: {
              supplierDueBalance: -paidAmount,
            },
          }
        );
      }

      //add transaction list with serial
      const findSupplier = await supplierCollections.findOne({ serial: id });
      const recentSerialTransaction = await transactionCollections
        .find()
        .sort({ serial: -1 })
        .limit(1)
        .toArray();

      let nextSerial = 10; // Default starting serial number
      if (
        recentSerialTransaction.length > 0 &&
        recentSerialTransaction[0].serial
      ) {
        nextSerial = recentSerialTransaction[0].serial + 1;
      }

      await transactionCollections.insertOne({
        serial: nextSerial,
        totalBalance: paidAmount,
        note: `Paid to ${findSupplier.supplierName}`,
        date,
        type: "Paid",
        userName,
      });

      const supplier = await supplierDueCollections.findOne({
        supplierSerial: id,
      });

      if (supplier) {
        const updatedDueAmount = supplier.dueAmount - paidAmount;
        await supplierDueCollections.updateOne(
          { supplierSerial: id },
          {
            $set: { dueAmount: updatedDueAmount },
            $push: {
              paymentHistory: {
                date,
                paidAmount,
                paymentMethod,
                payNote,
                userName,
              },
            },
          }
        );

        // const duaPaid = await supplierDueCollections.findOne({supplierSerial:id});
        // if(duaPaid.dueAmount <= 0){
        //   await supplierDueCollections.deleteOne({dueAmount: 0});
        // }
        res.json("success");
      }
    });
    // supplier payment end .................................................

    // customer payment start .................................................
    app.post("/payCustomer/:id", async (req, res) => {
      const id = parseInt(req.params.id);
      const { date, paidAmount, paymentMethod, payNote, userName } = req.body;

      const customer = await customerDueCollections.findOne({
        customerSerial: id,
      });
      if (customer) {
        const updatedDueAmount = customer.dueAmount - paidAmount;
        await customerDueCollections.updateOne(
          { customerSerial: id },
          {
            $set: { dueAmount: updatedDueAmount },
            $push: {
              paymentHistory: {
                date,
                paidAmount,
                paymentMethod,
                payNote,
              },
            },
          }
        );

        const existingBalance = await mainBalanceCollections.findOne();
        if (existingBalance) {
          await mainBalanceCollections.updateOne(
            {},
            { $inc: { mainBalance: paidAmount } }
          );

          const customerDue = await customerDueBalanceCollections.findOne({});
          if (customerDue) {
            await customerDueBalanceCollections.updateOne(
              {},
              {
                $inc: {
                  customerDueBalance: -paidAmount,
                },
              }
            );
          }

          //add transaction list with serial
          const findCustomer = await customerCollections.findOne({
            serial: id,
          });
          const recentSerialTransaction = await transactionCollections
            .find()
            .sort({ serial: -1 })
            .limit(1)
            .toArray();

          let nextSerial = 10; // Default starting serial number
          if (
            recentSerialTransaction.length > 0 &&
            recentSerialTransaction[0].serial
          ) {
            nextSerial = recentSerialTransaction[0].serial + 1;
          }

          await transactionCollections.insertOne({
            serial: nextSerial,
            totalBalance: paidAmount,
            note: `Received from ${findCustomer.customerName}`,
            date,
            type: "Received",
            userName,
          });
        }

        // const duaPaid = await customerDueCollections.findOne({customerSerial:id});
        // if(duaPaid.dueAmount <= 0){
        //   await customerDueCollections.deleteOne({dueAmount: 0});
        // }

        res.json("success");
      }
    });
    // customer payment end .................................................

    // get invoice list
    app.get("/invoices", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { date: { $regex: new RegExp(search, "i") } },
              {
                invoiceNumber: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              {
                finalPayAmount: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              { supplierName: { $regex: new RegExp(search, "i") } },
              { userName: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await purchaseInvoiceCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      const count = await purchaseInvoiceCollections.countDocuments(query);
      res.send({ result, count });
    });

    // get current stock balance
    app.get("/stockBalance", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              { productID: { $regex: new RegExp(search, "i") } },
              {
                purchaseQuantity: numericSearch
                  ? numericSearch
                  : { $exists: false },
              },
              {
                salesPrice: numericSearch ? numericSearch : { $exists: false },
              },
              { productTitle: { $regex: new RegExp(search, "i") } },
              { purchaseUnit: { $regex: new RegExp(search, "i") } },
              { category: { $regex: new RegExp(search, "i") } },
              { brand: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await stockCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();

      const count = await stockCollections.countDocuments(query);
      res.send({ result, count });
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
      const newCustomerInfo = { ...customerInfo, serial: nextSerial };

      if (isCustomerExist) {
        res.json("Customer already exists");
      } else {
        const result = await customerCollections.insertOne(newCustomerInfo);
        res.send(result);
      }
    });

    // show customer...................................
    app.get("/customers", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || "";

      // const userMail = req.query["userEmail"];
      // const email = req.user["email"];

      // if (userMail !== email) {
      //   return res.status(401).send({ message: "Forbidden Access" });
      // }

      let numericSearch = parseFloat(search);
      if (isNaN(numericSearch)) {
        numericSearch = null;
      }

      const query = search
        ? {
            $or: [
              {
                customerName: { $regex: new RegExp(search, "i") },
              },
              { serial: numericSearch ? numericSearch : { $exists: false } },
              { contactNumber: { $regex: new RegExp(search, "i") } },
              { customerAddress: { $regex: new RegExp(search, "i") } },
            ],
          }
        : {};

      const result = await customerCollections
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();

      const count = await customerCollections.countDocuments(query);
      res.send({ result, count });
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

    // get profit balance
    app.get("/profitBalance", verifyToken, async (req, res) => {
      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const result = await profitCollections.find().toArray();
      res.send(result);
    });

    // get supplier due balance

    app.get("/supplierTotalDueBalance", verifyToken, async (req, res) => {
      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const result = await supplierDueBalanceCollections.find().toArray();
      res.send(result);
    });
    app.get("/customerTotalDueBalance", verifyToken, async (req, res) => {
      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const result = await customerDueBalanceCollections.find().toArray();
      res.send(result);
    });

    // .....................................................................................
    app.get("/productTotalCount", async (req, res) => {
      const count = await productCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // .....................................................................................
    app.get("/supplierTotalCount", async (req, res) => {
      const count = await supplierCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // single supplier total count
    app.get("/singleSupplierCount", async (req, res) => {
      const count = await supplierDueCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // single customer total count
    app.get("/singleCustomerCount", async (req, res) => {
      const count = await customerDueCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // Total sales invoice count
    app.get("/salesInvoiceCount", async (req, res) => {
      const count = await salesInvoiceCollections.estimatedDocumentCount();
      res.send({ count });
    });
    // Total sales invoice history count
    app.get("/salesHistoryCount", async (req, res) => {
      const count = await salesInvoiceCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // Total sales invoice count
    app.get("/purchaseInvoiceCount", async (req, res) => {
      const count = await purchaseInvoiceCollections.estimatedDocumentCount();
      res.send({ count });
    });

    // generate sales invoice

    app.get("/generateSalesInvoice", verifyToken, async (req, res) => {
      const finder = parseInt(req.query.invoiceNumber);

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const result = await salesInvoiceCollections.findOne({
        invoiceNumber: finder,
      });

      res.send(result);
    });

    // generate purchase invoice

    app.get("/generatePurchaseInvoice", verifyToken, async (req, res) => {
      const finder = parseInt(req.query.invoiceNumber);

      const userMail = req.query["userEmail"];
      const email = req.user["email"];

      if (userMail !== email) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const result = await purchaseInvoiceCollections.findOne({
        invoiceNumber: finder,
      });

      res.send(result);
    });

    // .................................................................................................................
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
