const express = require('express')
const app = express()
const userModule = require('./models/user')
const postModule = require('./models/post')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const user = require('./models/user')
const multerconfig = require('./config/multerconfig')
const path = require('path')

app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname , "public")))
app.use(cookieParser())


app.get('/updateprofile', (req, res) => {
    res.render("updateprofile")
})
app.post('/upload', isloggedin, multerconfig.single('image'), async (req, res) => {
    let user = await userModule.findOne({email: req.user.email})
    user.profile = req.file.filename
    await user.save()
    res.redirect('/profile')
})
app.get('/', (req, res) => {
    res.render("index")
})
app.get('/profile', isloggedin, async (req, res) => {
    let user = await userModule.findOne({email: req.user.email}).populate("posts")
    res.render('profile',{user})
    
})
app.get('/like/:id', isloggedin, async (req, res) => {
    let post = await postModule.findOne({_id: req.params.id}).populate("user")
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save()
    res.redirect('/profile')
    
})
app.get('/edit/:id', isloggedin, async (req, res) => {
    let post = await postModule.findOne({_id: req.params.id}).populate("user")
    
    res.render('edit', {post})
    
})
app.post('/update/:id', isloggedin, async (req, res) => {
    let post = await postModule.findOneAndUpdate({_id: req.params.id},{content: req.body.content})
    res.redirect('/profile')
    
})
app.get('/login', (req, res) => {
    res.render("login")
})
app.post('/register', async (req, res) => {
    let { name, username, email, password, age } = req.body
    let user = await userModule.findOne({ email })
    if (user) return res.send("User already existed")

    bcrypt.genSalt(10, (err, salt) => {
        console.log(salt)
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) throw err;
            let user = await userModule.create({
                name,
                username,
                email,
                password: hash,
                age
            })
            let token = jwt.sign({ email, userid: user._id, }, "shhhh")
            res.cookie("token", token)
            res.redirect("/profile")
        });
    });
})
app.post('/login', async (req, res) => {
    let { email, password } = req.body
    let user = await userModule.findOne({ email })
    if (!user) return res.status(200).send("Something went wrong")

    bcrypt.compare(password, user.password, function (err, result) {

        if (result) {
            let token = jwt.sign({ email, userid: user._id, }, "shhhh")
            res.cookie("token", token)
            res.redirect("/profile")
        }
        else { res.redirect('/login') }
    })
})
app.get('/logout', (req, res) => {
    res.cookie("token", "")
    res.redirect('/login')
})
app.post('/post', isloggedin , async (req,res)=>{
    let {content} = req.body
    let user = await userModule.findOne({email: req.user.email})
    let post = await postModule.create({
        user: user._id,
        content,
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')

})

function isloggedin(req, res, next) {
    if (req.cookies.token === "") res.redirect("/login")
    else {
        let data = jwt.verify(req.cookies.token, "shhhh")
        req.user = data
        next();
    }

}

app.listen(3000)