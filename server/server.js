var firebase = require("firebase-admin");
var express    = require('express');        // call express
var passwordHash = require('password-hash');
var app        = express();// define our app using express
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var path = require('path');

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

function sendVerificationEmail(email, link) {
    var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
                 user:'josh.armstrong.victoria@gmail.com',
                 pass:'bingasdilugeeureka'
              }
    }
    
    var transporter = nodemailer.createTransport(smtpConfig);
    var mailOptions = {
      from: "josh.armstrong.victoria@gmail.com", // sender address
      to: email, // list of receivers
      subject: "Email verification", // Subject line
      text: "Email verification, press here to verify your email: " +     link,
      html: "<b>Hello there,<br> click <a href=" + link + "> here to verify</a></b>" // html body
    };
    
    transporter.sendMail(mailOptions, function(error, response){
      if(error)
       console.log(error);
      else
       console.log("Message sent: " + response.message);
    })
    
};

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
    var userRef = ref.child("users");
    userRef.once('value', function (snap) { // Keep the local user object synced with the Firebase userRef
        if (snap.val () == null) {
            
        } else {
            var list = new Array ();
            snap.forEach (function (data) {
              var item = {
                key: data.key, //this is to get the ID, if needed
                username: data.val ().username,
                password: data.val ().password,
                verified: data.val().verified
              }
              list.push (item);
            })
        }
        for(var j = 0; j < list.length; j++){
            if(req.params.user == list[j].username && list[j].verifired == true){
                console.log("huh");
                if(passwordHash.verify(req.params.pass, list[j].password))
                    res.json("Sucess");
                else
                    res.json("Fail");
            } 
                
        } 
        
        //res.json("Username does not exist");
        
    });
    
    
})

router.route('/newuser')

.post(function(req, res){
    

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
        if (list != undefined){
            for(var j = 0; j < list.length; j++){
                if(req.params.user == list[j].username)
                    res.json("This email already has an account!");
            }
        } 
        
        var hashedPassword = passwordHash.generate(req.body.pass);
        var user = req.body.user;
        var userID;
      
        var newUser = ref.child("users");
        newUser.push().set({
                username: req.body.user,
                password: hashedPassword,
                verified: false
        });
        
        userRef.once('value', function (snaps) { // Keep the local user object synced with the Firebase userRef
            if (snaps.val () == null) {
                
            } else {
                snaps.forEach (function (data) {
                  if(req.body.user == snaps.val().username);
                    userID = data.key;
                })
            }
            
            var verificationLink = "https://se3316-jarms3-lab5-jarms3.c9users.io:8081/api/confirm_email/" + userID;
            sendVerificationEmail(req.body.user, verificationLink);
        });
        
        
        res.json("user created");
        
    });
})

router.route('/confirm_email/:id')

.get(function(req, res){
    var uid = req.params.id;
    var nice = ref.child("users/" + uid);
    nice.update({verified: true});
    res.json("VERIFIED");
    
})

app.listen(port);
console.log('Magic happens on port ' + port);