import express from 'express';
import bodyParser from 'body-parser';
import multer from "multer";
import path from "path";

// const router = express.Router();

import { horScopes, mainHeading, ourBlogData, homams, feedback, plans, contactDetails } from './data.js';

import connection from './config/db_client.js';



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/blogs"); // Folder path
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

var app = express();
app.use(bodyParser.json());
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
app.listen(port, () => console.log(`Node app listening on port ${port}`));

// ----------------------------------------------
app.post('/user', (req, res) => {
  const { name, age } = req.body;

  const sql = 'INSERT INTO users (name, age) VALUES (?, ?)';
  connection.query(sql, [name, age], (err, result) => {
    if (err) return res.status(500).send('Error inserting data');
    res.send('User inserted successfully');
  });
});

app.get('/users', (req, res) => {
  const sql = 'SELECT * FROM users';
  connection.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching data');
    }
    res.json(results);
  });
});

// ----------------------------------------------------------

app.get("/cosmic_guide", async function (req, res) {

  const query = 'SELECT * FROM main_headings';
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Database query failed' });
    } else {
      res.json(results);
    }
  });

});

app.put("/cosmic_guide/:id", function (req, res) {

  const { id } = req.params;
  const { type, content } = req.body;

  const query = `UPDATE main_headings SET type = ?, content = ? WHERE id = ?`;
  const values = [type, content, id];

  connection.query(query, values, (error, result) => {
    if (error) {
      return res.status(500).json({ error: 'Database update failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No record found with that ID' });
    }
    res.json({ message: 'Data updated successfully' });
  });


});

app.get("/horoscope", async function (req, res) {

  const query = "SELECT * FROM horoscope";
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Query failed" });
    res.json(results);
  });
});


app.put('/horoscope/:sign', (req, res) => {
  const sign = req.params.sign;
  const data = req.body;

  const query = `UPDATE horoscope SET 
    date = ?, summary = ?, personality = ?, main_traits = ?, weaknesses = ?,
    lucky_color = ?, luck_number = ?, status = ?, energy = ?, luck = ?, love = ?
    WHERE horo_title = ?`;

  const values = [
    data.date, data.summary, data.personality, data.main_traits, data.weaknesses,
    data.lucky_color, data.luck_number, data.status, data.energy, data.luck, data.love, sign
  ];
  connection.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: 'Update failed' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Horo_title sign not found' });
    res.json({ message: 'Horoscope updated successfully' });
  });
});


app.post("/blogData", upload.single("image"), (req, res) => {
  const { title, date, translations } = JSON.parse(req.body.data); 
  const image = req.file ? "/uploads/blogs/" + req.file.filename : "";

  const blogInsert = `INSERT INTO ourblogs (title, image, date) VALUES (?, ?, ?)`;

  connection.query(blogInsert, [title, image, date], (err, blogResult) => {
    if (err) return res.status(500).json({ error: "Failed to insert blog", details: err });

    const blogId = blogResult.insertId;

    let translationTasks = translations.map((t) => {
      return new Promise((resolve, reject) => {
        const tQuery = `INSERT INTO blogsdata (ourblogs_id, language, subtitle, intro) VALUES (?, ?, ?, ?)`;

        connection.query(tQuery, [blogId, t.language, t.subtitle, t.intro], (err, tResult) => {
          if (err) return reject(err);

          const blogsdataId = tResult.insertId;

          let sectionTasks = t.sections.map((s) => {
            return new Promise((resSec, rejSec) => {
              const sQuery = `INSERT INTO blogs_sections (blogsData, heading, yoga, dosha) VALUES (?, ?, ?, ?)`;
              connection.query(sQuery, [blogsdataId, s.heading, s.yoga, s.dosha], (err) => {
                if (err) return rejSec(err);
                resSec();
              });
            });
          });

          Promise.all(sectionTasks).then(resolve).catch(reject);
        });
      });
    });

    Promise.all(translationTasks)
      .then(() => {
        res.json({ message: "Blog inserted with image and translations", blog_id: blogId });
      })
      .catch((err) => {
        res.status(500).json({ error: "Translation insert failed", details: err });
      });
  });
});

