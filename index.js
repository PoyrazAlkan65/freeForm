// GEZGOZ NEW API SERVER

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sql = require("./mssql");
const rds = require("./redisManager").rds;
const path = require("path");
const ftpM = require("./ftpManager.js");
const u = require("./utils.js");
const DeviceDetector = require("node-device-detector");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");
var cors = require("cors");
const rateLimit = require("express-rate-limit");


const app = express();

const port = process.env.PORT||3000;

const resetCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Çok fazla istek! Lütfen daha sonra tekrar deneyin.",
  },
});



// Statik Dosyalarin Ayarlanmasi
app.use("/wwwroot", express.static(path.join(__dirname + "/wwwroot/")));
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());
app.use(
  cookieParser({
    sameSite: "none",
    secure: true,
  })
);

const detector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  deviceAliasCode: false,
  deviceTrusted: false,
  deviceInfo: false,
  maxUserAgentSize: 500,
});


app.get("/", function (req, res) {
  res.send("FreeForm API Ayakta");
});

// Bireysel profil resmi ekleme
app.post(
  "/uploadPersonalImage",
  ftpM.UGY.single("profilePhoto"),
  async (req, res) => {
    let params = [];
    params.push({
      name: "email",
      value: u.ValidEmailRegex(req.body.email) || "",
    });
    params.push({ name: "userId", value: req.body.userId || "" });
    params.push({ name: "profilePhoto", value: req.file || null });

    let email = params.find((p) => p.name === "email").value;
    let userId = params.find((p) => p.name === "userId").value;
    let uploadedFile = params.find((p) => p.name === "profilePhoto").value;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: "Email veya UserId gerekli!",
      });
    }

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Profil fotoğrafı yüklenmeli.",
      });
    }

    // Dosya tip ve uzantı kontrolü
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const fileExtension =
      uploadedFile.originalname.split(".").pop()?.toLowerCase() || "jpg";

    if (
      !allowedMimeTypes.includes(uploadedFile.mimetype) ||
      !allowedExtensions.includes(fileExtension)
    ) {
      return res.status(400).json({
        success: false,
        message: "Sadece resim dosyaları kabul edilir (JPG, PNG, GIF, WEBP).",
      });
    }

    try {
      // UserId'yi email üzerinden al
      let currentUserId = userId;
      if (!currentUserId && email) {
        const getUserIdSql = `SELECT UserId FROM vw_UsersProfile WHERE Email = @Email`;
        const getUserParams = [{ name: "Email", value: email.toLowerCase() }];

        currentUserId = await new Promise((resolve, reject) => {
          sql.runSQLWithPool(getUserIdSql, getUserParams, (result) => {
            if (result.recordset && result.recordset.length > 0) {
              resolve(result.recordset[0].UserId);
            } else {
              reject(new Error("Kullanıcı bulunamadı"));
            }
          });
        });
      }

      const newFileName = `User_${currentUserId}.${fileExtension}`;
      const fileToUpload = { ...uploadedFile, originalname: newFileName };

      // FTP'ye yükle
      await ftpM.uploadFilesToFTP([fileToUpload], "User/");

      // DB güncelle
      const updateProfileSql = `sp_updatePersonalProfile @Email, @ProfilePhoto, @Biography, @Name`;
      const updateParams = [
        { name: "Email", value: email ? email.toLowerCase() : null },
        { name: "ProfilePhoto", value: newFileName },
        { name: "Biography", value: null },
        { name: "Name", value: null },
      ];

      // Email yoksa userId'den email al
      if (!email && userId) {
        const getUserEmailSql = `SELECT Email FROM vw_UsersProfile WHERE UserId = @UserId`;
        const getUserEmailParams = [{ name: "UserId", value: userId }];

        const userEmail = await new Promise((resolve, reject) => {
          sql.runSQLWithPool(getUserEmailSql, getUserEmailParams, (result) => {
            if (result.recordset && result.recordset.length > 0) {
              resolve(result.recordset[0].Email);
            } else {
              reject(new Error("Kullanıcı bulunamadı"));
            }
          });
        });

        updateParams[0].value = userEmail.toLowerCase();
      }

      await new Promise((resolve, reject) => {
        sql.runSQLWithPool(updateProfileSql, updateParams, (result) => {
          if (
            result &&
            result.recordset &&
            result.recordset.length > 0 &&
            result.recordset[0].Status === "Success"
          ) {
            resolve();
          } else {
            reject(new Error("DB güncellemesi başarısız"));
          }
        });
      });

      res.json({
        success: true,
        message: "Profil fotoğrafı başarıyla yüklendi.",
        fileName: newFileName,
        userId: currentUserId,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Dosya yükleme hatası: " + err.message,
      });
    }
  }
);
app.get("/formdesigner/:id?", async (req, res) => {
  const formId = Number(req.params.id || 0);

  // Basit model (istersen DB'den çek)
  const model = {
    pageTitle: "ACH Form Designer",
    formId,
    feSourceAjaxUrl: "/ach/api" // front-end settings.FE_SOURCEAJAXURL gibi
  };

  res.render("ach/form-designer", model);
});

