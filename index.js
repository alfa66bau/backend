const _ = require('lodash');
const cors = require('cors');
const morgan = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const fileUpload = require('express-fileupload');
const imageDataURI = require('image-data-uri');
const OAuth2 = google.auth.OAuth2;

const PORT = process.env.PORT || 5011;
const app = express();
app.use(bodyParser.json());

app.use(fileUpload({
  createParentPath: true
}));

//add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

const myOAuth2Client = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
myOAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

app.post('/', async (req, res) => {
  const myAccessToken = await myOAuth2Client.getAccessToken();
  const _files = Object.values(req.files).map((f) => {
    const type = f.mimetype;
    const buffer = new Buffer(f.data);
    const path = imageDataURI.encode(buffer, type);
    return { path };
  });

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refresh_token: process.env.REFRESH_TOKEN,
      accessToken: myAccessToken.token,
    }
  });

  const mailOptions = {
    from: req.body.name,
    to: process.env.ADMIN_EMAIL,
    subject: `Message from ${req.body.name}`,
    html: `
    <p>
      <strong>Name</strong>: ${req.body.name}
    </p> 
    <p>
      <strong>Email</strong>: ${req.body.email}
    </p> 
    <p>
      <strong>Telephone:</strong> ${req.body.tel}
    </p> 
    <br />
    <p>
      ${req.body.message}
    </p>`,
    attachments: _files
  }

  transport.sendMail(mailOptions, function (err, result) {
    if (err) {
      res.json({ status: false, err })
    } else {
      transport.close();
      res.json({ status: true })
    }
  })
});

app.listen(PORT, function (req, res) {
  console.log(`Listening on port ${PORT}`);
})
