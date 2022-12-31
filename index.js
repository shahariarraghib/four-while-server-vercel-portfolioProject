// for server connection step1
const express = require('express')
// MongoDB connection
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()

// for server connection step2
const app = express();
// for server connection step3
const port = process.env.PORT || 5000;


const admin = require("firebase-admin");

// const serviceAccount = require('./four-wheel-firebase-adminsdk-8pxud-4192d19d10.json');
const serviceAccount = JSON.parse(process.env.FIREVASE_SERVICE_SCCOUNT)


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wz4lj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



// jwt token

async function verifyToken(req, res, next) {

    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }

    next();
}



async function run() {
    try {
        await client.connect();
        const database = client.db('four-wheel');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');
        const userInfo = database.collection('userInfo')

        // post api products add korar jonno

        app.post('/products', async (req, res) => {
            const newProducts = req.body;
            const result = await productCollection.insertOne(newProducts);
            console.log('got new user', result);
            console.log('hitting the post', req.body);
            res.json(result);
        })

        //get api database theke data show korar jonno

        app.get('/products', async (req, res) => {

            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);

            let result;
            const count = await cursor.count();
            if (page) {
                result = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                result = await cursor.toArray();
            }


            res.send({
                count,
                result
            });

        })

        // delete api for products

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);

            console.log('delete user with id', result);
            res.json(result);

        })
        // Products er details dekhar jonno API
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            console.log('load user with id:', id);
            const query = {
                _id: ObjectId(id)
            };
            const result = await productCollection.findOne(query);
            // res.send er moddo error code deya jay
            res.send(result);
        })

        // update API
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProducts = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedProducts.name,
                    description: updatedProducts.description,
                    price: updatedProducts.price,
                    img: updatedProducts.img,



                },
            };
            const result = await productCollection.updateOne(filter, updateDoc, options)
            console.log('updating user', req);
            res.json(result);
        })


        // add order API
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            console.log('oeder', order);
            res.json(result);
        })

        // order dekhar jonno
        app.get('/orders', async (req, res) => {
            const cursor = orderCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        })

        // order er details dekhar jonno API
        app.get("/orders/:id", async (req, res) => {
            const id = req.params.id;
            console.log('load user with id:', id);
            const query = {
                _id: ObjectId(id)
            };
            const result = await orderCollection.findOne(query);
            // res.send er moddo error code deya jay
            res.send(result);
        })


        // delet order api

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);

            console.log('delete user with id', result);
            res.json(result);

        })


        app.get('/ordersemail', async (req, res) => {
            let query = {};
            const email = req.query.email;
            if (email) {
                query = { email: email }
            }
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);

        })

        // save user info

        app.post('/userInfo', async (req, res) => {
            const users = req.body;
            const result = await userInfo.insertOne(users);
            console.log(result);
            res.json(result);
        });

        app.get('/userInfo', async (req, res) => {
            const cursor = userInfo.find({});
            const users = await cursor.toArray();
            res.send(users);
        })

        // save google data eikhane data upsert korte hobe 
        app.put('/userInfo', async (req, res) => {
            try {
                const users = req.body;
                console.log('PUT', users)

                const filter = { email: users.email }
                console.log(filter)
                const options = { upsert: true };
                const updateDoc = { $set: users };
                console.log(updateDoc)

                const result = await userInfo.updateOne(filter, updateDoc, options);

                console.log(result)
                res.json(result);
            }
            catch (error) {
                console.log(error.message)
            }
        })


        app.put('/userInfo/admin', verifyToken, async (req, res) => {
            try {
                const users = req.body;

                console.log(req.decodedEmail)

                const requester = req.decodedEmail;
                if (requester) {
                    const requesterAccount = await userInfo.findOne({ email: requester });
                    if (requesterAccount.role === 'admin') {
                        const filter = { email: users.email }
                        const updateDoc = { $set: { role: 'admin' } };
                        const result = await userInfo.updateOne(filter, updateDoc);
                        res.json(result)
                    }
                }

                else {
                    res.status(403).json({ message: 'You do not have access to make admin' })
                }


            }
            catch (error) {
                console.log(error.message)
            }
        })

        // admin chack

        app.get('/userInfo/:email', async (req, res) => {
            const email = req.params.email;
            const quary = { email: email };
            const user = await userInfo.findOne(quary);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
                console.log(isAdmin)
            }
            res.json({ admin: isAdmin })
        })

    }

    finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('running my four wheel');

});

app.listen(port, () => {
    console.log('running server on port', port);
})