app.get("/blogData/:id", (req, res) => {
  const blogId = req.params.id;

  const query = `
    SELECT  ob.id AS blog_id,ob.title,ob.image,ob.date,bd.id AS blogsdata_id,
      bd.language,bd.subtitle,bd.intro,bs.heading,bs.yoga,bs.dosha
    FROM ourblogs ob
    JOIN blogsdata bd ON ob.id = bd.ourblogs_id
    JOIN blogs_sections bs ON bd.id = bs.blogsData
    WHERE ob.id = ?
  `;

  connection.query(query, [blogId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Query failed', details: err.message });
    if (!rows.length) return res.status(404).json({ message: "Blog not found" });

    // Group into nested format
    const blog = {
      id: rows[0].blog_id,
      title: rows[0].title,
      image: rows[0].image,
      date: rows[0].date,
      translations: []
    };

    const langMap = {};

    rows.forEach(row => {
      if (!langMap[row.blogsdata_id]) {
        langMap[row.blogsdata_id] = {
          language: row.language,
          subtitle: row.subtitle,
          intro: row.intro,
          sections: []
        };
        blog.translations.push(langMap[row.blogsdata_id]);
      }

      langMap[row.blogsdata_id].sections.push({
        heading: row.heading,
        yoga: row.yoga,
        dosha: row.dosha
      });
    });

    res.json(blog);
  });
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


app.get("/homams", (req, res) => {
  const query = `
    SELECT 
      h.id AS homam_id,h.pujaName,h.image,h.category,h.bookingDate,h.price,
      h.qty,h.descp,p.id AS participant_id,p.name,p.dob,p.birthStar,p.rashi,p.gotram
    FROM homams h
    LEFT JOIN participants p ON h.id = p.homams_id
    ORDER BY h.id;
  `;

  connection.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "Query failed", details: err.message });

    const result = {};
    rows.forEach(row => {
      if (!result[row.homam_id]) {
        result[row.homam_id] = {
          id: row.homam_id,
          pujaName: row.pujaName,
          image: row.image,
          category: row.category,
          bookingDate: row.bookingDate,
          price: row.price,
          qty: row.qty,
          descp: row.descp,
          participants: []
        };
      }

      if (row.participant_id) {
        result[row.homam_id].participants.push({
          id: row.participant_id,
          name: row.name,
          dob: row.dob,
          birthStar: row.birthStar,
          rashi: row.rashi,
          gotram: row.gotram
        });
      }
    });

    res.json(Object.values(result));
  });
});




app.get("/feedback", (req, res) => {
  const query = "SELECT * FROM feedback ORDER BY created_at DESC";

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch feedback", details: err.message });
    res.json(results);
  });
});

app.post("/feedback", (req, res) => {
  const { name, email, location, testimonial } = req.body;

  if (!name || !email || !location || !testimonial) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `
    INSERT INTO feedback (name, email, location, testimonial, approved)
    VALUES (?, ?, ?, ?, false)
  `;

  connection.query(query, [name, email, location, testimonial], (err, result) => {
    if (err) return res.status(500).json({ error: "Insert failed", details: err.message });

    res.json({ message: "Feedback submitted successfully", id: result.insertId });
  });
});



app.post("/plans", (req, res) => {
  const { plan_name, price, popular, label, title, features } = req.body;

  if (!plan_name || !price || !features || !Array.isArray(features)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const insertPlan = `
    INSERT INTO plans (plan_name, price, popular, label, title)
    VALUES (?, ?, ?, ?, ?)
  `;

  connection.query(insertPlan, [plan_name, price, popular, label, title], (err, result) => {
    if (err) return res.status(500).json({ error: "Plan insert failed", details: err.message });

    const plan_id = result.insertId;

    const featureInserts = features.map(f => [plan_id, f]);
    const insertFeatures = `
      INSERT INTO plan_features (plan_id, feature)
      VALUES ?
    `;

    connection.query(insertFeatures, [featureInserts], (err2) => {
      if (err2) return res.status(500).json({ error: "Features insert failed", details: err2.message });

      res.json({ message: "Plan created successfully", plan_id });
    });
  });
});


app.get("/allplans", (req, res) => {
  const query = `
    SELECT 
      p.id AS plan_id,p.plan_name,p.price,p.popular,p.label,p.title,
      f.id AS feature_id,f.feature
    FROM plans p
    LEFT JOIN plan_features f ON p.id = f.plan_id
    ORDER BY p.id;
  `;

  connection.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "Query failed", details: err.message });

    const plansMap = {};

    rows.forEach(row => {
      if (!plansMap[row.plan_id]) {
        plansMap[row.plan_id] = {
          id: row.plan_id,
          plan_name: row.plan_name,
          price: row.price,
          popular: row.popular,
          label: row.label,
          title: row.title,
          features: []
        };
      }

      if (row.feature) {
        plansMap[row.plan_id].features.push(row.feature);
      }
    });

    res.json(Object.values(plansMap));
  });
});



app.post("/contact", (req, res) => {
  const { phone, email, address, facebook_url, instagram_url } = req.body;

  if (!phone || !email || !address) {
    return res.status(400).json({ error: "Phone, email, and address are required" });
  }

  const query = `
    INSERT INTO contact_details (phone, email, address, facebook_url, instagram_url)
    VALUES (?, ?, ?, ?, ?)
  `;

  connection.query(query, [phone, email, address, facebook_url, instagram_url], (err, result) => {
    if (err) return res.status(500).json({ error: "Insert failed", details: err.message });

    res.json({ message: "Contact details added successfully", id: result.insertId });
  });
});


app.get("/contact", (req, res) => {
  const query = `SELECT * FROM contact_details ORDER BY id DESC`;

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Fetch failed", details: err.message });
    res.json(results);
  });
});

