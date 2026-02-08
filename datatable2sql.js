
String.prototype.replaceAll = function (searchStr, replaceStr) {
  var str = this;
  if (str.indexOf(searchStr) === -1) {
      return str;
  }
  return (str.replace(searchStr, replaceStr)).replaceAll(searchStr, replaceStr);
}
//d2sql.asQuery({ "pasif": "IsActive Is NULL", "Active": "IsActive Is NOT NULL", "All": undefined })
//back-end örnek kod
asQuery = function (colname) {
  return function (req, res, next) {
    if (!req.asQuery) { req.asQuery = [] }
    if (Array.isArray(colname)) { req.asQuery = colname }
    else { req.asQuery.push(colname)}
    next();
  }
}

exCOL = function (colname) {
  return function (req, res, next) {
    if (!req.excol) { req.excol = [] }
    if (Array.isArray(colname)) { req.excol = colname }
    else { req.excol.push(colname)}
    next();
  }
}
exCOL = function (colname) {
  return function (req, res, next) {
    if (!req.excol) { req.excol = [] }
    if (Array.isArray(colname)) { req.excol = colname }
    else { req.excol.push(colname)}
    next();
  }
}
DateCOL = function (colname) {

  return function (req, res, next) {
    if (!req.datecol) { req.datecol = [] }
    if (Array.isArray(colname)) { req.datecol = colname; }
    else { req.datecol.push(colname); }
    next();
  }
}
NumericCOL = function (colname) {

  return function (req, res, next) {
    if (!req.Numericcol) { req.Numericcol = [] }
    if (Array.isArray(colname)) { req.Numericcol = colname; }
    else { req.Numericcol.push(colname); }
    next();
  }
}

dataTableQuery2SQL = function (custom_where) {
  if (custom_where == "0" || custom_where == "") { custom_where = undefined; }
  
  return function (req, res, next) {
    if(req.asQuery!=undefined){
      custom_where = req.asQuery[0][req.query.CustomCode];
    }
    
    
    var q = [];
    var col = []
    var result = " WHERE ";
    for (let i = 0; i < 100; i++) {
      if (req.body["columns[" + i + "][data]"] && req.body["columns[" + i + "][data]"] != "" && !req.excol.includes(req.body["columns[" + i + "][data]"])) {


        if (req.Numericcol.includes(req.body["columns[" + i + "][data]"])) {
          col.push("CAST(ISNULL(" + req.body["columns[" + i + "][data]"] + ",0) as nvarchar(max))")

        }
        else if (req.datecol.includes(req.body["columns[" + i + "][data]"])) {
          col.push("CONVERT(VARCHAR(25),ISNULL(" + req.body["columns[" + i + "][data]"] + ",'01-01-1900'), 126)")
        }
        else {
          col.push("CAST(ISNULL(" + req.body["columns[" + i + "][data]"] + ",'') as nvarchar(max))")
        }
      }
      if (req.body["columns[" + i + "][data]"] && req.body["columns[" + i + "][data]"] != "" &&
        req.body["columns[" + i + "][orderable]"] &&
        req.body["columns[" + i + "][search][value]"] && req.body["columns[" + i + "][search][value]"] != "" &&
        req.body["columns[" + i + "][searchable]"]) {
        if (req.Numericcol.includes(req.body["columns[" + i + "][data]"])) {
          q.push("CAST(ISNULL(" + req.body["columns[" + i + "][data]"] + ",0) as nvarchar(max)) like '%" + req.body["columns[" + i + "][search][value]"].replaceAll("'", "") + "%'");
        }
        else if (req.datecol.includes(req.body["columns[" + i + "][data]"])) {
          q.push("CONVERT(VARCHAR(25),ISNULL(" + req.body["columns[" + i + "][data]"] + ",'01-01-1900'), 126) like '%" + req.body["columns[" + i + "][search][value]"].replaceAll("'", "") + "%'");
        }
        else {
          q.push(req.body["columns[" + i + "][data]"] + " like '%" + req.body["columns[" + i + "][search][value]"].replaceAll("'", "") + "%'");
        }
      }
    }
    if (req.body["search[value]"] && req.body["search[value]"] != "") {

      q.push(col.join("+' '+") + " like '%" + req.body["search[value]"] + "%' ");
    }
    result += q.join(' and ');
    if(req.body.gf && req.body.gfdata){ custom_where= req.body.gf + "=" + req.body.gfdata;} 
    if (custom_where) { if (result == " WHERE ") { result += custom_where; } else { result += " and " + custom_where } }
    if (result == " WHERE ") { result = ""; }
    if (req.body["start"] == "NaN") {
      req.body["start"] = req.body["start1"];
    }
    
    result += " Order by " + req.body["columns[" + req.body["order[0][column]"] + "][data]"] + " " + req.body["order[0][dir]"] + " OFFSET " + req.body["start"] + " ROWS FETCH NEXT " + req.body["length"] + " ROWS ONLY OPTION (RECOMPILE);"
   
    req.dataTableQuery2SQL = result;
    req.dataTableQuery2SQL4Params = result.replaceAll("'",'"');
    
    req.dataTableStart = req.body["start"];
    req.dataTablePageLen = req.body["length"];
    if(custom_where==undefined ||custom_where==''){
      custom_where=""
    }
    else{
      custom_where=" where "+custom_where
    }


    //req.custom_where = custom_where.indexOf("WHERE")!=-1 ? custom_where : " WHERE " + custom_where; 
    req.custom_where = custom_where 
    next();
  }
}

module.exports.exCOL = exCOL;
module.exports.asQuery = asQuery;
module.exports.dateCOL = DateCOL;
module.exports.NumericCOL = NumericCOL;
module.exports.dataTableQuery2SQL = dataTableQuery2SQL;


//module.exports.custom_where =custom_where;
