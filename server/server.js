var firebase = require("firebase-admin");
var express    = require('express');        // call express
var passwordHash = require('password-hash');
var app        = express();// define our app using express
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var serviceAccount = require("./se3316-jarms3-lab5.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://se3316-jarms3-lab5.firebaseio.com"
});

var db = firebase.database();

var ref = db.ref("login");



var port =  8081; 

var router = express.Router();

app.use('/api', router);

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    res.setHeader('Access-Control-Allow-Origin','*');
    res.header("Access-Control-Allow-Headers", "Origin, XRequested-With,Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'POST, PATCH, GET, PUT, DELETE, OPTIONS');
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

router.route('/auth/:user/:pass')

.get(function(req, res){
    var userRef = ref.child("users/");
    userRef.once('value', function (snap) { // Keep the local user object synced with the Firebase userRef
        if (snap.val () == null) {
            
        } else {
            var list = new Array ();
            snap.forEach (function (data) {
              var item = {
                key: data.key, //this is to get the ID, if needed
                username: data.val ().username,
                password: data.val ().password,
              }
              list.push (item);
            })
        }
        console.log(list);
        for(var j = 0; j < list.length; j++){
            if(req.params.user.replace(".", ",") == list[j].username){
                if(passwordHash.verify(req.params.pass, list[j].password))
                    res.json("Sucess");
                else
                    res.json("Fail");
            } else
                res.json("Username does not exist");
        } 
        
        
    });
    
    
})

router.route('/newuser')

.post(function(req, res){
    
    var userRef = ref.child("users/" + req.body.user.replace(".", ","));
    userRef.once('value', function (snap) {
        if(snap.exists())
            res.json("This email already has an account!");
        else{
            var hashedPassword = passwordHash.generate(req.body.pass);
            var user = req.body.user;
            var newUser = ref.child("users");
            newUser.push().set({
                    username: req.body.user.replace(".", ","),
                    password: hashedPassword
                
            })
            
            res.json("user created");
        }
    });
})

app.listen(port);
console.log('Magic happens on port ' + port);