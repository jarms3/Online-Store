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
var pef = db.ref("products");
var cartRef = db.ref("cart");



var port = 8081; 

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
                verified: data.val().verified, 
                status: data.val().status
              }
              list.push (item);
            })
        }
        for(var j = 0; j < list.length; j++){
            
            if(req.params.user == list[j].username && list[j].verified == true && list[j].status == "activated"){
                if(passwordHash.verify(req.params.pass, list[j].password)){
                    if(req.params.user == "admin"){
                        res.json("ADMIN_Sucess")
                        return;
                    }
                    else{
                        cartRef.push().set({
                            user: req.params.user,
                            items: {item: "None"},
                            total: 0.00
                        })
                        res.json("Sucess");
                        return;
                    }
                }
                else{
                    res.json("Fail");
                    return;
                }
            } 
                
        } 
        
        res.json("Username does not exist");
        
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
            
            var verificationLink = "https://se3316-jarms3-lab05-jarms3.c9users.io:8081/api/confirm_email/" + userID;
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
    
});

router.route('/products')

.get(function(req, res){
     pef.once('value', function(snap){
        if (snap.val () == null) {
                
        } else { 
            var list = new Array ();
            snap.forEach (function (data) {
              var item = {
                key: data.key, //this is to get the ID, if needed
                name: data.val().name,
                price: data.val().price,
                quantity: data.val().quantity,
                tax: data.val().tax,
                rating: data.val().rating
              }
              list.push (item);
            })
            
            res.json(list);
        }
     });
})

.put(function(req, res){
    pef.once('value', function(snap){
       snap.forEach (function (data) {
           if(req.body.item == data.val().name){
               
               var count = data.val().rateCount + 1;
               var sum = data.val().rateSum + req.body.rate;
               
               pef.child(data.key).update({rating: sum/count, rateCount: count, rateSum: sum});
               
               res.json("Rated");
           }
       });
    });
})

router.route('/cart')

.post(function(req, res){
    var price = req.body.cost;
    var amount = req.body.quantity;
    var tax = req.body.taxrate;
    var username = req.body.username;
    var prodKey;
    var key;
    var check;
    var total = (price * (1+tax))*amount;
    pef.once('value', function(prod){
        prod.forEach(function(data){
            if(req.body.item == data.val().name)
                prodKey = data.key;
        })
        
        var upQ = pef.child(prodKey);
        upQ.update({quantity: req.body.original - amount})
    })
    cartRef.once('value', function(snap){
        snap.forEach(function(data) {
            if(username == data.val().user){
                key = data.key;
                var s = cartRef.child(key);
                var add = data.val().total;
                total += add;
                s.update({total: total})
            
                var itemref = cartRef.child(key + "/items");
                itemref.once('value', function(snip){
                    snip.forEach(function(deta){
                        if(deta.val().name == req.body.item)
                            check = true;
                    });
                    
                    if(!check){
                       itemref.push().set({
                            name: req.body.item
                        }); 
                    }
                    
                    
                });
                
            }
        });
        
        
    });
    
    
})

router.route('/cart/:username')

.get(function(req, res){
    var username = req.params.username;
    var key;
    var total;
    cartRef.once('value', function(snap){
        snap.forEach(function(data) {
            if(username == data.val().user){
                key = data.key;
                var list = new Array ();
                total = data.val().total;
                var removeRef = cartRef.child(key + "/items/item");
                removeRef.remove();
                
                var listRef = cartRef.child(key + "/items"); 
                listRef.once('value', function(cap){
                    cap.forEach(function(item){
                        list.push(item.val().name);
                    })
                    
                    var cart = {
                        names: list,
                        total: total
                    }
                    
                     res.json(cart);
                })
                
               
            }
        });
       
    });
})

router.route('/comments/:name')

.get(function(req, res){
    var comments = new Array();
    pef.once('value', function(snap){
        snap.forEach(function(dink){
            if(req.params.name == dink.val().name){
                pef.child(dink.key + "/comments").once('value', function(comm){
                    comm.forEach(function(data){
                        
                        comments.push(data.val().comment);
                    });
                    res.json(comments);
                });
                
            }
        });
    });
})

.post(function(req, res){
    pef.once('value', function(snap){
        snap.forEach(function(dink){
            if(req.params.name == dink.val().name){
                pef.child(dink.key + "/comments").push().set({
                    comment: req.body.comment
                });
                
                res.json("Added Comment")
            }
        });
    });
})

app.listen(port);
console.log('Magic happens on port ' + port);