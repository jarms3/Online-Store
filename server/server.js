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
var cRef  = db.ref("collections");



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
    //console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

router.route('/auth/:user/:pass')

.get(function(req, res){
    var userRef = ref.child("users");
    var newCart = true;
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
                permission: data.val().permission,
                status: data.val().status
              }
              list.push (item);
            })
        }
        for(var j = 0; j < list.length; j++){
            
            if(req.params.user == list[j].username){
                if(passwordHash.verify(req.params.pass, list[j].password)){
                    if(!list[j].verified){
                        res.json({succ: "Not verified"});
                        return;
                    } else if(list[j].status == "deactivated"){
                        res.json({succ: "Not activated"});
                        return;
                    }
                    else if(req.params.user == "store manager"){
                        res.json({succ: "ADMIN_Sucess", permission: list[j].permission})
                        return;
                    }
                    else{
                        
                        cartRef.once('value', function(cart){
                            cart.forEach(function(item){
                                if(item.val().user == req.params.user){
                                    cartRef.child(item.key + "/items").remove();
                                    cartRef.child(item.key).update({total: 0.00});
                                    newCart = false;
                                }
                                    
                            });
                            
                            if(newCart)
                                cartRef.push().set({user: req.params.user, total: 0.00});
                        });
                            
                        
                        res.json({succ: "Sucess", permission: list[j].permission});
                        return;
                    }
                }
                else{
                   res.json({succ: "Fail"});
                   return; 
                    
                }
            } 
                
        } 
        
        res.json("Username does not exist");
        
    });
    
    
});

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
                verified: false,
                status: "activated",
                permission: false
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
});

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
                _id: data.key, //this is to get the ID, if needed
                name: data.val().name,
                price: data.val().price,
                quantity: data.val().quantity,
                tax: data.val().tax,
                rating: data.val().rating,
                description: data.val().description
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

.post(function(req, res){
    pef.push().set({
        name: req.body.item,
        description: req.body.description,
        price: req.body.p,
        quantity: req.body.amount,
        tax: req.body.t,
        rateCount: 0,
        rateSum: 0,
        rating: 0
    });
    
    res.json("Item added");
});

router.route('/products/:product_id')

.put(function(req, res){
    pef.child(req.params.product_id).update({
        name: req.body.item,
        price: req.body.p,
        quantity: req.body.amount,
        tax: req.body.t,
        description: req.body.description,
    })
    
    res.json("Product updated");
})

.delete(function(req, res){
    pef.child(req.params.product_id).remove();
    res.json("Item deleted");
});


router.route('/users/:name')

.get(function(req, res){
    ref.child("users").once('value', function(sap){
        sap.forEach(function(data){
            if(data.val().username == req.params.name){
                res.json({name: [data.val().username], status: data.val().status, check: data.val().permission});
            }
        });
    });
    
})

.put(function(req, res){
    ref.child("users").once('value', function(sap){
        sap.forEach(function(data){
            if(data.val().username == req.params.name){
                ref.child("users/" + data.key).update({status: req.body.act})
                res.json("Updated");
            }
        });
    });
})

.post(function(req, res){
   ref.child("users").once('value', function(sap){
        sap.forEach(function(data){
            if(data.val().username == req.params.name){
                ref.child("users/" + data.key).update({permission: req.body.perm})
                res.json("Updated");
            }
        });
    }); 
});


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
                var listRef = cartRef.child(key + "/items"); 
                listRef.once('value', function(cap){
                    cap.forEach(function(item){
                        list.push(item.val());
                    });
                    
                    var cart = {
                        _id: key,
                        names: list,
                        total: total
                    }
                    
                    res.json(cart);
                    
                });
                
               
            }
        });
       
    });
})

.post(function(req, res){
    var price = req.body.cost;
    var amount = req.body.quantity;
    var tax = req.body.taxrate;
    var prodKey;
    var key;
    var check = false;
    var total = (price * amount)*(1+tax);
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
            if(req.params.username == data.val().user){
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
                            name: req.body.item,
                            amount: amount
                        }); 
                    }
                    
                    
                });
                
            }
        });
        
        
    });
    
    
});


router.route('/cart/buy/:cart_id')

.delete(function(req, res){
    cartRef.child(req.params.cart_id + "/items").remove();
    cartRef.child(req.params.cart_id).update({total: 0.00})
    res.json("Thank you for your purchase");
});

router.route('/cart/cancel/:cart_id')

.put(function(req, res){
    pef.once('value', function(prod){
        prod.forEach(function(data){
            for(var j = 0; j < req.body.stuff.length; j++){
                if(req.body.stuff[j].name == data.val().name){
                   pef.child(data.key).update({quantity: data.val().quantity + req.body.stuff[j].amount}); 
                }
            }
                
        });
    });
    cartRef.child(req.params.cart_id + "/items").remove();
    cartRef.child(req.params.cart_id).update({total: 0.00})
    res.json("Cart cleared");
});

router.route('/comments/:name')

.get(function(req, res){
    var comments = new Array();
    pef.once('value', function(snap){
        snap.forEach(function(dink){
            if(req.params.name == dink.val().name){
                pef.child(dink.key + "/comments").once('value', function(comm){
                    comm.forEach(function(data){
                        comments.push(data.val());
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
                    comment: req.body.comment,
                    user: req.body.user,
                    key: dink.key,
                    visible: true
                });
                
                res.json("Added Comment")
            }
        });
    });
});

router.route('/collection')

.get(function(req, res){
    var collections = new Array();
    cRef.once('value', function(collection){
        collection.forEach(function(data){
          if(collection.val().view == "public")
            collections.push(collection.val());
        });
        
        res.json(collections);
        
    });
})

router.route('/collection/:user')

.get(function(req, res){
    var list = new Array();
    cRef.once('value', function(snap){
        snap.forEach(function(data){
            if(data.val().user == req.params.user){
                cRef.child(data.key + "/items").once('value', function(x){
                    x.forEach(function(dingas){
                        console.log(dingas.val());
                        list.push(dingas.val());
                    });
                    
                    res.json({name: data.val().name, description: data.val().description, items: list, view: data.val().view, _id: data.key});
                });
                
            }
        });
    });
})

.post(function(req, res){
    var check = true;
    cRef.once('value', function(snap){
        snap.forEach(function(data){
            if(data.val().user == req.params.user){
                cRef.child(data.key + "/items").push().set({
                    item: req.body.item,
                    price: req.body.cost,
                    amount: req.body.quantity
                });
                
                check = false;
            } 
        });
        
        if(check){
            cRef.push().set({
                user: req.params.user,
                view: "private",
                name: "none",
                description: "none"
            });
            cRef.once('value', function(snap){
                snap.forEach(function(data){
                    if(data.val().user == req.params.user){
                        cRef.child(data.key + "/items").push().set({
                            item: req.body.item,
                            price: req.body.cost,
                            amount: req.body.quantity
                        });
                    }
                });
            });
        }
    })
});

router.route('/collection/view/:id')

.put(function(req, res){
    var view;
    if(req.body.view == "private")
        cRef.child(req.params.id).update({view: "public"});
    else{
        cRef.child(req.params.id).update({view: "private"});
    }
    
    res.json("updated");
})


app.listen(port);
console.log('Magic happens on port ' + port);