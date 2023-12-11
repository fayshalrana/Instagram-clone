var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const upload = require("./multer");
const passport = require("passport");
const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));
const { formatDistanceToNow } = require("date-fns");

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const posts = await postModel.find().populate("user");
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("feed", { footer: true, posts, user, formatDistanceToNow });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  res.render("profile", { footer: true, user });
});

router.get("/search", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("search", { footer: true, user });
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.get("/upload", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true, user });
});

//search
router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, "i");
  const users = await userModel.find({ username: regex });
  res.json(users);
});
//likes
router.get("/like/post/:id", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });

  //if already like, remove like
  //if not like, like it
  if (post.likes.indexOf(user._id) == -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.redirect("/feed");
});

// User Register
router.post("/register", async function (req, res) {
  var userData = await new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });
  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

//login
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/",
  })
);

// logout
router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
  });
  res.redirect("/login");
});

// update user profile
router.post("/update", upload.single("image"), async function (req, res) {
  var updatedUser = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );
  if (req.file) {
    updatedUser.profileImage = req.file.filename;
  }
  await updatedUser.save();
  res.redirect("/profile");
});

// upload post
router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const post = await postModel.create({
      caption: req.body.caption,
      picture: req.file.filename,
      user: user._id,
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/feed");
  }
);

//isLoggedIn
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

module.exports = router;
