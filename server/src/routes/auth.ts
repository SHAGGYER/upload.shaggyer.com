import {Router} from "express";
import passport from "passport";

const router = Router();

router.get(
  "/github",
  passport.authenticate("github", {scope: ["repo,user"]}), /// Note the scope here
  function (req, res) {
  }
);

router.get(
  "/github/callback",
  passport.authenticate("github", {failureRedirect: "/login"}),
  function (req, res) {
    const user = req["user"];
    console.log(user)

    let redirectUrl = process.env.CLIENT_URL! + "?githubAccessToken=" + user.accessToken + "&githubUsername=" + user.profile.username;

    res.redirect(redirectUrl);
  }
);

export default router;
