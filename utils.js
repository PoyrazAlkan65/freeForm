const sql = require("./mssql");

function TryParseInt(str, defaultValue = 0) {
    if (str === null || str === undefined || str.toString().trim() === "") {
        return defaultValue;
    }

    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

function ExFrontEndParams(prefix) {
    let FE = {};
    let ob = Object.keys(process.env);
    for (let i = 0; i < ob.length; i++) {
        let env = ob[i];
        if (env.indexOf(prefix) != -1) {
            FE[env] = process.env[env];
        }
    }
    return FE;
}

function ValidEmailRegex(email) {
    const str = String(email || "").toLowerCase().trim();
    const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(str) ? str : null;
}


function PasswordCheck(password, repeatPassword) {
    return password === repeatPassword;
}

function isNumericParam(param) {
    const regex = /^[0-9]+$/;
    return regex.test(param);
}

async function isUniqueEmail(email) {

    let sqlString = `select count(1) as sayi from vw_AllUsers where Email='${email}'`;
    let count = await sql.runSQLWithPoolMulti([sqlString], [], []);
    return count[0].sayi > 0;
}



module.exports.isNumericParam = isNumericParam;
module.exports.PasswordCheck = PasswordCheck;
module.exports.ValidEmailRegex = ValidEmailRegex;
module.exports.TryParseInt = TryParseInt;
module.exports.ExFrontEndParams = ExFrontEndParams;
module.exports.isUniqueEmail = isUniqueEmail;