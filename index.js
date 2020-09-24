//server 
const express = require('express');
const app = express();

//import DB
const pool = require('./config/db');

//auth imports
const session = require('express-session');
const flash = require('express-flash')
const passport = require('passport');
const bcrypt = require('bcrypt');
const initializePassport = require('./config/passportconfig');
initializePassport(passport);

// All Controllers
const tendersController = require('./controllers/alltendersController');
const createController = require('./controllers/createtenderController');
const activeController = require('./controllers/activetendersController');
const expiredController = require('./controllers/expiredtendersController');
const appliedController = require('./controllers/appliedtendersController');
const searchController = require('./controllers/searchtendersController');
const applyController = require('./controllers/applytenderController');
const readtendersController =  require('./controllers/readtendersController');

//setting ejs engine
app.set('view engine', 'ejs');

//connecting to server
app.listen(8000, () => {
    console.log("server working...")
})

//body parser
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })


//------------- FILE ROUTES ----------------------- //

//static files route
app.use(express.static(__dirname + '/public'));

//session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
//passport middleware
app.use(passport.initialize());
app.use(passport.session());
//flash middleware
app.use(flash());

// home dashboard route
    //users only
app.get("/", checkNotAuthenticated,async(req, res) => {

    if(req.user.role=='user'){
        //res.render("user.ejs", { user: req.user.name });
        res.redirect("/alltenders");
    }
    else{
        //res.render("admin.ejs", { user: req.user.name });
        res.redirect("/alltenders");
    }
      
});


// admin dashboard route
    //admin only
app.get("/admin", checkNotAuthenticated,checkRole, async(req, res) => {
    res.render("admin.ejs", {});
});

app.get("/user", (req, res) => {
    res.render("user.ejs", {});
});

// All tenders route
app.get("/alltenders", tendersController.tenders);


//  tenders route
app.get("/tenders",checkNotAuthenticated, readtendersController.readtenders);

// Get scrapped data and insert in db
app.get("/scraptenders", checkNotAuthenticated, createController.createtender);

// Active tenders route
app.get("/activetenders", checkNotAuthenticated, activeController.activetenders)

// Expired tenders route
app.get("/expiredtenders", checkNotAuthenticated, expiredController.expiredtenders);

// Expired tenders route
app.get("/appliedtenders", checkNotAuthenticated, appliedController.appliedtenders);


// city query results
app.post("/searchtenders", urlencodedParser, searchController.searchtenders);

//apply 'from html template
app.post('/apply', urlencodedParser, applyController.applytender);

//------------- Login and sign up Routes ----------------------- //

// get register page
app.get("/users/register", (req, res) => {
    res.render("signup.ejs");
});

// get login page
app.get("/users/login", (req, res) => { res.render("signin.ejs"); });

// get logout page
app.get("/users/logout", (req, res) => {
    req.logout();
    res.render("signin.ejs", { message: "You have logged out successfully" });
});

app.post("/users/register", urlencodedParser, async(req, res) => {
    //gettig data from ejs file
    let { name, email, password, password2 } = req.body;
    let role='user';
    let errors = [];
    //validation checks
    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields!" });
    }

    if (password.length < 6) {
        errors.push({ message: "Password must be a least 6 characters long!" });
    }

    if (password !== password2) {
        errors.push({ message: "Passwords do not match!" });
    }
    if (errors.length > 0) {
        res.render("register", { errors, name, email, password, password2 });
    } else {
        let hashedPassword = await bcrypt.hash(password, 10);
        // Validation passed
        pool.query(
            `SELECT * FROM public.user
            WHERE email = $1`, [email],
            (err, results) => {
                if (err) {
                    console.log(err);
                }
                console.log(results.rows);

                if (results.rows.length > 0) {
                    errors.push({
                        message: "Email already registered"
                    });
                    res.render("register", { errors });
                } else {
                    pool.query(
                        `INSERT INTO public.user (name, email, password,role)
                    VALUES ($1, $2, $3,$4)
                    RETURNING id, password`, [name, email, hashedPassword,role],
                        (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash("success_msg", "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }
                    );
                }
            }
        );
    }
});
app.post("/users/login", urlencodedParser,
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/users/login",
        failureFlash: true
    })
);

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
}

function checkRole(req,res,next){
    if(req.user.role=='user'){
        res.send('Not allowed!');
    }
    else{
        return next();
    }
}