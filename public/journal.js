document.addEventListener("DOMContentLoaded", function(event) {
    var originPage = window.location.origin;
    var actualJournal = window.location.pathname.split("/")[3].toLocaleLowerCase();
    var req = {}, val = {}, cats = [], kats = [], catIds = new Array();
    var nr = {}, nv = {}, edited = false;
    var optionsT = { month: 'long', day: 'numeric' };

    //toogle load
    function toogle() {
        document.getElementsByClassName("colms")[0].style.display = "block";
        document.getElementsByClassName("center-block")[0].style.display = "none";
    }

    function loading(bool) {
        if (bool) {
            document.getElementById("toogle2").style.display = "block";
            document.getElementById("empty").style.display = "none";
        } else {
            document.getElementById("toogle2").style.display = "none";
            document.getElementById("empty").style.display = "block";
        }
    }
 
    //is defined
    function isDefined(value) {
        return value !== undefined && value !== null;
    }
    //set active
    var lis = document.getElementsByTagName("aside")[0].getElementsByTagName("li");
    var l = lis.length;
    for (let i = 0; i < l; i++) {
        if (lis[i].textContent == actualJournal) {
            lis[i].classList.add("active");
            break;
        } 
    }

    //edited
    function edit() {
        if (edited) {
            document.getElementById("info-bar").innerHTML = "<span class=\"oks\">Tento deník momentálně nelze upravovat.<br>Počkejte do dalšího přenosu (max 15 min)</span>";
        } else {
            document.getElementById("info-bar").innerHTML = "<span class=\"ers\">Tento deník lze upravit.</span>";
        }
    }

    //switch paging
    function switchPaging(bool, n) {
        if (bool) {
            document.getElementById("idr1").checked = true;
            document.getElementsByClassName("blank")[0].style.display = "block";
            if (n) {
                if (isDefined(req.firstPage)) document.getElementById("id4").value = req.firstPage;
                if (isDefined(req.nextPagePlus)) document.getElementById("id5").value = req.nextPagePlus;
                if (isDefined(req.pageSymbol)) document.getElementById("id6").value = req.pageSymbol;
                if (isDefined(req.nextPage)) document.getElementById("id7").value = req.nextPage;
            } else {
                document.getElementById("id4").value = "";
                document.getElementById("id5").value = "";
                document.getElementById("id6").value = "";
                document.getElementById("id7").value = "";
            }
        } else {
            document.getElementById("idr2").checked = true;
            document.getElementsByClassName("blank")[0].style.display = "none";
        }
    }
    //switch special
    function switchSpec(bool) {
        if (bool) {
            document.getElementById("idr3").checked = true;
            document.getElementsByClassName("blank")[1].style.display = "block";
            if (isDefined(req.specialParentSelector)) document.getElementById("id14").value = req.specialParentSelector;
            if (isDefined(req.specialLinkSelector)) document.getElementById("id15").value = req.specialLinkSelector;
            if (isDefined(req.specialImageSelector)) document.getElementById("id16").value = req.specialImageSelector;
            if (isDefined(req.specialIimageSelectorAttr)) document.getElementById("id17").value = req.specialIimageSelectorAttr;
            if (isDefined(req.specialFindInImage)) {
                if (req.specialFindInImage === "true") {
                    document.getElementById("id18").checked = true;
                } else {
                    document.getElementById("id18").checked = false;
                }
            }
        } else {
            document.getElementById("idr4").checked = true;
            document.getElementsByClassName("blank")[1].style.display = "none";
        }
    }
    //string to array
    function str2Array(str) {
        var a = [];
        var tmp = str.split(",");
        for (let i = 0; i < tmp.length; i++) {
            var t = tmp[i].trim();
            if (t.length > 0) {
                a.push(t);
            }
        }
        return a;
    }
    //null all forms
    function nullForms() {
        //inputs
        var inputs = document.getElementsByClassName("colms")[0].getElementsByTagName("input");
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].type === "text") {
                inputs[i].value = "";
            }
        }
        //coding
        var opts = document.getElementById("id3").getElementsByTagName("option");
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === "utf8") {
                opts[i].selected = true;
                break;
            }
        }
        //categories
        opts = document.getElementById("multi").getElementsByTagName("option");
        for (let i = 0; i < opts.length; i++) {
            opts[i].selected = false;
        }
        //textareas
        var txts = document.getElementsByClassName("colms")[0].getElementsByTagName("textarea");
        for (let i = 0; i < txts.length; i++) {
            txts[i].selected = "";
        }
        //radio buttons
        //switchPaging(true, false);
        switchPaging(true, false);
        switchSpec(false);
        document.getElementById("ir2").selected = true;

        //checkboxes
        document.getElementById("id18").checked = false;
        document.getElementById("id19").checked = false;
    }
    //fill forms
    function fillForms() {
        //request
        if (isDefined(req.name)) document.getElementById("id1").value = req.name;
        if (isDefined(req.link)) document.getElementById("id2").value = req.link;
        if (isDefined(req.coding)) {
            var opts = document.getElementById("id3").getElementsByTagName("option");
            for (let i = 0; i < opts.length; i++) {
                if (opts[i].value == req.coding) {
                    opts[i].selected = true;
                    break;
                }
            }
        }
        if (isDefined(req.paging)) switchPaging(req.paging === "true", true);
        if (isDefined(req.limitSelector)) {
            if (req.limitSelector === "0") {
                document.getElementById("id8").value = "";
            } else {
                document.getElementById("id8").value = req.limitSelector;
            }
        }
        if (isDefined(req.parentSelector)) document.getElementById("id10").value = req.parentSelector;
        if (isDefined(req.linkSelector)) document.getElementById("id11").value = req.linkSelector;
        if (isDefined(req.imageSelector)) document.getElementById("id12").value = req.imageSelector;
        if (isDefined(req.imageSelectorAttr)) document.getElementById("id13").value = req.imageSelectorAttr;
        if (isDefined(req.findInImage)) {
            if (req.findInImage === "true") {
                document.getElementById("id18").checked = true;
            } else {
                document.getElementById("id18").checked = false;
            }
        }

        var sBool = false;
        if (isDefined(req.specialParentSelector)) {
            if (req.specialParentSelector.length > 0) {
                sBool = true;
            }
        }
        if (isDefined(req.specialLinkSelector)) {
            if (req.specialLinkSelector.length > 0) {
                sBool = true;
            }
        }
        if (isDefined(req.specialImageSelector)) {
            if (req.specialImageSelector.length > 0) {
                sBool = true;
            }
        }
        if (isDefined(req.specialIimageSelectorAttr)) {
            if (req.specialIimageSelectorAttr.length > 0) {
                sBool = true;
            }
        }
        switchSpec(sBool);
        if (isDefined(req.categories)) {
            var opts = document.getElementById("multi").getElementsByTagName("option");
            for (let i = 0; i < opts.length; i++) {
                if (req.categories.indexOf(opts[i].value) !== -1) {
                    opts[i].selected = true;
                }
            }
        }

        //value
        if (isDefined(val.titleSelector)) document.getElementById("i1").value = val.titleSelector;
        if (isDefined(val.textSelector)) document.getElementById("i2").value = val.textSelector;
        if (isDefined(val.perexCut)) {
            if (val.perexCut) {
                document.getElementById("ir1").checked = true;
            } else {
                document.getElementById("ir2").checked = true;
            }
        } else {
            document.getElementById("ir2").checked = true;
        }
        if (isDefined(val.dateSelector)) document.getElementById("i4").value = val.dateSelector;
        if (isDefined(val.imageSelector)) document.getElementById("i5").value = val.imageSelector;
        if (isDefined(val.imageSelectorAttr)) document.getElementById("i55").value = val.imageSelectorAttr;
        if (isDefined(val.content)) document.getElementById("i3").value = val.content;
        if (isDefined(val.contentRemove)) document.getElementById("i7").value = val.contentRemove.join(", ");
        if (isDefined(val.tags)) document.getElementById("i6").value = val.tags;
        if (isDefined(val.categories)) {
            var cs = val.categories, s = "";
            for (let i = 0; i < cs.length; i++) {
                let ind = catIds.indexOf(cs[i].category);
                if (ind !== -1) {
                    s += cs[i].text + " : " + kats[ind] + ", ";
                }
            }
            if (s.length > 0) s = s.slice(0, -2);
            document.getElementById("i8").value = s;
        }
        if (isDefined(val.okLinks)) document.getElementById("i9").value = val.okLinks.join(", ");
        if (isDefined(val.badLinks)) document.getElementById("i10").value = val.badLinks.join(", ");
        if (isDefined(val.removeSelectors)) document.getElementById("i11").value = val.removeSelectors.join(", ");
        if (isDefined(val.removeValueSelectors)) {
            var c = val.removeValueSelectors, s = "";
            for (let i = 0; i < c.length; i++) {
                s += c[i].selector + " | " + c[i].value + ", ";
            }
            if (s.length > 0) s = s.slice(0, -2);
            document.getElementById("i12").value = s;
        }
    }
    //required all
    function isRequired() {
        if (document.getElementById("id1").value.trim() === 0 || document.getElementById("id2").value.trim() === 0 || document.getElementById("i1").value.trim() === 0
            || document.getElementById("i3").value.trim() === 0 || document.getElementById("i4").value.trim() === 0) {
            alert("Nezadali jste všechny povinné parametry.");
            return false;
        } else {
            var ok = false;
            var opts = document.getElementById("multi").getElementsByTagName("option");
            for (let i = 0; i < opts.length; i++) {
                if (opts[i].selected) {
                    ok = true;
                    break;
                }
            }
            
            if (ok) {
                return true;
            } else {
                alert("Nebyla vybrána žádná kategorie.");
                return false;
            }
        }
    }
    //load content
    function loadCon() {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                if (this.response.length > 2) {
                    var response = JSON.parse(this.responseText);
                    req = response.request;
                    val = response.value;

                    let cts = response.categories;
                    for (let i = 0; i < cts.length; i++) {
                        catIds.push(cts[i]._id);
                        cats.push(cts[i].ur);
                        kats.push(cts[i].cz);
                    }

                    edited = response.edited;
                    fillForms();
                    toogle();
                } else {
                    alert("Obdržena špatná data");
                }
            }
        };
        xhttp.open("POST", originPage + '/admin/get/' + actualJournal, true);
        xhttp.send();
    }
    loadCon();

    //paging click
    document.getElementById("idr1").addEventListener("click", function() {
        switchPaging(true, true);
    });
    document.getElementById("idr2").addEventListener("click", function() {
        switchPaging(false, true);
    });
    //spec click
    document.getElementById("idr3").addEventListener("click", function() {
        switchSpec(true);
    });
    document.getElementById("idr4").addEventListener("click", function() {
        switchSpec(false);
    });

    //tools
    //remove journal
    document.getElementById("drop").addEventListener("click", function() {
        var r = confirm("Opravdu chcete trvale smazat tento deník?\nTato akce nejde vrátit.\nSmazat jdou pouze nově přidané deníky.");
        if (r) {
            loading(true);
            var xhttpd = new XMLHttpRequest();
            xhttpd.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            alert("Deník byl úspěšně smazán.\nBudete přesměrováni na hlavní stránku.");
                            window.location.replace(originPage + "/admin");
                        } else {
                            alert("Smazání deníku se nezdařilo.");
                        }
                    } else {
                        alert("Neočekávaná chyba na serveru");
                    }
                    loading(false);
                }
            };
            xhttpd.open("GET", originPage + '/admin/delete/' + actualJournal, true);
            xhttpd.send();
        }
    });
    //get sample
    document.getElementById("sub-test").addEventListener("click", function() {
        if (!edited) {
            loading(true);
            if (isRequired()) {
                checkVal(false, true);
            } else {
                loading(false);
            }
        } else {
            alert("Tento deník byl již změněn.\nÚpravy bude možné provádět po dalším přenosu, který je jednou za 15 minut.");
        }
    });
    //recovery origin values
    document.getElementById("sub-recv").addEventListener("click", function() {
        var r = confirm("Opravdu chcete obnovit původní data?\nTato akce obnoví veškeré nastavení deníku v databázi.");
        if (r === true) {
            loading(true);
            recoveryForm();
        }
    });
    //check data integrity
    document.getElementById("sub-chec").addEventListener("click", function() {
        if (!edited) {
            loading(true);
            if (isRequired()) {
                checkVal(false, false);
            } else {
                loading(false);
            }
        } else {
            alert("Tento deník byl již změněn.\nÚpravy bude možné provádět po dalším přenosu, který je jednou za 15 minut.");
        }
    });
    //save changes
    document.getElementById("sub-save").addEventListener("click", function() {
        if (!edited) {
            if (isRequired()) {
                var r = confirm("Opravdu chcete uložit všechny změny?\nDeník nebude možné do dalšího přenosu upravovat.");
                if (r === true) {
                    loading(true);
                    checkVal(true, false);
                }
            }
        } else {
            alert("Tento deník byl již změněn.\nÚpravy bude možné provádět po dalším přenosu, který je jednou za 15 minut.");
        }
    });

    //get date
    function getDate(date) {
        var nowDate = new Date();
        var artDate = new Date(date);
        
        if (nowDate.getDate() === artDate.getDate()) {
            let dif = nowDate.getHours() - artDate.getHours();
            if (dif > 1) {
                return "Před " + dif + " hodinami";
            } else if (dif === 1) {
                return "Před hodinou";
            } else {
                dif = nowDate.getMinutes() - artDate.getMinutes();
                if (dif > 4) {
                    return "Před " + dif + " minutami";
                } else {
                    return "Právě teď";
                }
            }
        }
        nowDate.setDate(nowDate.getDate() - 1);
        if (nowDate.getDate() == artDate.getDate()) {
            return "Včera";
        } else {
            return artDate.toLocaleDateString('cs-CZ', optionsT);
        }
    }
    //print sample
    function samplePrint(articles, nc) {
        var block = document.getElementById("sample-admin");
        document.getElementById("side-name").innerHTML = "Ukázka";

        if (articles.length === 2) {
            block.getElementsByClassName("side-content")[0].innerHTML = '<h3 class="sub-admin">První nalezený speciální článek</h3>';
        } else if (articles.length === 1) {
            block.getElementsByClassName("side-content")[0].innerHTML = '<h3 class="sub-admin">První nalezený článek</h3>';
        } else {
            alert("Nebyly nalezeny žádné články.\nZkontrolujte zadané parametry a zkuste to znovu.");
            return;
        }

        for (let i = 0; i < articles.length; i++) {
            if (i > 0) {
                block.getElementsByClassName("side-content")[0].innerHTML += '\n<h3 class="sub-admin">První nalezený článek</h3>';
            }
            var a = articles[i];
            if (a !== {}) {
                var tag = document.createElement("div");
                tag.classList.add("article-info");
                var c = (a.cat === "" && nc.length > 0) ? nc[0] : a.cat;
                c = kats[catIds.indexOf(c)];
                tag.innerHTML += '<h5>Nadpis článku</h5>'
                            + '\n<span class="lin">' + a.tit + '</span>'
                            + '\n<h5>Úvodní text</h5>'
                            + '\n<span class="lin">' + a.per + '</span>'
                            + '\n<h5>Datum</h5>'
                            + '\n<span class="lin">(UTC) ' + a.dat.toLocaleString() + '<strong>' + getDate(a.dat) + '</strong>' + '</span>'
                            + '\n<h5>Ukázkový obrázek</h5>'
                            + '\n<span class="lin">' + a.sim + '</span>'
                            + '\n<h5>Obrázek článku</h5>'
                            + '\n<span class="lin">' + a.mim + '</span>'
                            + '\n<h5>Nalezené tagy</h5>'
                            + '\n<span class="lin">' + a.tag.join(", ") + '</span>'
                            + '\n<h5>Kategorie článku</h5>'
                            + '\n<span class="lin">' + c + '</span>'
                            + '\n<h5>Obsah článku</h5>'
                            + '\n<div class="lin">' + a.con + '</div>';

                block.getElementsByClassName("side-content")[0].appendChild(tag);
            } else {
                block.getElementsByClassName("side-content")[0].innerHTML += '\n<span class="noth">Žádný platný článek nebyl nalezen.</span>';
            }
        }
        block.classList.add("visible");
    }

    //request for check values
    function checkVal(save, sample) {
        nr = {}, nv = {};
        //download
        const formData = new FormData(document.getElementById("sub-req"));
        for (const [key, value] of formData.entries()) nr[key] = value;
        if (nr.specArt === 'false') {
            delete nr.specialParentSelector;
            delete nr.specialLinkSelector;
            delete nr.specialImageSelector;
            delete nr.specialIimageSelectorAttr;
        }
        delete nr.specArt;
        nr.categories = [];
        var opts = document.getElementById("multi").getElementsByTagName("option");
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].selected) {
                nr.categories.push(opts[i].value);
            }
        }
        if (nr.categories.length === 0) {
            alert("Musí být vybrána aspoň jedna kategorie.");
            loading(false);
            return;
        }
        nr._id = req._id;
        
        //parse
        const formData2 = new FormData(document.getElementById("sub-val"));
        for (const [key, value] of formData2.entries()) nv[key] = value;
        nv.name = nr.name;
        nv.contentRemove = str2Array(nv.contentRemove);
        nv.okLinks = str2Array(nv.okLinks);
        nv.badLinks = str2Array(nv.badLinks);
        nv.removeSelectors = str2Array(nv.removeSelectors);
        if (nv.perexCut === "false" || nv.perexCut === false) {
            if (nv.textSelector.trim().length === 0) {
                alert("Musíte zadat selektor úvodního textu.");
                loading(false);
                return;
            }
        }
        //categories
        var tmp = str2Array(nv.categories);
        var ar = [];
        for (let i = 0; i < tmp.length; i++) {
            var a = tmp[i];
            var j = a.lastIndexOf(":");
            if (j === -1) {
                alert("Parsování: Kategorie musí být ve formátu řetězec: kategorie, řetězec: kategorie,...");
                loading(false);
                return;
            } else {
                var c = a.substring(j + 1).trim();

                let tempIndex = cats.indexOf(c);
                let tempId = "";

                if (tempIndex !== -1) {
                    tempId = catIds[tempIndex];
                    
                    if (nr.categories.indexOf(tempId) === -1) {
                        alert("Parsování: Kategorie " + kats[tempIndex] + " nebyla vybrána v předchozím formuláři.");
                        loading(false);
                        return;
                    } else {
                        ar.push({ text: a.substring(0, j).trim(), category: tempId });
                    }
                } else if (kats.indexOf(c) !== -1) {
                    tempIndex = kats.indexOf(c);
                    tempId = catIds[tempIndex];

                    if (nr.categories.indexOf(tempId) === -1) {
                        alert("Parsování: Kategorie " + kats[tempIndex] + " nebyla vybrána v předchozím formuláři.");
                        loading(false);
                        return;
                    } else {
                        ar.push({ text: a.substring(0, j).trim(), category: tempId });
                    }
                } else {
                    alert("Parsování: Kategorie " + c + " nebyla nalezena.");
                    loading(false);
                    return;
                }
            }
        }
        nv.categories = ar.slice();
        if (ar.length === 0 && nr.categories.length > 1) {
            alert("Jelikož je vybráno více kategorií, musíte zadat roztřízení článků do kategorií.");
            loading(false);
            return;
        }
        //selectors with value
        tmp = str2Array(nv.removeValueSelectors);
        ar = [];
        for (let i = 0; i < tmp.length; i++) {
            var a = tmp[i];
            var j = a.lastIndexOf("|");
            if (j === -1) {
                alert("Parsování: Kategorie musí být ve formátu řetězec: kategorie, řetězec: kategorie,...");
                loading(false);
                return;
            } else {
                ar.push({ selector: a.substring(0, j).trim(), value: a.substring(j + 1).trim() });
            }
        }
        nv.removeValueSelectors = ar.slice(0);
        nv._id = val._id;

        var nc = nr.categories.slice(0);


        //requests to server
        if (save) {
            var xhttps1 = new XMLHttpRequest();
            xhttps1.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            alert("Vše v pořádku.\nZadané parametry se zdají být správné.\nPro ověření správnosti vyplněných údajů využijte nástroj ukázkového článku.");
                        } else {
                            alert(response.error.mess);
                        }
                    } else if (isDefined(response.m)) {
                        alert(response.m);
                        edited = true;
                        edit();
                    } else {
                        alert(JSON.stringify(response));
                    }
                    loading(false);
                }
            };
            xhttps1.open("POST", originPage + '/admin/save', true);
            xhttps1.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttps1.send("params=" + JSON.stringify({ name: req.name, nr: nr, nv: nv }));

        } else if (sample) {
            var xhttps2 = new XMLHttpRequest();
            xhttps2.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            alert("Vše v pořádku.\nZadané parametry se zdají být správné.\nPro ověření správnosti vyplněných údajů využijte nástroj ukázkového článku.");
                        } else {
                            alert(response.error.mess);
                        }
                    } else if (isDefined(response.article)) {
                        if (response.article === []) {
                            alert("Došlo k neočekávané chybě.\nZkontrolujte údaje a zkuste to znovu.");
                        } else {
                            samplePrint(response.article, nc);
                        }
                    } else {
                        alert(JSON.stringify(response));
                    }
                    loading(false);
                }
            };
            xhttps2.open("POST", originPage + '/admin/sample', true);
            xhttps2.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttps2.send("params=" + JSON.stringify({ name: req.name, nr: nr, nv: nv }));

        } else {
            var xhttps3 = new XMLHttpRequest();
            xhttps3.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            alert("Vše v pořádku.\nZadané parametry se zdají být správné.\nPro ověření správnosti vyplněných údajů využijte nástroj ukázkového článku.");
                        } else {
                            alert(response.error.mess);
                        }
                    } else {
                        alert(JSON.stringify(response));
                    }
                    loading(false);
                }
            };
            xhttps3.open("POST", originPage + '/admin/check', true);
            xhttps3.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttps3.send("params=" + JSON.stringify({ name: req.name, nr: nr, nv: nv }));
        }
    }

    //request for recovery data
    function recoveryForm() {
        var xhttp1 = new XMLHttpRequest();
        xhttp1.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var response = JSON.parse(this.responseText);
                if (isDefined(response.ok)) {
                    if (response.ok) {
                        alert("Původní data byla obnovena.");
                        location.reload();
                    } else {
                        alert("Obnovení dat se nezdařilo.");
                    }
                } else {
                    alert("Při obnovení došlo k neočekávané chybě.");
                }
                loading(false);
            }
        };
        xhttp1.open("POST", originPage + '/admin/recovery', true);
        xhttp1.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhttp1.send("params=" + JSON.stringify({ reqId: req._id, valId: val._id }));
    }

    //close side panel
    document.getElementsByClassName("close")[0].addEventListener("click", function(e) {
        document.getElementById("sample-admin").classList.remove("visible");
    });

    //size multi
    let mult = document.getElementById("multi");
    mult.size = mult.getElementsByTagName("option").length;
});