const app = require("express")();
const flash = require('connect-flash');
const session = require('express-session');
const auth = require('./auth.js');
//var schedule = require('node-schedule');
process.env.TZ = 'Europe/Prague';

//addresses
var clientPage = "https://mikronews.herokuapp.com";
var thisPage = "https://mikroserver.herokuapp.com";
//var clientPage = "//localhost:3000";
//var thisPage = "//localhost:5000";

//dates
const months = [ 'ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince' ];
const monthsMain = [ 'leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec' ];

//values
var serverPassword = "xa4!hhš02/%&@đŠ_ÁÍ+1";
var symbols = "[&/\\#,:()$~%.'\"*?<>{}]";
var codings = [ 'win1250', 'win1251', 'win1252', 'utf8' ];

//arrays
var globalCats = new Array(), gCatsIds = new Array(), gJournals = new Array(), gOrigin = new Array();
var specId = "";

//update parameter
var updating = false;

//logger
var t = new Date();
var logName = t.getFullYear() + "_" + (t.getMonth() + 1).toString() + "_" + t.getDate() + "_log";
const options = {
    timeZone: "Europe/Prague",
    folderPath: './logs/',
    dateBasedFileNaming: false,
    fileName: logName,
    dateFormat: 'YYYY_MM_D',
    timeFormat: 'h:mm:ss A',
}

//database configuration
const mc = require('mongodb');
const MongoClient = mc.MongoClient;
var mongoUri = "mongodb+srv://mikrouser:mojeheslo1!@mikro-database-ljvf6.mongodb.net/";

//configuration
app.use('/public', require('express').static(require('path').join(__dirname, 'public')));
app.use(require("body-parser").urlencoded({ extended: false }));
app.use(require('body-parser').json());
app.set('view engine', 'pug');
app.locals.pretty = true;
app.use(session({ secret: 'some-secret', saveUninitialized: false, resave: true }));
app.use(auth.initialize());
app.use(auth.session());
app.use(flash());

//constants
const request = require('request');
const cheerio = require('cheerio');
const _ = require('underscore');
const fs = require('fs');
var log = require('node-file-logger');
log.SetUserOptions(options);


