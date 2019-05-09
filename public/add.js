document.addEventListener("DOMContentLoaded", function(event) {
    var originPage = window.location.origin;
    var cats = [], kats = [], catIds = [];
    var nr = {}, nv = {};
    var optionsT = { month: 'long', day: 'numeric' };

    document.getElementsByClassName("colms")[0].style.display = "block";

    //is defined
    function isDefined(value) {
        return value !== undefined && value !== null;
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

    //set active
    document.getElementsByTagName("aside")[0].getElementsByTagName("li")[0].classList.add("active");

    //switch paging
    function switchPaging(bool) {
        if (bool) {
            document.getElementById("idr1").checked = true;
            document.getElementsByClassName("blank")[0].style.display = "block";
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
        } else {
            document.getElementById("idr4").checked = true;
            document.getElementsByClassName("blank")[1].style.display = "none";
        }
    }
    switchSpec(false);
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

    //load content
    function loadCon() {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    if (this.response.length > 2) {
                        var response = JSON.parse(this.responseText);
                        if (isDefined(response.categories)) {
                            let categs = response.categories;
                            for (let i = 0; i < categs.length; i++) {
                                catIds.push(categs[i]._id);
                                cats.push(categs[i].ur);
                                kats.push(categs[i].cz);
                            }
                        }
                    } else {
                        alert("Obdržena špatná data");
                    }
                } else {
                    alert("Došlo k neznámé chyba.");
                }
            }
        };
        xhttp.open("POST", originPage + '/admin/get/nn', true);
        xhttp.send();
    }
    loadCon();


    //required all
    function isRequired() {
        if (document.getElementById("id1").value.trim().length === 0 || document.getElementById("id2").value.trim().length === 0 || document.getElementById("id11").value.trim().length === 0
        || document.getElementById("i1").value.trim().length === 0 || document.getElementById("i2").value.trim().length === 0 || document.getElementById("i3").value.trim().length === 0 || document.getElementById("i4").value.trim().length === 0) {
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
    document.getElementById("sub-test").addEventListener("click", function() {
        if (isRequired()) {
            loading(true);
            checkVal(false, true);
        }
    });
    //check data integrity
    document.getElementById("sub-chec").addEventListener("click", function() {
        if (isRequired()) {
            loading(true);
            checkVal(false, false);
        }
    });
    //save changes
    document.getElementById("sub-save").addEventListener("click", function() {
        if (isRequired()) {
            var r = confirm("Opravdu chcete uložit tento deník?");
            if (r === true) {
                loading(true);
                checkVal(true, false);
            }
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
            return;
        }
        
        //parse
        const formData2 = new FormData(document.getElementById("sub-val"));
        for (const [key, value] of formData2.entries()) nv[key] = value;
        nv.name = nr.name;
        nv.contentRemove = str2Array(nv.contentRemove);
        nv.okLinks = str2Array(nv.okLinks);
        nv.badLinks = str2Array(nv.badLinks);
        nv.removeSelectors = str2Array(nv.removeSelectors);
        //categories
        var tmp = str2Array(nv.categories);
        var ar = [];
        for (let i = 0; i < tmp.length; i++) {
            var a = tmp[i];
            var j = a.lastIndexOf(":");
            if (j === -1) {
                alert("Parsování: Kategorie musí být ve formátu řetězec: kategorie, řetězec: kategorie,...");
                return;
            } else {
                var c = a.substring(j + 1).trim(); //kategorie v poli retezec : kategorie, retezec2 : kategorie,...

                let tempIndex = cats.indexOf(c);
                let tempId = "";

                if (tempIndex !== -1) {
                    tempId = catIds[tempIndex];
                    if (nr.categories.indexOf(tempId) === -1) {
                        alert("Parsování: Kategorie " + kats[tempIndex] + " nebyla vybrána v předchozím formuláři.");
                        return;
                    } else {
                        ar.push({ text: a.substring(0, j).trim(), category: tempId });
                    }
                } else if (kats.indexOf(c) !== -1) {
                    tempIndex = kats.indexOf(c);
                    tempId = catIds[tempIndex];

                    if (nr.categories.indexOf(tempId) === -1) {
                        alert("Parsování: Kategorie " + kats[tempIndex] + " nebyla vybrána v předchozím formuláři.");
                        return;
                    } else {
                        ar.push({ text: a.substring(0, j).trim(), category: tempId });
                    }
                } else {
                    alert("Parsování: Kategorie " + c + " nebyla nalezena.");
                    return;
                }
            }
        }
        nv.categories = ar.slice();
        if (ar.length === 0 && nr.categories.length > 1) {
            alert("Jelikož je vybráno více kategorií, musíte zadat roztřízení článků do kategorií.");
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
                return;
            } else {
                ar.push({ selector: a.substring(0, j).trim(), value: a.substring(j + 1).trim() });
            }
        }
        nv.removeValueSelectors = ar.slice();
        
        var nc = nr.categories.slice();

        //requests to server
        if (save) {
            var xhttps1 = new XMLHttpRequest();
            xhttps1.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
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
                    } else {
                        alert("Došlo k neznámě chybě.");
                    }
                }
            };
            xhttps1.open("POST", originPage + '/admin/save', true);
            xhttps1.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttps1.send("params=" + JSON.stringify({ nr: nr, nv: nv }));

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
            xhttps2.send("params=" + JSON.stringify({ nr: nr, nv: nv }));

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
            xhttps3.send("params=" + JSON.stringify({ nr: nr, nv: nv }));
        }
    }

    //close side panel
    document.getElementsByClassName("close")[0].addEventListener("click", function(e) {
        document.getElementById("sample-admin").classList.remove("visible");
    });
    
    //size multi
    let mult = document.getElementById("multi");
    mult.size = mult.getElementsByTagName("option").length;
});