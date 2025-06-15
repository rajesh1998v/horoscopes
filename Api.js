var express = require("express");

let passport = require("passport");
let jwt = require("jsonwebtoken");
let JWTStrategy = require("passport-jwt").Strategy;
let ExtractJWT = require("passport-jwt").ExtractJwt;

let { horScopes, mainHeading, ourBlogData, homams, feedback, plans,contactDetails } = require("./data.js");


var app = express();
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Expose-Headers", "Authorization");
  res.header("Access-Control-Expose-Headers", "X-Auth-Token");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
  next();
});

let port = 2410;

app.use(passport.initialize());

app.listen(port, () => console.log(`Node app listening on port ${port}`));
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const parama = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(), secretOrKey: "jwtsecret23647832"
};


app.get("/cosmic_guide", async function (req, res) {
  try {
    res.send(mainHeading);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});

app.put("/cosmic_guide", function (req, res) {
  const { heading, intro, desc } = req.body;
  if (heading) {
    mainHeading[0].heading = heading;
  }
  if (intro) {
    mainHeading[1].intro = intro;
  }
  if (desc) {
    mainHeading[2].desc = desc;
  }
  res.json({
    message: 'Content updated successfully',
    data: mainHeading
  });

});

app.get("/horoscope", async function (req, res) {
  try {
    res.send(horScopes);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});


app.put("/horoscope/:sigh", function (req, res) {
  let sign = req.params.sigh;
  let body = req.body;
  const index = horScopes.findIndex(item => item[sign]);
  console.log(index);

  if (index >= 0) {
    horScopes[index][sign] = { ...horScopes[index][sign], ...body }
    res.send(horScopes[index][sign]);

  }
  else {
    res.status(404).send({ message: "Sign not found" });
  }

});



app.post("/blogData", async function (req, res) {
  const { title, image = "", date, hindi, english } = req.body;

  if (!title || !date || !hindi || !english) {
    return res.status(400).json({ message: "Title, Date, Hindi and English sections are required." });
  }

  const newBlog = { title, image, date, hindi, english };
  ourBlogData.push(newBlog);
  res.status(201).json({ message: "Blog added successfully!", blog: newBlog });

});



app.get("/blogData", async function (req, res) {
  try {
    res.send(ourBlogData);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});

app.post("/homams", async function (req, res) {
  const {
    image = "", pujaName, category, bookingDate, price, qty = 1, desc = "", parpants = [] } = req.body;

  if (!pujaName || !bookingDate || !price || parpants.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const newHomam = { image, pujaName, category, bookingDate, price, qty, desc, parpants };

  homams.push(newHomam);
  res.status(201).json(newHomam);

});


app.get("/homams", async function (req, res) {
  try {
    res.send(homams);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
})


app.post("/feedback", async function (req, res) {
  let body = req.body;

  if (!body.name || !body.email || !body.testimonial) {
    return res.status(400).send({ message: "Name, Email, and Testimonial are required." });
  }
  let newFeedback = { ...body, approved: false };
  feedback.push(newFeedback);
  res.status(201).send(newFeedback);


});

app.get("/feedback", async function (req, res) {
  try {
    res.send(feedback);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});

app.post("/plans", async function (req, res) {

  const { plan_name, price, popular = false, label, title, features } = req.body;

  if (!plan_name || !price || !title || !Array.isArray(features)) {
    return res.status(400).json({ message: "Missing required fields or invalid data format" });
  }

  const newPlan = { plan_name, price, popular, label, title, features };
  plans.push(newPlan);
  res.status(201).json({ message: "Plan added successfully", plan: newPlan });

});

app.get("/allPlans", async function (req, res) {
  try {
    res.send(plans);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});

app.post("/contact", (req, res) => {
  const { phone, email, address, facebok_url, inst_url } = req.body;

  if (!phone || !email || !address) {
    return res.status(400).json({ message: "All fields are required." });
  }

  contactDetails.push(contactInfo);
  res.status(201).json({ message: "Contact info added successfully", data: contactInfo });
});

app.get("/contact", async function (req, res) {
  try {
    res.send(contactDetails);
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      
      res.status(status).send(statusText);
    } else res.status(484).send(error);
  }
});