//check values
function checkValues(params, res) {
    if (isDefined(params.name)) {
        var reqName = params.name.trim(), nr = params.nr, nv = params.nv;

        //check name
        if (!isDefined(nr.name) || !isDefined(nv.name)) {
            res.send({ ok: false, error: { type: "nr", parm: "name", mess: "Název je povinný parametr." } });
            return;
        }
        if (nr.name.trim() !== nv.name.trim()) {
            res.send({ ok: false, error: { type: "nr", parm: "name", mess: "Neshodují se názvy deníku u Stahování a Parsování." } });
            return;
        }
        if (reqName.length > 0) {
            if (nr.name.trim() !== reqName || nv.name.trim() !== reqName) {
                res.send({ ok: false, error: { type: "req", parm: "name", mess: "Názvy deníku nesouhlasí." } });
                return;
            }
            if (gJournals.indexOf(reqName) === -1) {
                res.send({ ok: false, error: { type: "req", parm: "name", mess: "Deník s názvem " + reqName + " neexistuje." } });
                return;
            }
            if (!isDefined(nr._id) || !isDefined(nv._id)) {
                res.send({ ok: false, error: { type: "req", parm: "_id", mess: "Nesnažte se obejít formuláře ;)" } });
                return;
            }
            if (nr._id.trim().length !== 24 || nv._id.trim().length !== 24) {
                res.send({ ok: false, error: { type: "req", parm: "_id", mess: "Nesnažte se obejít formuláře ;)" } });
                return;
            }
        }

        var journalName = nr.name.toLocaleLowerCase().trim();
        if (journalName.length < 4 || journalName.length > 25) {
            res.send({ ok: false, error: { type: "nr", parm: "name", mess: "Název deníku musí mít 4 až 25 znaků." } });
            return;
        }
        if (journalName !== reqName && gJournals.indexOf(journalName) !== -1) {
            res.send({ ok: false, error: { type: "req", parm: "name", mess: "Deník s tímto názvem již existuje." } });
            return;
        }
        if (/[^a-z0-9.-]/.test(journalName)) {
            res.send({ ok: false, error: { type: "nr", parm: "name", mess: 'Název deníku může obsahovat pouze malá písmena bez diakritiky, čísla a znaky "." a "-"' } });
            return;
        }

        if (!isDefined(nr.link)) {
            res.send({ ok: false, error: { type: "nr", parm: "link", mess: "Odkaz je povinný parametr." } });
            return;
        }
        if (nr.link.trim().length < 5) {
            res.send({ ok: false, error: { type: "nr", parm: "link", mess: "Odkaz je povinný parametr." } });
            return;
        }
        request({ url: nr.link, encoding: null, gzip: true }, function (error, response, body) {
            //bad link
            if (!isDefined(body)) {
                res.send({ ok: false, error: { type: "nr", parm: "link", mess: "Zadaný odkaz není funkční. Zkontrolujte odkaz a zkuste to znovu." } });
                return;
            } else {
                //coding
                if (!isDefined(nr.coding)) {
                    res.send({ ok: false, error: { type: "nr", parm: "coding", mess: "Kódování je povinný parametr." } });
                    return;
                }
                if (codings.indexOf(nr.coding) === -1) {
                    res.send({ ok: false, error: { type: "nr", parm: "coding", mess: "Nepodporované kódování." } });
                    return;
                }

                //paging
                if (!isDefined(nr.paging)) {
                    res.send({ ok: false, error: { type: "nr", parm: "paging", mess: "Stránkování je povinný parametr." } });
                    return;
                }
                if ('' + nr.paging === 'true') {
                    //defined page params
                    if (!isDefined(nr.firstPage)) {
                        res.send({ ok: false, error: { type: "nr", parm: "firstPage", mess: "První strana je povinný parametr." } });
                        return;
                    }
                    if (!isDefined(nr.nextPagePlus)) {
                        res.send({ ok: false, error: { type: "nr", parm: "nextPagePlus", mess: "Další strana je povinný parametr." } });
                        return;
                    }
                    if (!isDefined(nr.pageSymbol)) {
                        res.send({ ok: false, error: { type: "nr", parm: "pageSymbol", mess: "Řetězec před číslem strany je povinný parametr." } });
                        return;
                    }
                    //required page params
                    var tmp = nr.firstPage.replace(/[^0-9]/g,'');
                    if (tmp.length == 0) {
                        res.send({ ok: false, error: { type: "nr", parm: "firstPage", mess: "První strana musí být číslo a je to povinný parametr." } });
                        return;
                    }
                    tmp = nr.nextPagePlus.replace(/[^0-9]/g,'');
                    if (tmp.length == 0) {
                        res.send({ ok: false, error: { type: "nr", parm: "nextPagePlus", mess: "Druhá strana musí být číslo a je to povinný parametr." } });
                        return;
                    }
                    //pageSymbol
                    tmp = nr.pageSymbol.trim();
                    if (tmp.length === 0) {
                        res.send({ ok: false, error: { type: "nr", parm: "pageSymbol", mess: "Řetězec před číslem strany je povinný parametr." } });
                        return;
                    }
                    if (isDefined(nr.nextPage)) {
                        if (nr.nextPage.trim().length > 0) {
                            if (nr.nextPage.lastIndexOf(tmp) === -1) {
                                res.send({ ok: false, error: { type: "nr", parm: "pageSymbol", mess: "Řetězec před číslem strany nebyl v rozdílu stran nalezen." } });
                                return;
                            }
                        }
                    }
                    if (nr.link.lastIndexOf(tmp) === -1) {
                        res.send({ ok: false, error: { type: "nr", parm: "pageSymbol", mess: "Řetězec před číslem strany nebyl v odkazu nalezen." } });
                        return;
                    }
                } else if ('' + nr.paging !== 'false') {
                    res.send({ ok: false, error: { type: "nr", parm: "paging", mess: "Stránkování musí být nastaveno na true nebo false." } });
                    return;
                }

                //limitSelector
                if (isDefined(nr.limitSelector)) {
                    if (nr.limitSelector.trim().length > 0) {
                        if (nr.limitSelector.trim().length !== nr.limitSelector.toString().replace(/[^0-9]/g,'').length) {
                            res.send({ ok: false, error: { type: "nr", parm: "limitSelector", mess: "Parametr omezení počtu článků na stránku musí být číslo." } });
                            return;
                        }
                    }
                }

                //categories
                if (!isDefined(nr.categories)) {
                    res.send({ ok: false, error: { type: "nr", parm: "categories", mess: "Musíte zadat nejméně jednu kategorii." } });
                    return;
                }
                if (nr.categories instanceof Array) {
                    if (nr.categories.length === 0) {
                        res.send({ ok: false, error: { type: "nr", parm: "categories", mess: "Musí být vybrána nejméně jedna kategorie." } });
                        return;
                    } else {
                        var ar = nr.categories;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            var a = ar[i];
                            if (typeof a !== 'string') {
                                res.send({ ok: false, error: { type: "nr", parm: "categories", mess: "Kategorie obsahuje špatně zadané parametry." } });
                                return;
                            } else if (gCatsIds.indexOf(a) === -1) {
                                res.send({ ok: false, error: { type: "nr", parm: "categories", mess: "Jedna ze zadaných kategorií neexistuje." } });
                                return;
                            }
                        }
                    }
                } else {
                    res.send({ ok: false, error: { type: "nr", parm: "categories", mess: "Parametr kategorie musí být pole hodnot." } });
                    return;
                }

                //article defines
                if (!isDefined(nr.parentSelector)) {
                    res.send({ ok: false, error: { type: "nr", parm: "parentSelector", mess: "Selektor obálky není definován." } });
                    return;
                }
                if (!isDefined(nr.linkSelector)) {
                    res.send({ ok: false, error: { type: "nr", parm: "linkSelector", mess: "Selektor odkazu není definován." } });
                    return;
                }
                if (!isDefined(nr.imageSelector)) {
                    res.send({ ok: false, error: { type: "nr", parm: "imageSelector", mess: "Selektor obrázku není definován." } });
                    return;
                }
                if (!isDefined(nr.imageSelectorAttr)) {
                    res.send({ ok: false, error: { type: "nr", parm: "imageSelectorAttr", mess: "Atribut obrázku není definován." } });
                    return;
                }

                if (nr.linkSelector.trim().length === 0 && nr.parentSelector.trim().length === 0) {
                    res.send({ ok: false, error: { type: "nr", parm: "linkSelector", mess: "Selektor odkazu článku není zadán." } });
                    return;
                }
                if (nr.imageSelector.trim().length > 0) {
                    if (nr.parentSelector.trim().length === 0) {
                        res.send({ ok: false, error: { type: "nr", parm: "imageSelector", mess: "Ke stažení úvodního obrázku je potřeba zadat obálku článku." } });
                        return;
                    }
                }

                //special articles
                if (isDefined(nr.specialParentSelector) || isDefined(nr.specialLinkSelector) || isDefined(nr.specialImageSelector) || isDefined(nr.specialIimageSelectorAttr)) {
                    if (isDefined(nr.specialParentSelector) && isDefined(nr.specialLinkSelector) && isDefined(nr.specialImageSelector) && isDefined(nr.specialIimageSelectorAttr)) {
                        if (nr.specialLinkSelector.trim().length === 0) {
                            res.send({ ok: false, error: { type: "nr", parm: "specialLinkSelector", mess: "Selektor odkazu speciálního článku není zadán." } });
                            return;
                        }
                        if (nr.specialImageSelector.trim().length > 0) {
                            if (nr.specialParentSelector.trim().length === 0) {
                                res.send({ ok: false, error: { type: "nr", parm: "specialImageSelector", mess: "Ke stažení úvodního obrázku speciálního článku je potřeba zadat obálku speciálního článku." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nr", parm: "specialLinkSelector", mess: "Jedna z hodnot speciálních článků není definována." } });
                        return;
                    }
                }

                //parsing
                //title
                if (!isDefined(nv.titleSelector)) {
                    res.send({ ok: false, error: { type: "nv", parm: "titleSelector", mess: "Nadpis článku je povinný parametr." } });
                    return;
                }
                if (nv.titleSelector.trim().length === 0) {
                    res.send({ ok: false, error: { type: "nv", parm: "titleSelector", mess: "Nadpis článku je povinný parametr." } });
                    return;
                }
                //perex
                if (!isDefined(nv.textSelector)) {
                    res.send({ ok: false, error: { type: "nv", parm: "textSelector", mess: "Úvodní text článku není definován." } });
                    return;
                }
                //perexCut
                if (!isDefined(nv.perexCut)) {
                    res.send({ ok: false, error: { type: "nv", parm: "perexCut", mess: "Musíte zadat, zda je úvodní text součástí obsahu." } });
                    return;
                }
                if (nv.perexCut.trim().length === 0) {
                    res.send({ ok: false, error: { type: "nv", parm: "perexCut", mess: "Musíte zadat, zda je úvodní text součástí obsahu." } });
                    return;
                }
                //date
                if (!isDefined(nv.dateSelector)) {
                    res.send({ ok: false, error: { type: "nv", parm: "dateSelector", mess: "Datum článku je povinný parametr." } });
                    return;
                }
                if (nv.dateSelector.trim().length === 0) {
                    res.send({ ok: false, error: { type: "nv", parm: "dateSelector", mess: "Datum článku je povinný parametr." } });
                    return;
                }
                //content
                if (!isDefined(nv.content)) {
                    res.send({ ok: false, error: { type: "nv", parm: "content", mess: "Obsah článku je povinný parametr." } });
                    return;
                }
                if (nv.content.trim().length === 0) {
                    res.send({ ok: false, error: { type: "nv", parm: "content", mess: "Obsah článku je povinný parametr." } });
                    return;
                }
                //contentRemove
                if (isDefined(nv.contentRemove)) {
                    if (nv.contentRemove instanceof Array) {
                        var ar = nv.contentRemove;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            if (typeof ar[i] !== 'string') {
                                res.send({ ok: false, error: { type: "nv", parm: "contentRemove", mess: "Selektory obsahu musí být pole řetězců." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "contentRemove", mess: "Selektory obsahu musí být pole řetězců." } });
                        return;
                    }
                }
                //tags
                if (!isDefined(nv.tags)) {
                    res.send({ ok: false, error: { type: "nv", parm: "tags", mess: "Tagy článku nejsou definovány." } });
                    return;
                }
                //categories
                if (nr.categories.length > 1) {
                    if (!isDefined(nv.categories)) {
                        res.send({ ok: false, error: { type: "nv", parm: "categories", mess: "Musí být zadáno rozdělení do kategorií." } });
                        return;
                    }
                    if (nv.categories instanceof Array) {
                        var ar = nv.categories;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            var a = ar[i];
                            if (gCatsIds.indexOf(a.category) === -1) {
                                res.send({ ok: false, error: { type: "nv", parm: "categories", mess: "Kategorie " + a.category + " neexistuje." } });
                                return;
                            }
                            if (a.category === specId) {
                                res.send({ ok: false, error: { type: "nv", parm: "categories", mess: "Kategorie Nezařazené neexistuje." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "categories", mess: "Rozdělení do kategorií musí být pole." } });
                        return;
                    }
                }
                //okLinks
                if (isDefined(nv.okLinks)) {
                    if (nv.okLinks instanceof Array) {
                        var ar = nv.okLinks;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            if (typeof ar[i] !== 'string') {
                                res.send({ ok: false, error: { type: "nv", parm: "okLinks", mess: "Whitelist odkazů musí být pole řetězců." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "okLinks", mess: "Whitelist odkazů musí být pole řetězců." } });
                        return;
                    }
                }
                //badLinks
                if (isDefined(nv.badLinks)) {
                    if (nv.badLinks instanceof Array) {
                        var ar = nv.badLinks;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            if (typeof ar[i] !== 'string') {
                                res.send({ ok: false, error: { type: "nv", parm: "badLinks", mess: "Blacklist odkazů musí být pole řetězců." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "badLinks", mess: "Blacklist odkazů musí být pole řetězců." } });
                        return;
                    }
                }
                //removeSelectors
                if (isDefined(nv.removeSelectors)) {
                    if (nv.removeSelectors instanceof Array) {
                        var ar = nv.removeSelectors;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            if (typeof ar[i] !== 'string') {
                                res.send({ ok: false, error: { type: "nv", parm: "removeSelectors", mess: "Selektor špatného článku musí být pole řetězců." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "removeSelectors", mess: "Selektor špatného článku musí být pole řetězců." } });
                        return;
                    }
                }
                //removeValueSelectors
                if (isDefined(nv.removeValueSelectors)) {
                    if (nv.removeValueSelectors instanceof Array) {
                        var ar = nv.removeValueSelectors;
                        var l = ar.length;
                        for (let i = 0; i < l; i++) {
                            var a = ar[i];
                            if (typeof a.selector !== 'string' || typeof a.value !== 'string') {
                                res.send({ ok: false, error: { type: "nv", parm: "removeValueSelectors", mess: "Selektor i hodnota musí být řetězec." } });
                                return;
                            }
                        }
                    } else {
                        res.send({ ok: false, error: { type: "nv", parm: "removeValueSelectors", mess: "Selektor s hodnotou musí být pole." } });
                        return;
                    }
                }

                //no errors
                res.send({ ok: true, error: {} });
                return;
            }
        });
    } else {
        res.send({ ok: false, error: { type: "", parm: "", mess: "Nesnažte se obejít formuláře :D\nNemá to cenu :)" } });
        return;
    }
}

//helpfull functions for parse, download, remove etc...
//get collection name from journal name
function getCollectionName(string) {
    //super-stranka.cz -> super-stranka_cz
    return string.toLowerCase().split(".").join("_");
}
//download HTML
function getHTML(link, coding, callback) {
    var loopCount = 0;
    (function loop() {
        request({ url: link, encoding: null, gzip: true }, function (error, response, body) {
            //check failure
            if (!isDefined(body)) {
                loopCount++;
                if (loopCount < 8) {
                    loop();
                    return;
                } else {
                    callback("");
                    return;
                }
            }

            //::html
            callback(require('iconv-lite').decode(body, coding));
        });
    })();
}
//is var string
function isString(string) {
    return typeof string === "string";
}
//get name of page
function getMainPage(link) {
    if (typeof link === "string") {
        var count = 0;
        let len = link.length;
        for (let i = 0; i < len; i++) {
            if (link[i] === "/") {
                count++;
                if (count == 3) {
                    link = link.substring(0, i);
                    break;
                }
            }
        }
    }
    return link;
}
//fix link
function fixLink(link, originAddress) {
    var outLink = "";
    if (isString(link) && isString(originAddress)) {
        link = link.trim();
        if (link.length > 0) {
            if (link.substring(0, 2) != "//" && link.substring(0, 4) != "http" && link.substring(0, 4) != "www.") {
                if (link[0] == "/") {
                    outLink = originAddress + link;
                } else if (link.substring(0, 2) == "./") {
                    outLink = originAddress + link.substring(1);
                } else if (link.substring(0, 3) == "../") {
                    outLink = originAddress + link.substring(2);
                } else {
                    outLink = originAddress + '/' + link;
                }
            } else {
                outLink = link;
            }
        } 
    }
    return outLink;
}
//find link
function findLink(link) {
    var outLink = "";
    if (isString(link)) {
        link = link.trim();
        var startIndex = link.indexOf("//");
        var endIndex = link.indexOf(", ");
        if (startIndex != -1) {
            if (endIndex == -1) {
                outLink = link.substring(startIndex);
            } else {
                outLink = link.substring(startIndex, endIndex);
            }
        }
    }
    return outLink;
}
//cut with typeof check
function userCut(string) {
    var limit = 125;
    if (isString(string)) {
        string = string.trim();
        var length = string.length;
        if (length > limit) {
            var index = length - 1;
            for (let i = limit - 1; i < string.length; i++) {
                if (string[i] == " ") {
                    index = i;
                    break;
                }
            }
            string = string.substring(0, index).trim() + "...";
        }
    } else {
        string = "";
    }
    return string;
}
//get article read time (in minutes)
function getReadTime(length) {
    return Math.ceil(length / 1000);
}
//old date
function isDateOk(date, nowDate) {
    var nowDateTemp = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    nowDateTemp.setDate(nowDateTemp.getDate() - 7);
    var dateTemp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateTemp > nowDateTemp;
}
//get date from string
function getDate(string) {
    var date = new Date(), nowDate = new Date();
    string = string.toLocaleLowerCase().trim();

    if (string.length > 0) {
        //get date
        if (string.indexOf("dnes") != -1 || string.indexOf("právě") != -1 || string.indexOf("před") != -1 || string.indexOf("teď") != -1 || string.indexOf("hodin") != -1) {
            date.setFullYear(nowDate.getFullYear());
            date.setMonth(nowDate.getMonth());
            date.setDate(nowDate.getDate());
        } else if (string.indexOf("včera") != -1 || string.indexOf("vcera") != -1 || string.indexOf("dny") != -1) {
            nowDate.setDate(nowDate.getDate() - 1);

            date.setFullYear(nowDate.getFullYear());
            date.setMonth(nowDate.getMonth());
            date.setDate(nowDate.getDate());
        } else {
            var next = true;
            //day.monthWord year
            for (let i = 0; i < months.length; i++) {
                if (string.indexOf(months[i]) != -1 || string.indexOf(monthsMain[i]) != -1) {
                    if (string.indexOf(nowDate.getFullYear() - 1) != -1) {
                        date.setFullYear(nowDate.getFullYear() - 1);
                    } else {
                        date.setFullYear(nowDate.getFullYear());
                    }
                    date.setMonth(i);
                    date.setDate(parseInt(string.split(".")[0].replace( /^\D+/g, '')));
                    next = false;
                    break;
                }
            }

            //day.month.year
            if (next) { 
                var splitDate = string.split(".");
                var array = new Array();
                for (let i = 0; i < splitDate.length; i++) {
                    var el = splitDate[i].replace( /^\D+/g, '');
                    if (el.length > 0) {
                        array.push(parseInt(el));
                    }
                }
                if (array.length > 1) {
                    date.setFullYear(nowDate.getFullYear());
                    date.setMonth(array[1] - 1);
                    date.setDate(array[0]);
                    if (array.length > 2) {
                        if (array[2].toString().indexOf(nowDate.getFullYear() - 1) != -1) {
                            date.setFullYear(nowDate.getFullYear() - 1);
                        }
                    }
                    next = false;
                }
            }

            //other cases
            if (next) {
                date = nowDate;
                date.setFullYear(nowDate.getFullYear() - 1);
            }
        }

        //get time hh:mm
        var index = string.indexOf(":");
        if (index != -1) {
            //hours
            var hour = "";
            for (let i = index - 1; i >= index - 2; i--) {
                if (!isNaN(string[i])) {
                    hour = string[i] + hour;
                } else {
                    break;
                }
            }
            if (!isNaN(parseInt(hour))) {
                date.setHours(parseInt(hour));
            }

            //minutes
            var mins = "";
            for (let i = index + 1; i < index + 3; i++) {
                if (!isNaN(string[i])) {
                    mins += string[i];
                } else {
                    break;
                }
            }
            if (!isNaN(parseInt(mins))) {
                date.setMinutes(parseInt(mins));
            }
        } else {
            date.setHours(0, 0, 0);
        }
    } else {
        date = nowDate;
        date.setFullYear(nowDate.getFullYear() - 1);
    }

    return date;
}
//is defined
function isDefined(value) {
    return value !== undefined && value !== null;
}
//special case - CSFD parent
function getCsfdNumber(link) {
    var t = 0, sel = "";
    if (isString(link)) {
        var length = link.length;
        for (let i = 0; i < length; i++) {
            if (link[i] == "/") {
                t++;
                if (t == 4) {
                    for (let j = i + 1; j < length; j++) {
                        if (!isNaN(link[j])) {
                            sel += link[j];
                        } else {
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }
    return sel;
}
//is upper case
function isUpper(str) {
    return str === str.toLocaleUpperCase();
}
//is lowerr case
function isLower(str) {
    return str === str.toLocaleLowerCase();
}
//is letter
function isLetter(c) {
    return c.toLocaleLowerCase() !== c.toLocaleUpperCase();
}
//seprate to p
function separateText(string) {
    var blocks = string.split("\n");
    var out = "";
    let len = blocks.length;
    for (let i = 0; i < len; i++) {
        let temp = blocks[i].trim();
        if (temp.length > 5) {
            out += "<p>" + temp +"</p>\n";
        }
    }
    len = out.length;
    for (let i = 5; i < len - 6; i++) {
        if (out[i] === "." && isLower(out[i - 1]) && isLetter(out[i - 1]) && isUpper(out[i + 1]) && isLetter(out[i + 1])) {
            out[i] = "Đ";
        }
    }
    out = out.split("Đ").join("</p><p>");
    return out;
}
//get tags
function getTags(originTags, title, perex, content) {
    var output = new Array();

    //origin tags
    let len = originTags.length;
    for (let i = 0; i < len; i++) {
        var string = originTags[i].replace(/[&\/\\#,:“„()$~%.'"*?<>{}″]/g, " ");
        string = string.replace(/\n|\r/g, " ");
        string = string.split(" ");
        let l = string.length;
        for (let j = 0; j < l; j++) {
            let s = string[j].trim().toLocaleLowerCase();
            if (s.length > 2 && output.indexOf(s) === -1) {
                output.push(s);
            }
        }
    }

    //title tags
    if (output.length < 5) {
        var string = title.replace(/[&\/\\#,:“„()$~%.'"*?<>{}″]/g, ' ');
        string = string.replace(/\n|\r/g, " ");
        string = string.split(" ");
        let l = string.length;
        for (let i = 0; i < l; i++) {
            let word = string[i].trim();
            if (word.length > 1) {
                if (isUpper(word[0])) {
                    word = word.toLocaleLowerCase();
                    if (output.indexOf(word) === -1) {
                        output.push(word);
                    }
                }
            }
        }
    }

    //content tags
    if (output.length < 8) {
        content = perex + " " + content;
        let string = content.split(" ");
        let l = string.length;
        var strings = new Array();
        for (let i = 0; i < l; i++) {
            if (string[i].trim().length > 0) {
                strings.push(string[i].trim());
            }
        }

        l = strings.length;
        for (let i = 1; i < l; i++) {
            var word = strings[i].replace(/[&\/\\#,:“„()$~%.'"*?<>{}″]/g, '');
            word = word.replace(/\n|\r/g, " ");
            word = word.trim();
            if (word.length > 2) {
                if (isUpper(word[0])) {
                    let prevWord = strings[i - 1];
                    if (symbols.indexOf(prevWord[prevWord.length - 1]) === -1) {
                        word = word.toLocaleLowerCase().trim();
                        if (output.indexOf(word) === -1) {
                            output.push(word);
                        }
                    }
                }
            }
        }
    }

    return output;
}


//methods
//remove all articles categories
function removeAllArticles(journalName, after) {
    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
        if (error) {
            log.Error("admin : odstranění všech článků : Problém s připojením k databázi.");
        } else {
            let articlesDatabase = client.db("articles-database");

            articlesDatabase.collection(getCollectionName(journalName)).deleteMany({}, function(err1, res1) {
                if (err1) {
                    log.Error("admin : odstranění všech článků : Problém při odstraňování všech článků deníku " + journalName + ".");
                } else {
                    log.Info("admin : odstranění všech článků : Odstranění všech článků deníku " + journalName + " bylo úspěšné.");
                }
                after();
                client.close();
            });
        }
    });
}
//remove old articles
function removeOldArticles(journalName, limitDate, finished) {
    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
        if (error) {
            log.Error("getJournals: Problém s připojením k databázi.");
        } else {
            let articlesDatabase = client.db("articles-database");

            articlesDatabase.collection(getCollectionName(journalName)).find({}).sort({ dat: -1 }).toArray(function(err1, res1) {
                if (err1) {
                    log.Error('removeOldArticles : ' + journalName + ' : Problém s připojením k databázi.');
                    client.close();
                } else {
                    let temp = new Array();
                    let i = res1.length;
                    while (i--) {
                        if (res1[i].dat < limitDate) {
                            temp.push(res1[i]._id);
                        } else {
                            break;
                        }
                    }

                    if (temp.length > 0) {
                        articlesDatabase.collection(getCollectionName(journalName)).deleteMany({ _id : { '$in' : temp }}, function(err2) {
                            if (err2) {
                                log.Error('removeOldArticles : deleteMany : ' + journalName + ' : Problém při mazání člínků.');
                            } else {
                                finished();
                            }
                            client.close();
                        });
                    } else {
                        finished();
                        client.close();
                    }
                }
            });
        }
    });
}
//parseArticle
function parseArticle(html, valuesObject, originAddress, articleLink, actualTime, noNull) {
    //tags & removeSelectors & content are not affected by parent
    if (isString(html) && isDefined(valuesObject)) {
        var $ = cheerio.load(html);
        var article = {};
        
        var specSel = "";
        if (isString(valuesObject.name)) {
            if (valuesObject.name === "csfd.cz") {
                specSel = "#news-" + getCsfdNumber(articleLink) + " ";
            }
        }

        //title (only required value)
        if (isString(valuesObject.titleSelector)) {
            var temp = $(specSel + valuesObject.titleSelector.trim()).first();
            if (temp !== null) {
                article.tit = temp.text().trim();
            } else {
                article.tit = "";
            }
            if ((temp === null || article.tit.length == 0) && !noNull) {
                article = null;
            }
            
            //keep only specific urls
            let okLinks = valuesObject.okLinks;
            if (isDefined(okLinks)) {
                let okLink = false;
                for (let k = 0; k < okLinks.length; k++) {
                    if (articleLink.toLocaleLowerCase().trim().indexOf(okLinks[k].toLocaleLowerCase().trim()) !== -1) {
                        okLink = true;
                        break;
                    }
                }
                if (okLinks.length > 0 && !okLink) {
                    article = null;
                }
            }

            //remove specific urls
            let badLinks = valuesObject.badLinks;
            if (isDefined(badLinks)) {
                for (let k = 0; k < badLinks.length; k++) {
                    if (articleLink.toLocaleLowerCase().trim().indexOf(badLinks[k].toLocaleLowerCase().trim()) !== -1) {
                        article = null;
                        break;
                    }
                }
            }

            //remove special cases
            let removeSelectors = valuesObject.removeSelectors;
            if (isDefined(removeSelectors)) {
                let selectors = removeSelectors;
                let countR = selectors.length;
                for (let i = 0; i < countR; i++) {
                    if ($(specSel + selectors[i].trim()).length !== 0) {
                        article = null;
                        break;
                    }
                }
            }

            //remove special cases with value
            if (isDefined(valuesObject.removeValueSelectors)) {
                let sSelectors = valuesObject.removeValueSelectors;
                let countS = sSelectors.length;
                for (let i = 0; i < countS; i++) {
                    if ($(specSel + sSelectors[i].selector.trim()).first().text().trim().toLocaleLowerCase() === sSelectors[i].value.trim().toLocaleLowerCase()) {
                        article = null;
                        break;
                    }
                }
            }

            if (article !== null) {
                //main img
                article.mim = "";
                if (isString(valuesObject.imageSelector)) {
                    temp = $(specSel + valuesObject.imageSelector.trim()).first();
                    article.mim = (temp !== null) ? fixLink(temp.attr(valuesObject.imageSelectorAttr.trim()), originAddress) : "";
                }

                //date
                article.dat = "";
                if (isString(valuesObject.dateSelector)) {
                    temp = $(specSel + valuesObject.dateSelector.trim()).first();
                    article.dat = (temp !== null) ? getDate(temp.text().trim(), actualTime) : "";
                }

                //journal info
                article.jrn = valuesObject.name;
                
                //category
                article.cat = "";
                var categoriesTemp = valuesObject.categories;
                if (isDefined(categoriesTemp)) {
                    let countC = categoriesTemp.length;
                    if (countC > 0) {
                        while (countC--) {
                            if (articleLink.indexOf(categoriesTemp[countC].text.trim().toLocaleLowerCase()) !== -1) {
                                article.cat = categoriesTemp[countC].category.trim().toLocaleLowerCase();
                                break;
                            }
                        }
                        if (article.cat === "") {
                            article.cat = specId;
                        }
                    }
                }

                //content
                article.con = "";
                var rawContent = "";
                if (isString(valuesObject.content)) {
                    temp = $(specSel + valuesObject.content.trim());
                    temp = temp.clone().find('script').remove().end();
                    temp = temp.clone().find('noscript').remove().end();
                    temp = temp.clone().find('style').remove().end();
                    temp = temp.clone().find('table').remove().end();
                    temp = temp.clone().find('img').remove().end();
                    temp = temp.clone().find('code').remove().end();
                    temp = temp.clone().find('iframe').remove().end();
                    temp = temp.clone().find('form').remove().end();

                    if (isDefined(valuesObject.contentRemove)) {
                        var jMax =  valuesObject.contentRemove.length;
                        for (let j = 0; j < jMax; j++) {
                            temp = temp.clone().find(valuesObject.contentRemove[j].trim()).remove().end();
                        }
                    }
                    rawContent = temp.text().trim();
                    article.con = separateText(rawContent);
                }

                //check content
                if (article.con.length < 16 && !noNull) {
                    article = null;
                } else if (article.dat === "" && !noNull) {
                    article = null;
                } else {
                    //perex
                    article.per = "";
                    if (isDefined(valuesObject.perexCut)) {
                        if (valuesObject.perexCut === "true" || valuesObject.perexCut === true) {
                            article.per = userCut(article.con.slice(0).split("<p>").join(" ").split("</p>").join(" ").trim());
                        }
                    }
                    if (article.per.trim().length === 0) {
                        if (isString(valuesObject.textSelector)) {
                            temp = $(specSel + valuesObject.textSelector.trim());
                            article.per = (temp !== null) ? temp.first().text().trim() : "";
                        }
                    }
                    if (article.per.trim().length === 0) {
                        article = null;
                    } else {
                        //readTime
                        article.rdt = getReadTime(rawContent.length + article.per.length);

                        //tags
                        article.tag = new Array();
                        if (isString(valuesObject.tags)) {
                            $(specSel + valuesObject.tags.trim()).each(function(i, element) {
                                article.tag.push($(this).text().trim().toLocaleLowerCase());
                            });
                        }

                        temp = "";
                        if (isDefined(valuesObject.perexCut)) {
                            if (valuesObject.perexCut === false || valuesObject.perexCut === "false") {
                                temp = article.per;
                            }
                        }
                        article.tag = getTags(article.tag, article.tit, temp, rawContent);
                    }
                }
            }
        } else {
            article = null;
        }
    }
    return article;
}
//downloadArticles
function downloadArticles(requestObject, valuesObject, finished) {
    if (isDefined(requestObject)) {
        var address = "", originAddress = "";
        if (isString(requestObject.link)) {
            address = requestObject.link;
            originAddress = getMainPage(address);

            if (isString(requestObject.firstPage) && isString(requestObject.nextPage)) {
                var actualPage = requestObject.firstPage.trim().length != 0 ? parseInt(requestObject.firstPage.trim()) : "";
                var nextPage = requestObject.nextPage.trim();
                var limitSelector = 0;
                if (isString(requestObject.limitSelector)) {
                    limitSelector = parseInt(requestObject.limitSelector.trim());
                }
        
                var links = new Array(), images = new Array(), articles = new Array(), actualTime = new Date();
        
                MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                    if (error) {
                        log.Error("downloadArticles : Problém s připojením k databázi.");
                    } else {
                        let articlesDatabase = client.db("articles-database");

                        let tempName = "";
                        if (isString(requestObject.name)) {
                            if (requestObject.name.trim().length > 4) {
                                tempName = requestObject.name.trim();
                            }
                        }

                        articlesDatabase.collection(getCollectionName(tempName)).find({}).sort({ dat: -1 }).limit(16).toArray(function(err1, res1) {
                            if (err1) {
                                log.Error('downloadArticles : ' + requestObject.name + ' : Poslední články : Problém v přístupu k databázi.');
                                finished();
                                client.close();
                            } else {
                                var lastArticlesInDatabase = res1;
        
                                var loopCount = 0;
                                (function loop() {
                                    request({ url: address, forever: true, encoding: null, gzip: true }, function (err2, res2, body) {
                                        //check failure
                                        if (!isDefined(body)) {
                                            loopCount++;
                                            if (loopCount < 8) {
                                                loop();
                                            }
                                            return;
                                        } else {
                                            loopCount = 0;
                                        }
                                        
                                        //::html
                                        var charset = "utf8";
                                        if (isString(requestObject.coding)) {
                                            if (codings.indexOf(requestObject.coding) !== -1) {
                                                charset = requestObject.coding;
                                            }
                                        }
                                        body = require('iconv-lite').decode(body, charset);
                                        
                                        //::DOM
                                        var $ = cheerio.load(body);
                                        
                                        //::special selector (not required, but must be defined)
                                        if (isString(requestObject.specialParentSelector) && isString(requestObject.specialLinkSelector) && isString(requestObject.specialImageSelector)) {
                                            var withSpecialParentSelector = requestObject.specialParentSelector.trim().length != 0;
                                            var withSpecialLinkSelector = requestObject.specialLinkSelector.trim().length != 0;
                                            var withSpecialImageSelector = requestObject.specialImageSelector.trim().length != 0;
                                            if (withSpecialParentSelector) {
                                                $(requestObject.specialParentSelector).each(function(i, element) {
                                                    var link = withSpecialLinkSelector ? $(this).find(requestObject.specialLinkSelector).first().attr("href") : $(this).attr("href");
                                                    links.push(fixLink(link, originAddress));
                                                    var image = withSpecialImageSelector ? $(this).find(requestObject.specialImageSelector).first().attr(requestObject.specialImageSelectorAttr) : "";
                                                    if (isDefined(requestObject.specialFindInImage)) {
                                                        if (requestObject.specialFindInImage) {
                                                            images.push(findLink(image));
                                                        } else {
                                                            images.push(fixLink(image, originAddress));
                                                        }
                                                    } else {
                                                        images.push(fixLink(image, originAddress));
                                                    }
                                                });
                                            } else if (withSpecialLinkSelector) {
                                                $(requestObject.specialLinkSelector).each(function(i, element) {
                                                    links.push(fixLink($(this).attr("href"), originAddress));
                                                    images.push("");
                                                });
                                            }
                                        }
                    
                                        //::classic selector
                                        if (isString(requestObject.parentSelector) && isString(requestObject.linkSelector) && isString(requestObject.imageSelector)) {
                                            var withParentSelector = requestObject.parentSelector.trim().length != 0;
                                            var withLinkSelector = requestObject.linkSelector.trim().length != 0;
                                            var withImageSelector = requestObject.imageSelector.trim().length != 0;
                                            if (withParentSelector) {
                                                $(requestObject.parentSelector).each(function(i, element) {
                                                    if (limitSelector > 0 && i >= limitSelector) {
                                                        return false;
                                                    }
                                                    var link = withLinkSelector ? $(this).find(requestObject.linkSelector).first().attr("href") : $(this).attr("href");
                                                    links.push(fixLink(link, originAddress));
                                                    var image = withImageSelector ? $(this).find(requestObject.imageSelector).first().attr(requestObject.imageSelectorAttr) : "";
                                                    if (isDefined(requestObject.findInImage)) {
                                                        if (requestObject.findInImage) {
                                                            images.push(findLink(image));
                                                        } else {
                                                            images.push(fixLink(image, originAddress));
                                                        }
                                                    } else {
                                                        images.push(fixLink(image, originAddress));
                                                    }
                                                });
                                            } else if (withLinkSelector) {
                                                $(requestObject.linkSelector).each(function(i, element) {
                                                    if (limitSelector > 0 && i >= limitSelector) return false;
                                                    links.push(fixLink($(this).attr("href"), originAddress));
                                                    images.push("");
                                                });
                                            } else {
                                                log.Warn(requestObject.name + " : none selector finded.");
                                            }
                                        }
        
                                        //::after download all articles on one page
                                        var tempArticles = new Array();

                                        var ended = function(stop) {
                                            for (let m = 0; m < tempArticles.length; m++) {
                                                articles.unshift(tempArticles[m]);
                                            }
                                            
                                            if (stop || requestObject.paging === "false" || requestObject.paging === false) {
                                                if (articles.length > 0) {
                                                    var t = new Date();
                                                    for (let j = 0; j < articles.length; j++) {
                                                        if (articles[j].dat.getHours() === 0 && articles[j].dat.getMinutes() === 0) {
                                                            articles[j].dat.setHours(t.getHours(), t.getMinutes(), t.getSeconds());
                                                            t.setSeconds(t.getSeconds() + 2);
                                                        }
                                                    }

                                                    articlesDatabase.collection(getCollectionName(requestObject.name)).insertMany(articles, function(err3, res3) {
                                                        if (err3) {
                                                            log.Error('downloadArticles : ' + requestObject.name + ' : Problém při vkládání do databáze.');
                                                        } else {
                                                            log.Info(requestObject.name + ": bylo přidáno " + res3.insertedCount + " článků.");
                                                        }
                                                        finished();
                                                        client.close();
                                                    });
                                                } else {
                                                    finished();
                                                    client.close();
                                                }
                                            } else {
                                                if (nextPage.length === 0) {
                                                    actualPage += parseInt(requestObject.nextPagePlus);
                                                    address = address.substring(0, address.lastIndexOf(requestObject.pageSymbol) + 1) + actualPage.toString();
                                                } else {
                                                    address = address + nextPage + actualPage;
                                                    nextPage = "";
                                                }
                                                
                                                links = new Array(), images = new Array();
                                                loop();
                                            }
                                        }
                    
                                        //::loop for links
                                        var k = 0, countK = links.length;
                                        var articleLink = links[k];
                                        var forcedStop = false, temporaryStop = false;
                    
                                        //::download articles
                                        var innerLoopCount = 0;
                                        (function innerLoop() {
                                            request({ url: articleLink, forever: true, encoding: null, gzip: true }, function (err4, res4, inBody) {
                                                //check failure
                                                if (!isDefined(inBody)) {
                                                    innerLoopCount++;
                                                    if (innerLoopCount >= 8) {
                                                        if (++k < countK) {
                                                            articleLink = links[k];
                                                            innerLoopCount = 0;
                                                            innerLoop();
                                                        } else {
                                                            ended(forcedStop);
                                                        }
                                                    } else {
                                                        innerLoop();
                                                    }
                                                    return;
                                                } else {
                                                    innerLoopCount = 0;
                                                }
                    
                                                //::html
                                                inBody = require('iconv-lite').decode(inBody, charset);
                                                let article = parseArticle(inBody, valuesObject, originAddress, articleLink, actualTime, false);
                    
                                                if (article !== null) {
                                                    article.sim = images[k];
                                                    article.lnk = articleLink;
                                                    tempArticles.push(article);
                                                    
                                                    //check, if article is already in database
                                                    let l = lastArticlesInDatabase.length;
                                                    for (let j = 0; j < l; j++) {
                                                        if (lastArticlesInDatabase[j].tit === article.tit || lastArticlesInDatabase[j].lnk === article.lnk) {
                                                            k = countK;
                                                            tempArticles.pop();
                                                            forcedStop = true;
                                                            break;
                                                        }
                                                    }
                                                    //check date
                                                    if (k !== countK && !isDateOk(article.dat, new Date())) {
                                                        if (!temporaryStop) {
                                                            temporaryStop = true;
                                                            tempArticles.pop();
                                                        } else {
                                                            k = countK;
                                                            tempArticles.pop();
                                                            forcedStop = true;
                                                        }
                                                    }
                                                }
                    
                                                if (++k < countK) {
                                                    articleLink = links[k];
                                                    innerLoop();
                                                } else {
                                                    ended(forcedStop);
                                                }
                                            });
                                        })();
                                    });
                                })();
                            }
                        });
                    }
                });
            } else {
                finished();
            }
        } else {
            finished();
        }
    } else {
        finished();
    }
}


//start functions
//update server data
function getJournals(next, callback) {
    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
        if (error) {
            log.Error("getJournals: Problém s připojením k databázi.");
        } else {
            let configureDatabase = client.db("configure-database");

            //get categories
            configureDatabase.collection("categories").find({}).sort( { _id: 1 } ).toArray(function(err1, res1) {
                if (err1) {
                    log.Error('getJournals : categories : Problém s připojením k databázi.');
                    if (next) callback();
                    client.close();
                } else {
                    let tempIds = new Array();
                    let p = res1.length;
                    while (p--) {
                        if (res1[p].ur !== "nezarazene") {
                            tempIds.push("" + res1[p]._id);
                        } else {
                            specId = "" + res1[p]._id;
                        }
                    }
                    globalCats = res1.slice(0);
                    gCatsIds = tempIds.slice(0);

                    //get journals
                    configureDatabase.collection("requests").find({}).toArray(function(err2, res2) {
                        if (err2) {
                            log.Error('getJournals : requests : Problém s připojením k databázi.');
                            if (next) callback();
                            client.close();
                        } else {
                            let temp = new Array(), len = res2.length;
                            for (let i = 0; i < len; i++) {
                                temp.push(res2[i].name);
                            }
                            gJournals = temp.slice(0);

                            //load backup names
                            fs.readdir('./backup/', (err3, fileNames) => {
                                if (err3) {
                                    log.Error("getJournals : backup : Problém v přístupu do složky backup");
                                    getJournals(next, callback);
                                } else {
                                    fileNames = fileNames.sort().reverse();
                                    let fnb = fileNames[0];
                                    fs.readFile('./backup/' + fnb, 'utf8', function (err4, data) {
                                        if (err4) {
                                            log.Error("getJournals : backup : Problém v přístupu k souboru " + fnb + ".");
                                            getJournals(next, callback);
                                        } else {
                                            data = JSON.parse(data);
                                            let nr = data.requests;
                                            let ar = new Array(), len1 = nr.length;
                                            for (let i = 0; i < len1; i++) {
                                                ar.push(nr[i].name);
                                            }
                                            gOrigin = ar.slice(0);
                                            log.Info('getJournals : Data na serveru byla úspěšně aktualizována.');
                                            if (next) callback();
                                        }
                                    });
                                }
                            });
                            client.close();
                        }
                    });
                }
            });
        }
    });
}
//download new articles
function worker() {
    function download() {
        if (!updating) {
            updating = true;

            MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                if (error) {
                    log.Error("worker : download : Problém s připojením k databázi.");
                } else {
                    let configureDatabase = client.db("configure-database");

                    configureDatabase.collection("requests").find({}).toArray(function(err1, res1) {
                        if (err1) {
                            log.Error('worker : download : requests : Problém k přístupu k databázi.');
                            client.close();
                        } else {
                            let i = res1.length;
                            if (i > 0) {
                                var finished = _.after(i, function() {
                                    log.Info('worker : download : Všechny články byly staženy.');
                                    updating = false;
                                    client.close();
                                });

                                var j = 0, name = res1[j].name, reqOb = res1[j];

                                (function loop() {
                                    configureDatabase.collection("values").findOne({ "name" : name }, function (err2, res2) {
                                        if (err2) {
                                            log.Error('worker : download : values : ' + name + ' : Problém k přístupu k databázi.');
                                            finished();
                                        } else {
                                            downloadArticles(reqOb, res2, finished);
                                        }

                                        j++;
                                        if (j < i) {
                                            name = res1[j].name;
                                            reqOb = res1[j];
                                            loop();
                                        }
                                    });
                                })();
                            }
                        }
                    });
                }
            });
        } else {
            setTimeout(download, 10000);
        }
    }

    var runAfter = new Array();

    fs.readdir('./updates/', (err1, fileNames) => {
        if (err1) {
            log.Error("worker : update : Problém v přístupu do složky updates.");
            download();
        } else {
            let len = fileNames.length;

            if (len > 1) {
                var ended = _.after(len, function() {
                    request({ url: clientPage + "/server/update" }, function (err11, res11, body11) {
                        let l = runAfter.length;
                        if (l > 0) {
                            var after = _.after(l, function() {
                                getJournals(true, download);
                            });

                            for (let k = 0; k < l; k++) {
                                removeAllArticles(runAfter[k], after);
                            }
                        } else {
                            getJournals(true, download);
                        }
                    });
                });

                for (let i = 0; i < len; i++) {
                    let fnb = fileNames[i];
                    if (fnb.indexOf(".json") !== -1) {
                        fs.readFile('./updates/' + fnb, 'utf8', function (err2, data) {
                            if (err2) {
                                log.Error("worker : update : Problém v přístupu k souboru " + fnb + ".");
                                ended();
                            } else {
                                data = JSON.parse(data);
                                data.pass = serverPassword;
                                request.post({ url: thisPage + "/admin/check", form: { params: JSON.stringify(data) }}, function(err3, res3, body) {
                                    if (!isDefined(body)) {
                                        log.Error("worker : update : check : Nečekená chyba na serveru.");
                                        ended();
                                    } else {
                                        var result = JSON.parse(body);
                                        if (isDefined(result.ok)) {
                                            if (result.ok) {
                                                if (data.name.trim().length === 0) {

                                                    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                                                        if (error) {
                                                            log.Error("worker : update : add : Problém s připojením k databázi.");
                                                        } else {
                                                            let configureDatabase = client.db("configure-database");
                                                            let articlesDatabase = client.db("articles-database");

                                                            //add
                                                            configureDatabase.collection("requests").insertOne(data.nr, function(err5, res5) {
                                                                if (err5) {
                                                                    log.Error("admin : worker : add : requests : Selhalo přidání deníku.");
                                                                    ended();
                                                                } else {
                                                                    log.Info("admin : worker : add : requests : Přidání deníku " + data.nr.name + " bylo úspěšné.");
        
                                                                    configureDatabase.collection("values").insertOne(data.nv, function(err6, res6) {
                                                                        if (err6) {
                                                                            log.Error("admin : worker : add : values : Selhalo přidání deníku.");
                                                                            ended();
                                                                        } else {
                                                                            log.Info("admin : worker : add : requests : Přidání deníku " + data.nv.name + " bylo úspěšné.");
                                                                            
                                                                            articlesDatabase.createCollection(getCollectionName(data.nr.name), function(err7, res7) {
                                                                                if (err7) {
                                                                                    log.Error("admin : worker : add : collection : Selhalo přidání kolekce " + data.nr.name + ".");
                                                                                    ended();
                                                                                } else {
                                                                                    log.Info("admin : worker : add : collection : Přidání kolekce " + data.nr.name + " bylo úspěšné.");
                                                                                    fs.unlink('./updates/' + fnb, (err8) => {
                                                                                        if (err8) {
                                                                                            log.Error("admin : worker : add : Problém s odstraněním souboru " + fnb + " po přidání.");
                                                                                        } else {
                                                                                            log.Info("admin : worker : add : Odstranění souboru " + fnb + " po přidání proběhlo úspěšně.");
                                                                                        }
                                                                                        ended();
                                                                                    });
                                                                                }
                                                                              });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    //update
                                                    let nr = data.nr, nv = data.nv;
                                                    let nrId = nr._id, nvId = nv._id;
                                                    delete nr._id;
                                                    delete nv._id;

                                                    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                                                        if (error) {
                                                            log.Error("worker : update : update : Problém s připojením k databázi.");
                                                        } else {
                                                            let configureDatabase = client.db("configure-database");

                                                            configureDatabase.collection("requests").updateOne({ _id: mc.ObjectID(nrId) }, { $set: nr }, function(err9, res9) {
                                                                if (err9) {
                                                                    log.Error("worker : update : update : requests : Selhala aktualizace deníku.");
                                                                    ended();
                                                                } else {
                                                                    log.Info("worker : update : update : requests : Deník " + data.name + " byl úspěšně aktualizován.");

                                                                    configureDatabase.collection("values").updateOne({ _id: mc.ObjectID(nvId) }, { $set: nv }, function(err10, res10) {
                                                                        if (err10) {
                                                                            log.Error("worker : update : update : values : Deník " + data.name + " : nebyl aktualizován.");
                                                                            runAfter.push(nr.name);
                                                                            ended();
                                                                        } else {
                                                                            log.Info("worker : update : update : values : Deník " + data.name + " : byl úspěšně přidán.");
                                                                            
                                                                            fs.unlink('./updates/' + fnb, (err11) => {
                                                                                if (err11) {
                                                                                    log.Error("worker : update : update : Problém s odstraněním " + fnb + " po aktualizaci.");
                                                                                } else {
                                                                                    log.Info("worker : update : update : Soubor " + fnb + " po aktualizaci byl úspěšně odstraněn.");
                                                                                }
                                                                                runAfter.push(nr.name);
                                                                                ended();
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                    ended();
                                                }
                                            } else {
                                                log.Error("worker : update : " + fnb + " : Špatný formát dat.");
                                                fs.unlink('./updates/' + fnb, (err4) => {
                                                    if (err4) {
                                                        log.Error("worker : update : Problém s ostraněním souboru " + fnb);
                                                    } else {
                                                        log.Info("worker : update : Soubor " + fnb + " byl úspěšně odstraněn.");
                                                    }
                                                    ended();
                                                });
                                            }
                                        } else {
                                            log.Error("worker : check : Špatný formát dat.");
                                            ended();
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        ended();
                    }
                }
            } else {
                download();
            }
        }
    });
}
//remove old articles
function workerRemove() {
    let i = gJournals.length;
    
    let date = new Date();
    date.setHours(0, 0, 0);
    date.setDate(date.getDate() - 6);

    var finished = _.after(i, function() {
        log.Info('workerRemove : Všechny starší články byly úspěšně smazány.');
        worker();
    });

    while (i--) {
        removeOldArticles(gJournals[i], date, finished);
    }
}


//requests
//login page
app.get('/', function(req, res) {
    if (req.user) {
        res.redirect("/admin");
    } else {
        res.render('index', { messages: req.flash('error')} );
    }
});
//login
app.post('/', auth.authenticate('login', {
    successRedirect: '/admin',
    failureRedirect: '/',
    failureFlash: true
}));
//logout
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});


//admin journals
//admin
app.get('/admin', function(req, res) {
    if (req.user) {
        res.render('help', { journals: gJournals.slice(0).sort() });
    } else {
        res.redirect("/");
    }
});
//admin add journal
app.get('/admin/pridat', function(req, res) {
    if (req.user) {
        res.render('add', {
            journals: gJournals.slice(0).sort(),
            categories: globalCats
        });
    } else {
        res.redirect("/");
    }
});
//admin edit journal
app.get('/admin/denik/:name', function(req, res) {
    if (req.user) {
        var journalName = req.params.name;
        if (gJournals.indexOf(journalName) !== -1) {
            var edited = (fs.existsSync('./updates/' + journalName + '.json'));
            res.render('journal', {
                journals: gJournals.slice(0).sort(),
                categories: globalCats,
                edited: edited
            });
        } else {
            res.redirect("/admin");
        }
    } else {
        res.redirect("/");
    }
});
//admin get journal values
app.post('/admin/get/:name', function(req, res) {
    if (req.user) {
        var journalName = req.params.name;
        if (gJournals.indexOf(journalName) !== -1) {
            var journalObject = {};
            
            //get all
            MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                if (error) {
                    log.Error("admin : deník : Problém s připojením k databázi.");
                } else {
                    let configureDatabase = client.db("configure-database");

                    configureDatabase.collection("requests").findOne({ "name" : journalName }, function (err1, row1) {
                        if (err1) {
                            log.Error('admin -> deník : requests : Problém v přístupu k databázi.');
                            client.close();
                            res.send({});
                        } else {
                            journalObject.request = row1;
                            configureDatabase.collection("values").findOne({ "name" : journalName }, function (err2, row2) {
                                if (err2) {
                                    log.Error('admin -> deník : values : Problém v přístupu k databázi.');
                                    client.close();
                                    res.send({});
                                } else {
                                    journalObject.value = row2;

                                    journalObject.categories = globalCats;

                                    journalObject.edited = (fs.existsSync('./updates/' + journalName + '.json'));
                                    client.close();
                                    res.send(journalObject);
                                }
                            });
                        }
                    });
                }
            });
        } else if (journalName === "nn") {
            res.send({ categories: globalCats });
        } else {
            res.send({});
        }
    } else {
        res.send({});
    }
});


//admin tools for journal
//admin recovery form data and remove update
app.post('/admin/recovery', function(req, res) {
    if (req.user) {
        var par = JSON.parse(req.body.params);
        var reqId = par.reqId, valId = par.valId;

        if (isDefined(reqId) && isDefined(valId)) {
            fs.readdir('./backup/', (err1, fileNames) => {
                if (err1) {
                    log.Error("admin : obnova dat : Problém v přístupu k záložním datům.");
                    res.send({ ok: false });
                }
                if (fileNames.length > 0) {
                    fileNames = fileNames.sort().reverse();
                    var fnb = fileNames[0];
                    fs.readFile('./backup/' + fnb, 'utf8', function (err2, backupData) {
                        if (err2) {
                            log.Error("admin : obnova dat : Problém v přístupu k souboru " + fnb + ".");
                            res.send({ ok: false });
                        } else {
                            var data = JSON.parse(backupData);
                            //get backup data
                            var backUpReq = data.requests.find(x => x._id === reqId);
                            var backUpVal = data.values.find(x => x._id === valId);
                            
                            //get all updates journals
                            fs.readdir('./updates/', (err3, fileNames2) => {
                                if (err3) {
                                    log.Error("admin : obnova dat : Problém v přístupu ke složce update.");
                                    res.send({ ok: false });
                                } else {
                                    var len = fileNames2.length;

                                    //callback (update database)
                                    function afterRemove() {
                                        var tmp = JSON.parse(JSON.stringify(backUpReq)); //copy
                                        delete tmp._id;

                                        MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                                            if (error) {
                                                log.Error("admin : obnova dat : Problém v přístupu k databázi.");
                                            } else {
                                                let configureDatabase = client.db("configure-database");

                                                configureDatabase.collection("requests").updateOne({ _id: mc.ObjectID(reqId) }, { $set: tmp }, function(err5, res5) {
                                                    if (err5) {
                                                        log.Error("admin : obnova dat : requests : Problém v přístupu k databázi.");
                                                        client.close();
                                                        res.send({ ok: false });
                                                    } else {
                                                        log.Info("admin : obnova dat : requests : Záznam byl úspěšně obnoven.");

                                                        tmp = JSON.parse(JSON.stringify(backUpVal));
                                                        delete tmp._id;

                                                        configureDatabase.collection("values").updateOne({ _id: mc.ObjectID(valId) }, { $set: tmp }, function(err6, res6) {
                                                            if (err6) {
                                                                log.Error("admin : obnova dat : values : Problém v přístupu k databázi.");
                                                                client.close();
                                                                res.send({ ok: false });
                                                            } else {
                                                                log.Info("admin : obnova dat : values : Záznam byl úspěšně obnoven.");

                                                                request({ url: clientPage + "/server/update" }, function (err7, res7, bod7) {
                                                                    getJournals(false, null);
                                                                    res.send({ ok: true });
                                                                    client.close();
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    //remove updated files
                                    if (len > 1) {
                                        var filesContent = new Array(len);

                                        var finished = _.after(len, function() {
                                            for (let i = 0; i < len; i++) {
                                                if (filesContent[i] === 1) {
                                                    fs.unlink('./updates/' + fileNames2[i], (err8) => {
                                                        if (err8) {
                                                            log.Error("admin : obnova dat : Problém se smazáním souboru " + fileNames2[i] + ".");
                                                        } else {
                                                            log.Info("admin : obnova dat : Soubor " + fileNames2[i] + " byl úspěšně smazán.");
                                                        }
                                                    });
                                                }
                                            }
                                            afterRemove();
                                        });

                                        for (let i = 0; i < len; i++) {
                                            if (fileNames2[i] !== "tempFile") {
                                                fs.readFile('./updates/' + fileNames2[i], 'utf8', function (err4, body) {
                                                    if (err4) {
                                                        log.Error("admin : obnova dat : deníky k editaci : Problém při načtení souboru " + fileNames2[i]);
                                                        filesContent[i] = 0;
                                                    } else {
                                                        var obj = JSON.parse(body);
                                                        if (isDefined(obj.nr._id) && isDefined(obj.nv._id)) {
                                                            if (obj.nr._id === reqId && obj.nv._id === valId) {
                                                                filesContent[i] = 1;
                                                            } else {
                                                                filesContent[i] = 0;
                                                            }
                                                        } else {
                                                            filesContent[i] = 0;
                                                        }
                                                    }
                                                    finished();
                                                });
                                            } else {
                                                filesContent[i] = 0;
                                                finished();
                                            }
                                        }
                                    } else {
                                        afterRemove();
                                    }
                                }
                            });    
                        }
                    });
                } else {
                    log.Error("admin : recovery : no backup files");
                    res.send({ ok: false });
                }
            });
        } else {
            res.send({ ok: false });
        }
    } else {
        res.send({ ok: false });
    }
});
//admin check values
app.post('/admin/check', function(req, res) {
    var par = JSON.parse(req.body.params);
    if (req.user) {
        checkValues(par, res);
    } else if (par.pass === serverPassword) {
        checkValues(par, res);
    } else {
        res.send({});
    }
});
//admin sample
app.post('/admin/sample', function(req, res) {
    if (req.user) {
        var par = JSON.parse(req.body.params);
        par.pass = serverPassword;

        request.post({ url: thisPage + "/admin/check", form: { params: JSON.stringify(par) }}, function(err11, res11, body){
            if (!isDefined(body)) {
                res.send({ ok: false, error: { type: "", parm: "", mess: "Na serveru došlo k neočekávané chybě.\nZkontrolujte zadané parametry a zkuste to znovu." } });
            } else {
                var result = JSON.parse(body);
                if (result.ok) {
                    var ro = par.nr, vo = par.nv;

                    function afterDownload(html) {
                        var spLinks = [], spImages = [];
                        var links = [], images = [];
                        var originAddress = getMainPage(ro.link);

                        var $ = cheerio.load(html);
                                
                        //::special selector (not required, but must be defined)
                        if (isString(ro.specialLinkSelector) && isString(ro.specialParentSelector) && isString(ro.specialImageSelector)) {
                            let sps = ro.specialParentSelector.trim();
                            let sls = ro.specialLinkSelector.trim();
                            let sis = ro.specialImageSelector.trim();
                            let sisa = ro.specialImageSelector;

                            if (sls.length > 0) {
                                var wp = sps.length != 0;
                                var wl = sls.length != 0;
                                var wi = sis.length != 0;

                                if (wp) {
                                    $(sps).each(function(i, element) {
                                        var link = wl ? $(this).find(sls).first().attr("href") : $(this).attr("href");
                                        spLinks.push(fixLink(link, originAddress));

                                        var image = wi ? $(this).find(sis).first().attr("src") : "";
                                        if (isString(sisa)) {
                                            if (sisa.trim().length > 0) {
                                                image = wi ? $(this).find(sis).first().attr(sisa.trim()) : "";
                                            }
                                        }

                                        if (isDefined(ro.specialFindInImage)) {
                                            if (ro.specialFindInImage) {
                                                spImages.push(findLink(image));
                                            } else {
                                                spImages.push(fixLink(image, originAddress));
                                            }
                                        } else {
                                            spImages.push(fixLink(image, originAddress));
                                        }
                                    });
                                } else if (wl) {
                                    $(sls).each(function(i, element) {
                                        links.push(fixLink($(this).attr("href"), originAddress));
                                        images.push("");
                                    });
                                }
                            }
                        }
    
                        //::classic selector
                        if (isString(ro.parentSelector) && isString(ro.linkSelector) && isString(ro.imageSelector)) {
                            let ps = ro.parentSelector.trim();
                            let ls = ro.linkSelector.trim();
                            let is = ro.imageSelector.trim();
                            let isa = ro.imageSelector;

                            var wp = ps.length != 0;
                            var wl = ls.length != 0;
                            var wi = is.length != 0;

                            if (wp) {
                                $(ps).each(function(i, element) {
                                    if (isDefined(ro.limitSelector)) {
                                        if (ro.limitSelector > 0 && i >= ro.limitSelector) {
                                            return false;
                                        }
                                    }
                                    var link = wl ? $(this).find(ls).first().attr("href") : $(this).attr("href");
                                    links.push(fixLink(link, originAddress));

                                    var image = wi ? $(this).find(is).first().attr("src") : "";
                                    if (isString(isa)) {
                                        if (isa.trim().length > 0) {
                                            image = wi ? $(this).find(is).first().attr(isa.trim()) : "";
                                        }
                                    }

                                    if (isDefined(ro.findInImage)) {
                                        if (ro.findInImage) {
                                            images.push(findLink(image));
                                        } else {
                                            images.push(fixLink(image, originAddress));
                                        }
                                    } else {
                                        images.push(fixLink(image, originAddress));
                                    }
                                });
                            } else if (wl) {
                                $(ls).each(function(i, element) {
                                    if (isDefined(ro.limitSelector)) {
                                        if (ro.limitSelector > 0 && i >= ro.limitSelector) {
                                            return false;
                                        }
                                    }
                                    links.push(fixLink($(this).attr("href"), originAddress));
                                    images.push("");
                                });
                            }
                        }

                        //teď mám odkazy z celé stránky
                        var actualTime = new Date();
                        var articles = [];

                        function classic() {
                            if (links.length === images.length && links.length > 0) {
                                var k = 0;
                                var articleLink = links[k];

                                var c = 0;
                                function afterDown(str) {
                                    if (str.length === 0) {
                                        c++;
                                        if (c < 8) {
                                            getHTML(articleLink, ro.coding, afterDown);
                                            return;
                                        }
                                    } else {
                                        var art = parseArticle(str, vo, originAddress, articleLink, actualTime, true);
                                        if (art !== null) {
                                            art.sim = images[k];
                                            art.lnk = articleLink;
                                            articles.push(art);
                                            res.send({ article: articles });
                                            return;
                                        }
                                    }

                                    k++;
                                    if (k < links.length) {
                                        articleLink = links[k];
                                        getHTML(articleLink, ro.coding, afterDown);
                                    } else {
                                        articles.push({});
                                        res.send({ article: articles });
                                        return;
                                    }
                                }

                                getHTML(articleLink, ro.coding, afterDown);
                            } else {
                                res.send({ article: articles });
                            }
                        }

                        if (spLinks.length === spImages.length && spLinks.length > 0) {
                            var k = 0;
                            var articleLink = spLinks[k];

                            var c = 0;
                            function afterDown(str) {
                                if (str.length === 0) {
                                    c++;
                                    if (c < 8) {
                                        getHTML(articleLink, ro.coding, afterDown);
                                        return;
                                    }
                                } else {
                                    var art = parseArticle(str, vo, originAddress, articleLink, actualTime, true);
                                    if (art !== null) {
                                        art.sim = spImages[k];
                                        art.lnk = articleLink;
                                        articles.push(art);
                                        classic();
                                        return;
                                    }
                                }

                                k++;
                                if (k < spLinks.length) {
                                    articleLink = spLinks[k];
                                    getHTML(articleLink, ro.coding, afterDown);
                                } else {
                                    articles.push({});
                                    classic();
                                }
                            }

                            getHTML(articleLink, ro.coding, afterDown);
                        } else {
                            classic();
                        }
                    }

                    getHTML(ro.link, ro.coding, afterDownload);
                } else {
                    res.send(result);
                }
            }
        });
    } else {
        res.send({});
    }
});
//admin save values
app.post('/admin/save', function(req, res) {
    if (req.user) {
        var par = JSON.parse(req.body.params);
        par.pass = serverPassword;

        if (isString(par.name)) {
            if (par.name.trim().length > 0) {
                if (fs.existsSync('./updates/' + par.name.toLocaleLowerCase().trim() + '.json')) {
                    res.send({ ok: false, error: { type: "", parm: "", mess: "Tento deník je zrovna editován." } });
                }
            }
            
            request.post({ url: thisPage + "/admin/check", form: { params: JSON.stringify(par) }}, function(error, response, body){
                if (!isDefined(body)) {
                    res.send({ ok: false, error: { type: "", parm: "", mess: "Na serveru došlo k neočekávané chybě.\nProblém ověření dat.\nZkontrolujte zadané parametry a zkuste to znovu." } });
                } else {
                    var result = JSON.parse(body);
                    if (result.ok) {
                        var json = JSON.parse(JSON.stringify(par));

                        if (json.nr.categories.length > 1) {
                            json.nr.categories.push(specId);
                        }

                        var fileName = "";
                        if (isString(par.name)) {
                            if (par.name.trim().length > 4) {
                                fileName = par.name.trim().toLocaleLowerCase();
                            }
                        }
                        if (isString(par.nr.name)) {
                            if (fileName.length === 0 && par.nr.name.trim().length > 0) {
                                fileName = par.nr.name.trim().toLocaleLowerCase();
                            }
                        }

                        //save to file
                        fs.writeFile('./updates/' + fileName + '.json', JSON.stringify(json), (err1) => {
                            if (err1) {
                                log.Error("admin : uložení deníku : Problém při ukldádání do souboru.");
                                res.send({ ok: false, error: { type: "", parm: "", mess: "Na serveru došlo k chybě při ukládání změn do souboru.\nZkontrolujte zadané parametry a zkuste to znovu." } });
                            } else {
                                if (isString(par.name)) {
                                    if (par.name.trim().length === 0) {
                                        res.send({ m: "Všechno proběhlo v pořádku.\nDeník bude vložen při dalším přenosu." });
                                    } else {
                                        res.send({ m: "Všechno proběhlo v pořádku.\nDeník bude upraven při dalším přenosu." });
                                    }
                                } else {
                                    res.send({ m: "Všechno proběhlo v pořádku.\nDeník bude upraven při dalším přenosu." });
                                }
                            }
                        });
                    } else {
                        res.send(result);
                    }
                }
            });
        }
    } else {
        res.send({});
    }
});
//admin remove journal from database
app.get('/admin/delete/:name', function(req, res) {
    if (req.user) {
        var journalName = req.params.name;
        function rem() {
            if (updating) {
                setTimeout(rem, 5000);
                return;
            } else {
                if (gJournals.indexOf(journalName) !== -1 && gOrigin.indexOf(journalName) === -1) {
                    updating = true;

                    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                        if (error) {
                            log.Error("getJournals: Problém s připojením k databázi.");
                        } else {
                            let articlesDatabase = client.db("articles-database");
                            let configureDatabase = client.db("configure-database");

                            configureDatabase.collection("requests").deleteOne({ name: journalName }, function(err1, obj1) {
                                if (err1) {
                                    log.Error("admin : smazání deníku : requests : Deník " + journalName + " byl úspěšně smazán.");
                                    client.close();
                                    updating = false;
                                    res.send({ ok: false });
                                } else {
                                    configureDatabase.collection("values").deleteOne({ name: journalName }, function(err2, obj2) {
                                        if (err2) {
                                            log.Error("admin : smazání deníku : values : Deník " + journalName + " byl úspěšně smazán.");
                                            client.close();
                                            updating = false;
                                            res.send({ ok: false });
                                        } else {
                                            articlesDatabase.collection(getCollectionName(journalName)).drop(function(err3, obj3) {
                                                if (err3) {
                                                    log.Error("admin : smazání deníku : články : Deník " + journalName + " byl úspěšně smazán.");
                                                    client.close();
                                                    updating = false;
                                                    res.send({ ok: false });
                                                } else {
                                                    log.Info("admin : smazání deníku : Deník " + journalName + " byl úspěšně smazán z databáze.");
                                                    
                                                    //now remove update files
                                                    if (fs.existsSync('./updates/' + journalName + ".json")) {
                                                        fs.unlink('./updates/' + journalName + ".json", (err4) => {
                                                            if (err4) {
                                                                log.Error("admin : smazání deníku : aktualizace : Nepodařilo se smazat soubor " + journalName + ".json.");
                                                            } else {
                                                                log.Info("admin : smazání deníku : aktualizace : Soubor " + journalName + ".json byl úspěšně smazán.");
                                                            }
                                                            updating = false;

                                                            request({ url: clientPage + "/server/update" }, function (inError, inResponse, inBody) {
                                                                getJournals(false, null);
                                                                res.send({ ok: true });
                                                            });
                                                        });
                                                    } else {
                                                        updating = false;
                                                        request({ url: clientPage + "/server/update" }, function (inError, inResponse, inBody) {
                                                            getJournals(false, null);
                                                            res.send({ ok: true });
                                                        });
                                                    }
                                                    client.close();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    res.send({ ok : false });
                }
            }
        }
        rem();
    } else {
        res.send({ ok: false });
    }
});


//admin logging
//admin log
app.get('/admin/log', function(req, res) {
    if (req.user) {
        res.render('log', {
            journals: gJournals.slice(0).sort(),
            categories: globalCats
        });
    } else {
        res.redirect("/");
    }
});
//admin get logs name
app.get('/admin/get/logs', function(req, res) {
    if (req.user) {
        fs.readdir('./logs/', (err, files) => {
            if (err) {
                log.Error("admin : : log : Problém při načtení seznamu logů.");
                res.send({});
            }
            res.send({ names: files.sort().reverse().slice(1) });
        });
    } else {
        res.send({});
    }
});
//admin get log file
app.get('/admin/get/log/:name', function(req, res) {
    if (req.user) {
        var name = req.params.name;
        fs.readFile('./logs/' + name + '.log', function (err, data) {
            if (err) {
                log.Error("admin : log : Problém při načtení logu.");
                res.send("");
            } else {
                res.send(data);
            }
        });
    } else {
        res.send("");
    }
});


//admin deletes functions
//admin delete
app.get('/admin/delete', function(req, res) {
    if (req.user) {
        res.render('delete', {
            journals: gJournals.slice(0).sort(),
            categories: globalCats
        });
    } else {
        res.redirect("/");
    }
});
//admin get short articles
app.get('/admin/get/arts/:name', function(req, res) {
    if (req.user) {
        var journalName = req.params.name;
        if (gJournals.indexOf(journalName) !== -1) {

            MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                if (error) {
                    log.Error("admin : články pro smazání : Problém s připojením k databázi.");
                } else {
                    let articlesDatabase = client.db("articles-database");
                    let configureDatabase = client.db("configure-database");

                    articlesDatabase.collection(getCollectionName(journalName)).find({}).sort( { _id : -1 } ).toArray(function(err1, result) {
                        if (err1) {
                            log.Error("admin : články pro smazání : Problém při přístupu do databáze článků.");
                            client.close();
                            res.send({});
                        } else {
                            var array = [];
                            var len = result.length;
                            for (let i = 0; i < len; i++) {
                                var a = result[i];
                                let tempIndex = gCatsIds.indexOf(a.cat);
                                if (tempIndex !== -1) {
                                    array.push({ _id: a._id, tit: a.tit, dat: a.dat, cat: gCatsIds[tempIndex] });
                                } else if (a.cat === "") {
                                    array.push({ _id: a._id, tit: a.tit, dat: a.dat, cat: "" });
                                }
                            }

                            configureDatabase.collection("requests").findOne({ name: journalName }, function (err2, row1) {
                                if (err2) {
                                    log.Error("admin : články pro smazání : requests : Problém při přístupu do databáze.");
                                    client.close();
                                    res.send({});
                                } else {
                                    client.close();
                                    res.send({ articles: array, client: clientPage, jcats: row1.categories, cats: globalCats });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            res.send("");
        }
    } else {
        res.send("");
    }
});
//admin remove by ids
app.post('/admin/remove', function(req, res) {
    var par = JSON.parse(req.body.params);
    if (req.user) {
        if (isDefined(par.name) && isDefined(par.ids)) {
            var journalName = par.name, ids = par.ids;
            var len = ids.length;
            for (let i = 0; i < len; i++) {
                ids[i] = mc.ObjectID(ids[i]);
            }
            if (gJournals.indexOf(journalName) !== -1) {

                MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                    if (error) {
                        log.Error("admin : smazání článků : Problém s připojením k databázi.");
                    } else {
                        let articlesDatabase = client.db("articles-database");

                        articlesDatabase.collection(getCollectionName(journalName)).deleteMany({ _id: { $in: ids } }, function(err, result) {
                            if (err) {
                                log.Error("admin : smazání článků : Smazání článků z deníku " + journalName + " proběhlo úspěšně.");
                                res.send({ ok: false, mess: "Akce se neprovedla.\nZkuste to znovu." });
                            } else {
                                log.Info("admin : smazání článků : Smazání článků deníku " + journalName + " proběhlo úspěšně.");
                                res.send({ ok: true, result: result });
                            }
                        });
                    }
                });                
            } else {
                res.send({ ok: false, mess: "Zadaný deník neexistuje." });
            }
        } else {
            res.send({ ok: false, mess: "Špatně zadané parametry." });
        }
    } else {
        res.send({ ok: false, mess: "Nepřihlášený uživatel." });
    }
});
//admin remove all
app.post('/admin/remove/all', function(req, res) {
    var par = JSON.parse(req.body.params);
    if (req.user) {
        if (isDefined(par.name)) {
            var journalName = par.name;
            if (gJournals.indexOf(journalName) !== -1) {

                MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                    if (error) {
                        log.Error("admin : smazání všech článků : Problém s připojením k databázi.");
                    } else {
                        let articlesDatabase = client.db("articles-database");
                        
                        articlesDatabase.collection(getCollectionName(journalName)).deleteMany({}, function(err, result) {
                            if (err) {
                                log.Error("admin : smazání všech článků : Smazání všech článků z deníku " + journalName + " proběhlo úspěšně.");
                                res.send({ ok: false, mess: "Akce se neprovedla.\nZkuste to znovu." });
                            } else {
                                log.Info("admin : smazání všech článků : Smazání článků deníku " + journalName + " proběhlo úspěšně.");
                                res.send({ ok: true, result: result });
                            }
                        });
                    }
                });
            } else {
                res.send({ ok: false, mess: "Zadaný deník neexistuje." });
            }
        } else {
            res.send({ ok: false, mess: "Špatně zadané parametry." });
        }
    } else {
        res.send({ ok: false, mess: "Nepřihlášený uživatel." });
    }
});


//categories
//admin category
app.get('/admin/kategorie', function(req, res) {
    if (req.user) {
        res.render('category', {
            journals: gJournals.slice(0).sort(),
            categories: globalCats
        });
    } else {
        res.redirect("/");
    }
});
//add category
app.post('/admin/kategorie/pridat', function(req, res) {
    var par = JSON.parse(req.body.params);
    let name = par.name, addr = par.addr;

    let mes = "";
    let len = globalCats.length;
    for (let i = 0; i < len; i++) {
        let gc = globalCats[i];
        if (gc.cz === name) {
            mes = "Kategorie s tímto názvem již existuje.";
            break;
        } else if (gc.ur === addr) {
            mes = "Kategorie s tímto URL zápisem již existuje.";
            break;
        }
    }

    if (mes === "") {
        //save to database
        MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
            if (error) {
                log.Error("admin : kategorie : přidání : Problém s připojením k databázi.");
            } else {
                let configureDatabase = client.db("configure-database");

                configureDatabase.collection("categories").insertOne({ cz: name, ur: addr }, function(err, result) {
                    if (err) {
                        log.Error("admin : kategorie : přidání : Nepodařilo se vložit kategorii do databáze.");
                        client.close();
                        res.send({ ok: false, mes: "Došlo k chybě při komunikaci s databází.\nZkontrolujte zadané údaje a zkuste to znovu." });
                    } else {
                        log.Info("admin : kategorie : přidání : Kategorie byla úspěšně vložena.");
                        request({ url: clientPage + "/server/update" }, function (err11, res11, body11) {
                            client.close();
                            getJournals(false, null);
                            res.send({ ok: true, id: "" + result.insertedId });
                        });
                    }
               });
            }
        });
    } else {
        res.send({ ok: false, mes: mes });
    }
});
//edit category
app.post('/admin/kategorie/upravit', function(req, res) {
    var par = JSON.parse(req.body.params);
    let id = par.val, nName = par.nName, nAddr = par.nAddr;
    
    let obj = { cz: nName, ur: nAddr };
    let mes = "";

    //check params
    let oks = { _id: false, cz: true, ur: true };

    let len = globalCats.length;
    for (let i = 0; i < len; i++) {
        let gc = globalCats[i];
        if ("" + gc._id === id) {
            oks._id = true;
        } else {
            if (gc.cz === nName) {
                oks.cz = false;
                mes = "Tento název je již použit u jiného deníku.";
                break;
            }
            if (gc.ur === nAddr) {
                oks.ur = false;
                mes = "Tento URL zápis je již použit u jiného deníku.";
                break;
            }
        }
    }

    if (oks._id && oks.cz && oks.ur) {
        MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
            if (error) {
                log.Error("admin : kategorie : úprava : Problém s připojením k databázi.");
            } else {
                let configureDatabase = client.db("configure-database");
    
                configureDatabase.collection("categories").updateOne({ _id: mc.ObjectID(id) }, { $set: obj }, function(err1, res1) {
                    if (err1) {
                        log.Error("admin : kategorie : úprava : Problém s připojením k databázi.");
                        client.close();
                        res.send({ ok: false, mes: "Došlo k chybě při komunikaci s databází.\nZkontrolujte zadané údaje a zkuste to znovu." });
                    } else {
                        log.Info("admin : kategorie : úprava : Kategorie byl úspěšně aktualizována.");
                        request({ url: clientPage + "/server/update" }, function (err11, res11, body11) {
                            client.close();
                            getJournals(false, null);
                            res.send({ ok: true });
                        });
                    }
                });
            }
        });
    } else {
        res.send({ ok: false, mes: mes });
    }
});
//delete category
app.post('/admin/kategorie/smazat', function(req, res) {
    var par = JSON.parse(req.body.params);
    let val = par.val;

    if (val !== specId) {
        let ok = false;
        let len = globalCats.length;
        for (let i = 0; i < len; i++) {
            if ("" + globalCats[i]._id === val) {
                ok = true;
            }
        }

        if (ok) {
            MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
                if (error) {
                    log.Error("getJournals: Problém s připojením k databázi.");
                } else {
                    let configureDatabase = client.db("configure-database");

                    configureDatabase.collection("requests").find({}).sort( { _id: 1 } ).toArray(function(err1, res1) {
                        if (err1) {
                            log.Error("admin : kategorie : smazání : Problém s připojením k databázi.");
                            client.close();
                            res.send({ ok: false, list: [], mes: "Problém při připojení k databázi." });
                        } else {
                            let l = res1.length;
                            let list = new Array();
                            for (let i = 0; i < l; i++) {
                                let arr = res1[i].categories;
                                if (arr.indexOf(val) !== -1) {
                                    list.push(res1[i].name);
                                }
                            }
                            if (list.length > 0) {
                                client.close();
                                res.send({ ok: false, list: list, mes: "Kategorie je použitá v některých denících." });
                            } else {
                                configureDatabase.collection("categories").deleteOne({ _id: mc.ObjectID(val) }, function(err2, res2) {
                                    if (err2) {
                                        log.Error("admin : kategorie : smazání : Problém při mazání kategorie z databáze.");
                                        client.close();
                                        res.send({ ok: false, list: [], mes: "Chyba při mazání kategorie." });
                                    } else {
                                        log.Info("admin : kategorie : smazání : Kategorie byla úspěšně smazána z databáze.");
                                        request({ url: clientPage + "/server/update" }, function (err11, res11, body11) {
                                            client.close();
                                            getJournals(false, null);
                                            res.send({ ok: true, list: [], mess: "" });
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        } else {
            res.send({ ok: false, list: [], mes: "Špatně zadané parametry." });
        }
        //ok, list, mes
    } else {
        res.send({ ok: false, list: [], mes: "Špatně zadané parametry." });
    }
});


//bad urls
app.get('/*', function(req, res) {
    if (req.user) {
        res.redirect("/admin");
    } else {
        res.redirect("/");
    }
});


//start functions
//getJournals(false, null);
getJournals(true, workerRemove);
setInterval(worker, 900000);

//run server
app.listen(process.env.PORT || 5000, function() {
    log.Info("Server je spuštěný...");
});

//backup function
function backup() {
    MongoClient.connect(mongoUri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 500 }, function(error, client) {
        if (error) {
            log.Error("backup: Problém s připojením k databázi.");
        } else {
            let configureDatabase = client.db("configure-database");

            configureDatabase.collection("requests").find({}).toArray(function(err1, res1) {
                if (err1) {
                    log.Error('admin : backup : requests : Problém s připojením k databázi.');
                    client.close();
                } else {
                    configureDatabase.collection("values").find({}).toArray(function(err2, res2) {
                        if (err2) {
                            log.Error('admin : backup : values : Problém s připojením k databázi.');
                            client.close();
                        } else {
                            //data
                            var json = JSON.stringify({ requests: res1, values: res2 });
                            //filename
                            var t = new Date();
                            var fileName = t.getFullYear() + "_" + (t.getMonth() + 1).toString() + "_" + t.getDate();
                            //save to file
                            fs.writeFile('./backup/' + fileName + '.json', json, (err3) => {
                                if (err3) {
                                    log.Error('admin : backup : Selhalo uložení záložních dat.');
                                } else {   
                                    log.Info('admin : backup : Záložní data byla úspěšně uložena.');
                                }
                                client.close();
                            });
                        }
                    });
                }
            });
        }
    });
}

//upravoval jsem last.tit === tit in download