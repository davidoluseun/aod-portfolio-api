const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const Joi = require("joi");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
require("dotenv").config();

const OAuth2 = google.auth.OAuth2;
const app = express();
const PORT = process.env.PORT || 3900;

app.use(cors({ origin: true }));
app.use(bodyParser.json());

const schema = Joi.object().keys({
  name: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  subject: Joi.string().trim().allow(""),
  phone: Joi.string()
    .trim()
    .regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/)
    .allow(""),
  message: Joi.string().trim().required(),
});

app.post("/mail", (req, res) => {
  const data = req.body;

  const { error } = schema.validate(data);
  if (error) return res.json({ message: "INVALID" });

  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  google.options({ auth: oauth2Client });

  const accessToken = new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) return res.json({ message: "FAIL" });
      else resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  const mail = {
    from: data.name,
    to: process.env.EMAIL,
    subject: "New Entry from my Portfolio Website - " + data.subject,
    text: `Client detail: \nName: ${data.name} \nEmail: ${data.email} \nPhone number: ${data.phone} \n\nMessage: \n${data.message}`,
  };

  transporter.sendMail(mail, (error, response) => {
    error ? res.json({ message: "FAIL" }) : res.json({ message: "SUCCESS" });
    transporter.close();
  });
});

app.get("/", (req, res) => {
  res.send(`Server running at port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
