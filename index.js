const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require("firebase-admin");
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()



var serviceAccount = require("./configs/to-do-list-all-firebase-adminsdk-uqfuj-fe0318fc24.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIRE_DB
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kw1ff.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;


const app = express()
app.use(bodyParser.json());
app.use(cors());
const port = 5000


app.get('/', (req, res) => {
  res.send('Hello World!')
  // console.log('Database connect');
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  console.log('database connected');
  const pendingAction = client.db("toDoList").collection("pending");  
  const adminCollection = client.db("toDoList").collection("admin");
 

  app.post('/add', (req, res) => {
    const addedAction = req.body;
    console.log(addedAction)
    pendingAction.insertOne(addedAction)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  });

   app.patch("/update/:id", (req, res) => {
    console.log(req.params.id)
    pendingAction.updateOne(
      { _id: ObjectId(req.params.id) },
      {
        $set: { status: req.body.status }
      })
      .then(result => {
        res.send(result.modifiedCount > 0);
      })
  })

  app.delete('/delete/:id', (req, res) => {
    console.log("delete command")
    pendingAction.deleteOne({ _id: ObjectId(req.params.id) })
      .then(result => {
        res.send(result.deletedCount > 0);
      })
  })

  

  app.get('/allActivity', (req, res) => {    
    const bearer = req.headers.authorization;
    console.log(bearer);
    if (bearer && bearer.startsWith('Bearer ')) {
      const idToken = bearer.split(' ')[1];
      admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
          const tokenEmail = decodedToken.email;
          const queryEmail = req.query.email;
          console.log(tokenEmail, queryEmail);
          if (tokenEmail == queryEmail) {
            adminCollection.find({ email: queryEmail })
              .toArray((err, admin) => {
                console.log(admin.length)
                if (admin.length > 0) {
                  pendingAction.find({})
                    .toArray((err, documents) => {
                      res.status(200).send(documents);
                    })
                }
                else{
                  pendingAction.find({ email: queryEmail })
                    .toArray((err, documents) => {
                      res.status(200).send(documents);
                    })
                }
              })
          }
        }).catch(function (error) {
          res.status(401).send('Un authorized access')
        });
    }
    else {
      res.status(401).send('Un authorized access bearing nul problem')
    }
  })


});

app.listen(process.env.PORT || port)