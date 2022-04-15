const { authenticator } = require("otplib");
const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
const fs = require("fs");
const QRCode = require("qrcode");
const app = express();
const port = 3002;
const pathDB = "./db/db.json";
const ADMIN_EMAIL = "nguyentiendung.eddie@gmail.com";
const ADMIN_ISSUER = "EddieOnTheCode";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("2fa authenticator server");
});

/**
 * Lay danh sach nguoi dung
 */
app.get("/users", (req, res) => {
  GetData(pathDB)
    .then((response) => {
      res.send(JSON.parse(response));
    })
    .catch((error) => {
      res.send("ERROR: Cannot read db");
    });
});

app.get("/users-qr", (req, res) => {
  const QRCode = require("qrcode");
  // Generate Token.
  // Prepare the qrcode
  GetData(pathDB)
    .then((response) => {
      var data = JSON.parse(response);
      data.forEach((user, index) => {
        // const secretKey = authenticator.generateSecret();
        const qrCodeStr = `otpauth://totp/${user.DisplayName}?secret=${user.SecretKey}&issuer=${ADMIN_ISSUER}`;
        QRCode.toDataURL(qrCodeStr)
          .then((x) => {
            user["QrCode"] = x.replace("data:image/png;base64,", "");
            // user["SecretKey"] = secretKey;
            if (index >= data.length - 1) {
              res.send(data);
            }
          })
          .catch((y) => {
            res.send("ERROR: Cannot generate QR code 1");
          });
      });
    })
    .catch((error) => {
      res.send("ERROR: Cannot generate QR code");
    });
});
/**
 * Login
 */
app.post("/login", async (req, res) => {
  try {
    var data = await GetDataAsync(pathDB);
    if (!data) {
      res.send("ERROR: Cannot read data");
    }
    var username = req.body.Username;
    var password = req.body.Password;
    var currUser = data.find((user) => {
      return user.User == username && user.Password == password;
    });

    if (currUser) {
      res.send({Success: true, Username: currUser.User, Message: `Hello ${currUser.User}`});
    } else {
      res.send({Success: false, Message: "Wrong account !!!"});
    }
  } catch (error) {
    res.send(error);
  }
});

app.post("/check-otp", async (req, res) => {
  try {
    var code = req.body.Code;
    var username = req.body.Username;
    var data = await GetDataAsync(pathDB);
    var currUser = data.find((user) => {
      return user.User == username;
    });
    if (currUser) {
      const isValid = authenticator.check(code, currUser.SecretKey); // result sẽ là true / false.
      res.send({
        Success: isValid,
        Message: isValid ? "Correct otp" : "Wrong otp"
      });
    } else {
      res.send({ Success: false, Message: "ERROR: User is not exists" });
    }
  } catch (err) {
    res.send({ err, msg: "Error" });
  }
});

app.get("/user-qr", (req, res) => {
  var qrstring = `otpauth://totp/${ADMIN_EMAIL}?secret=IVHF6HDFAACXMML6&issuer=${ADMIN_ISSUER}`;
  QRCode.toDataURL(qrstring)
    .then((response) => {
      res.send(response);
    })
    .catch((error) => {
      res.send("ERROR: Cannot generate QR code");
    });
});

// port is port of environment when deployed
app.listen(process.env.PORT || port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

/**
 * Ham lay du lieu tu file json theo URL
 */
async function GetData(pathDB) {
  return new Promise((resolve, reject) => {
    fs.readFile(pathDB, "utf8", function (err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function GetDataAsync(pathDB) {
  const fs = require("fs").promises;
  var data = await fs.readFile(pathDB, "utf8");
  if (data) {
    return JSON.parse(data);
  } else {
    return {};
  }
}