/**
 * API - Form getir
 */
app.get("/api/forms/:id", async (req, res) => {
  const id = Number(req.params.id);

  // TODO: DB: FormDef + FormFieldDef
  // SELECT * FROM FormDef WHERE Id=@id
  // SELECT * FROM FormFieldDef WHERE FormId=@id AND IsActive=1 ORDER BY Id
  const form = {
    Id: id,
    FormName: "ornek-form",
    FormTitle: "Örnek Başlık",
    FormDesc: "Örnek açıklama",
    IsActive: true,
    ActionButtonText: "Gönder",
    AddCss: "",
    AddJs: ""
  };
  const fields = [
    { Id: 1, FormId: id, FieldName: "FullName", FieldTitle: "Ad Soyad", FieldType: "text", FieldOptions: null, FieldValidScript: "", FieldCss: "", IsActive: true },
    { Id: 2, FormId: id, FieldName: "Email", FieldTitle: "E-posta", FieldType: "email", FieldOptions: null, FieldValidScript: "", FieldCss: "", IsActive: true },
    { Id: 3, FormId: id, FieldName: "City", FieldTitle: "Şehir", FieldType: "select", FieldOptions: JSON.stringify(["Van","İstanbul","Ankara"]), FieldValidScript: "", FieldCss: "", IsActive: true },
  ];

  res.json({ ok: true, form, fields });
});

/**
 * API - Form kaydet (FormDef)
 */
app.post("/api/forms/save", async (req, res) => {
  const p = req.body || {};

  // TODO: upsert FormDef
  // p: { Id, FormName, FormTitle, FormDesc, IsActive, ActionButtonText, AddCss, AddJs }
  res.json({ ok: true, Id: p.Id || 1 });
});

/**
 * API - Alanları kaydet (FormFieldDef toplu)
 */
app.post("/api/forms/:id/fields/save", async (req, res) => {
  const formId = Number(req.params.id);
  const fields = req.body?.fields || [];

  // TODO: basit yaklaşım:
  // 1) formId’ye ait mevcut FieldDef’i pasif et
  // 2) gelenleri insert et
  res.json({ ok: true, formId, count: fields.length });
});

// resetCache
app.post("/resetCache/31b17f2e695656acb181857bf8472896f657454ac7db78a9985719e52dc7ef6e7b700a181040b2082a3548b41c47478c", async function (req, res) {
  if (
    req.headers["authorization"] ==
    "Bearer " +
      "ec34cc35fe3bd5d1907a3d8115511d1031b17f2e695656acb181857bf8472896f657454ac7db78a" +
      "9985719e52dc7ef6e7b700a181040b2082a3548b41c47478cf657454ac7db78a9985719e52dc7ef" +
      "6e7b700a181040b2082a3548b41c47478c6e7b700a181040b2082a3548b41c47478c6e7b700a1810"
  ) {
    console.log("Loading data...");
    AllContentCache = await getContentWithCacheForAllUsers();
    console.log("Load Post data...");
    res.send({
      success: true,
      message: "Cache başarıyla yenilendi.",
    });
  } else {
    res.status(403).send({
      success: false,
      message: "Yetkisiz erişim.",
    });
  }
});
// start server

async function startServer() {
  try {
    // console.log("Loading data...");
    // AllContentCache = await getContentWithCacheForAllUsers();
    // console.log("Load Post data...");
    // UserLastGPS = await getUserLastGPSData();
    // console.log("Load GPS data...");
    // console.log("Data loaded.");
    // setInterval(async () => {
    //   console.timeLog("Loading data...");
    //   AllContentCache = await getContentWithCacheForAllUsers();
    //   console.timeLog("Load Post data...");
    // }, 60 * 60 * 1000);
    app.listen(port, () => {
      console.log(`Server is running on port http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
    process.exit(1);
  }
}

startServer();
