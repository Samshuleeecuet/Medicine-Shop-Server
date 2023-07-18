var moment = require('moment');
const express = require('express')
const cors = require('cors')
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

//middlewire
app.use(express.json())
const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
}
app.use(cors(corsConfig))
app.options("", cors(corsConfig))


const verifyJWT = (req,res,next)=>{
    const authorization = req.headers.authorization;
    if(!authorization){
      return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    // bearer token
    const token = authorization.split(' ')[1]
  
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
      if(err){
        return res.status(403).send({error: true, message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
  }

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.df1ioxo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
    try {
        client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const database = client.db('MedicineShop')
        const usersCollection = database.collection('users')
        const medicineCollection = database.collection('MedicineCollection')

        app.post('/jwt',(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24h'})
            res.send({token}) 
          })

          //Get & Save User Info into DB 
    app.get('/user/:email',async(req,res)=>{
        const email = req.params.email
        const result = await usersCollection.findOne({email:email})
        res.send(result)
    })

    app.post('/user',async(req,res)=>{
        const user = req.body;
        const query1 = {email:user.email}
        const existingUser = await usersCollection.findOne(query1)
        if(existingUser){
            return res.send({message: 'User Already Exist'})
        }
        else{
            const result=await usersCollection.insertOne(user);
            res.send(result)
        }
        
    })

    app.post('/addMedicine',async(req,res)=>{
        const medicineData = req.body;
        const newData = {
            medicineId: medicineData.medicineId,
            medicineName: medicineData.medicineName,
            genericName: medicineData.genericName,
            companyName: medicineData.companyName,
            type: medicineData.type,
            box: medicineData.box,
            bulb: medicineData.bulb,
        }
        const medicines = [
          {
            batchNumber : medicineData.batchNumber,
            price: medicineData.price,
            quantity : medicineData.quantity,
            expiredate  : medicineData.expiredate,
            entrydate: medicineData.entrydate

          }
        ]
        const objMedi = {
          batchNumber : medicineData.batchNumber,
          price: medicineData.price,
          quantity : medicineData.quantity,
          expiredate  : medicineData.expiredate,
          entrydate: medicineData.entrydate

        }

        const query = await medicineCollection.findOne({
            medicineName:medicineData.medicineName,
            type: medicineData.type
        
        })
        if(query){
          const datamedicine = query.medicines
          const newArray = [...datamedicine,objMedi]
          const updatedDoc = {
                $set:{
                    medicines: newArray
                }
            }
            const result = await medicineCollection.updateOne(query,updatedDoc)
            return res.send(result)
        }
        else{
           newData.medicines = medicines;
            const result = await medicineCollection.insertOne(newData)
            return res.send(result)
        }
    })


    app.get('/medicineInfo',async(req,res)=>{
        const result = await medicineCollection.find().toArray();
        res.send(result)
    })
    app.get('/search',async(req,res)=>{
      const search = req.query.search;
        if(search){
          const result = await medicineCollection.find(
            {$or:[
              {medicineName:{$regex: search, $options: 'i'}},
              {
                genericName:{$regex: search, $options: 'i'}
              }
            ]}
          ).toArray();
          res.send(result)
        }
    })
    app.get('/bulb',async(req,res)=>{
      const query = {
        bulb: 'on'
      }
      const options = {
        projection: {medicineId:1,box:1}
      }
      const found = await medicineCollection.find(query,options).toArray()
      res.send(found)
    })

    app.post('/bulb',async(req,res)=>{
      const status = req.body;
      console.log(status)
      const query = {
        medicineId : status.id
      }
      const found = await medicineCollection.findOne(query)
      console.log(found)
      const updateDoc = {
        $set: {
          bulb : status.status
        }
      }
      const result = await medicineCollection.updateOne(query,updateDoc)
      if (result && status.status === 'on' && result.modifiedCount === 1 ){
        return res.json({'bulb': 1})
      }
      if (result && status.status === 'off' && result.modifiedCount === 1 ){
        return res.json({'bulb': 0})
      }
    })
    //Graphical Representation

    app.get('/reportbyentrydate',async(req,res)=>{
      const start = moment(new Date()).format('DD-MM-YYYY')
      const end = moment(new Date() - 7 * 60 * 60 * 24 * 1000).format('DD-MM-YYYY')
      const entryMedicinegrp = []
      for(let i=7; i>=0; i--){
        const query = {
          entrydate:moment(new Date() - i * 60 * 60 * 24 * 1000).format('DD-MM-YYYY')
        }
        const found = await medicineCollection.find(query).toArray()
        entryMedicinegrp.push({
          id : moment(new Date() - i * 60 * 60 * 24 * 1000).format('DD-MM'),
          length: found.length
        })
      }
      res.send(entryMedicinegrp)


      // const pipeline = [
      //   {
      //     $match: {
      //       entrydate: {
      //         $gte: "08-07-2023",
      //         $lte: "23-07-2023",
      //       },
      //     },
      //   },
      //   {
      //     $group: {
      //       _id: "$entrydate",
      //       count: { $sum: 1 },
      //     },
      //   },
      // ]
      //const result= medicineCollection.countDocuments(query)
       //const result = medicineCollection.aggregate().toArray()
    
    }

   


    )}
    finally{

    }
}

run()
app.get('/',(req,res)=>{
    res.send('Welcome Medicine Shop Server')
})
app.listen(port);
