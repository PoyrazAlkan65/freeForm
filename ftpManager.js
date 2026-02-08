const multer = require('multer');
const ftp = require('basic-ftp');
const MyStream = require('stream');
const u = require("./utils.js")
function getFTPConfig() {
  return {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USR,
    password: process.env.FTP_PWD,
    secure: false
  };
}

const storage = multer.memoryStorage(); // ? Dosyaları bellek içerisinde tutar
const uploadGorselYonetim = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 10 MB dosya boyutu sınırı
});

async function uploadFilesToFTP(files, FolderName = '') {
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    await ftpClient.ensureDir(FolderName);
    await ftpClient.access(getFTPConfig());
    for (const file of files) {
      const fileStream = MyStream.Readable.from(file.buffer);
      await ftpClient.uploadFrom(fileStream, FolderName + file.originalname);
      console.log(`Dosyalar Yüklendi: ${file.originalname}`);
    }
  } catch (err) {
    console.error('Dosya Yüklenemedi:', err);
    throw err;
  } finally {
    ftpClient.close();
  }
}


async function listFilesOnFTP() {
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    const files = await ftpClient.list();
    console.log('FTP Sunucusundaki Dosyalar:');
    files.forEach(file => console.log(file.name));
    return files;
  } catch (err) {
    console.error('Dosyalar Listelenemiyor:', err);
    throw err;
  } finally {
    ftpClient.close();
  }
}
async function MkDirByPath(path, name) {
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    const dir = await ftpClient.ensureDir(path + name)
    return dir;
  } catch (err) {
    console.error('klasör olusturulamadı:', err);
    throw err;
  } finally {
    ftpClient.close();
  }
}
async function listFilesOnFTPByPath(listPath) {
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    const files = await ftpClient.list(listPath);
    console.log('FTP Sunucusundaki Dosyalar:');
    files.forEach(file => console.log(file.name));
    return files;
  } catch (err) {
    console.error('Dosyalar Listelenemiyor:', err);
    throw err;
  } finally {
    ftpClient.close();
  }
}


async function delFilesOnFTP(file) {
  let a = u.ExFrontEndParams("FE")
  let FE_CDN_LINK = a["FE_CDN_LINK"];
  file = file.replace(FE_CDN_LINK, "");
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    await ftpClient.remove(file);
    console.log('FTP Sunucusundaki Dosyalar Silindi.' + file);
    return true;
  } catch (err) {
    console.error('Dosya Silinemiyor:', err);

    return false;
  } finally {
    ftpClient.close();
  }

}

async function renameFilesOnFTP(file,newName) {
  let a = u.ExFrontEndParams("FE")
  let FE_CDN_LINK = a["FE_CDN_LINK"];
  file = file.replace(FE_CDN_LINK, "");
  const ftpClient = new ftp.Client();
  try {
    await ftpClient.access(getFTPConfig());
    await ftpClient.rename(file,newName);
    console.log('FTP Sunucusundaki Dosyalar isimlendirildi.' + file +"====>"+ newName);
    return true;
  } catch (err) {
    console.error('Dosya isimlendirilemiyor:', err);

    return false;
  } finally {
    ftpClient.close();
  }

}


function handleFilesUpload(FolderName, is_user_base_upload) {
  return function (req, res, next) {
    let F_path = FolderName;
    if (is_user_base_upload == true) { if (res.locals.userId) { F_path = FolderName + res.locals.userId + "/"; } }
    uploadFilesToFTP(req.files, F_path)
      .then(function (result) {
        console.log('Dosyalar Yüklendi.');
        next();
      })
      .catch(function (err) {
        console.log('Dosyalar Yüklenmedi.')
        next();
      });
  }
}


module.exports.UGY = uploadGorselYonetim;
module.exports.HFU = handleFilesUpload;
module.exports.LF = listFilesOnFTP;
module.exports.LFBP = listFilesOnFTPByPath;
module.exports.DF = delFilesOnFTP;
module.exports.RF= renameFilesOnFTP;
module.exports.MkDirByPath = MkDirByPath; 
module.exports.uploadFilesToFTP = uploadFilesToFTP;