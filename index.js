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
    const stockCollections = database.collection("stockList");
    const purchaseInvoiceCollections = database.collection(
      "purchaseInvoiceList"
    );
    const customerCollections = database.collection("customerList");

    // add product
    app.post("/addProducts", async (req, res) => {
      const { product, categoryName, brandName, unitName } = req.body;
      const productName = product.toLowerCase();

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
    app.post("/categories", async (req, res) => {
      const { categoryValue, categoryCodeValue } = req.body;
      const categoryInfo = {
        category: categoryValue.toLowerCase(),
        categoryCode: categoryCodeValue,
      };

      // check if category and category code is already exists
      const isExist = await categoryCollections.findOne({
        category: categoryValue.toLowerCase(),
      });
      let isCategoryCode = await categoryCollections.findOne({
        categoryCode: categoryCodeValue,
      });

      if (isExist) {
        res.json("Category already exists");
      } else if (isCategoryCode) {
        res.json(
          `Category code used for ${isCategoryCode.category.toUpperCase()}`
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
      const brandName = { brand: req.params.brand.toLowerCase() };
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
      const unitName = { unit: req.params.unit.toLowerCase() };
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
      if (isSupplierExist) {
        res.json("Supplier already exists");
      } else {
        const result = await supplierCollections.insertOne(supplierInfo);
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

      const result = await transactionCollections.insertOne({
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

      const result = await transactionCollections.insertOne({
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

    // show all transactions
    app.get("/allTransactions", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("Pagination", page, size);
      const result = await transactionCollections
        .find()
        .skip((page - 1) * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/transactionCount", async (req, res) => {
      const count = await transactionCollections.estimatedDocumentCount();
      res.send({ count });
    });

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

    //get temp purchase product list
    app.get("/tempPurchaseProductList", async (req, res) => {
      const result = await tempPurchaseProductCollections.find().toArray();
      res.send(result);
    });

    // delete temp product
    app.delete("/deleteTempProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tempPurchaseProductCollections.deleteOne(query);
      res.send(result);
    });

    // new purchase invoice...........................................
    app.post("/newPurchaseInvoice", async (req, res) => {
      const {
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

      const result = await purchaseInvoiceCollections.insertOne({
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
      await transactionCollections.insertOne({
        totalBalance: finalPayAmount,
        note: `Purchase, ${nextInvoiceNumber}`,
        date,
        type: "Out",
      });

      // now delete the temporary product list
      await tempPurchaseProductCollections.deleteMany({});
      res.send(result);
    });

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
      if (isCustomerExist) {
        res.json("Customer already exists");
      } else {
        const result = await customerCollections.insertOne(customerInfo);
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
