document.addEventListener("DOMContentLoaded", function(event) {
    var originPage = window.location.origin;
    var select = document.getElementById("mfile"), block = document.getElementsByClassName("log-block")[0], tool = document.getElementsByClassName("block-tool")[0];
    var printed = "", arts = [], cats = [], url = "", categories = [];

    //is defined
    function isDefined(value) {
        return value !== undefined && value !== null;
    }

    function loading(bool) {
        if (bool) {
            document.getElementsByClassName("center-block-2")[0].style.display = "block";
            document.getElementsByClassName("block-tool")[0].style.display = "none";
            document.getElementsByClassName("log-block")[0].style.display = "none";
        } else {
            document.getElementsByClassName("center-block-2")[0].style.display = "none";
            document.getElementsByClassName("block-tool")[0].style.display = "block";
            document.getElementsByClassName("log-block")[0].style.display = "block";
        }
    }

    //click button
    document.getElementById("logbtn").addEventListener("click", function(e) {
        loading(true);
        downloadArts(false);
    });

    //request to server for articles
    function downloadArts(bool) {
        var value = select.options[select.selectedIndex].value;
        if (bool) {
            value = printed;
        }
        var xhttps = new XMLHttpRequest();
        xhttps.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var response = JSON.parse(this.responseText);
                if (isDefined(response.articles) && isDefined(response.client) && isDefined(response.jcats)) {
                    printed = value;
                    arts = response.articles;
                    cats = response.jcats;
                    url = response.client;
                    categories = response.cats;
                    document.getElementById("sort").getElementsByTagName("option")[0].selected = "selected";
                    printArts();
                } else {
                    block.innerHTML = "";
                    block.style.display = "none";
                    tool.style.display = "none";
                    alert("Došlo k neočekávané chybě.\nZkuste to znovu.");
                }
            }
        };
        xhttps.open("GET", originPage + '/admin/get/arts/' + value, true);
        xhttps.send();
    }

    //print all articles
    function printArts() {
        block.innerHTML = '<table><tr><th>Nadpis</th><th>Kategorie</th><th>Datum / čas</th><th id="selectAll">Označit vše</th></tr></table>';
        var b = block.getElementsByTagName("tbody")[0];
        var len = arts.length;
        var options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
        
        for (let i = 0; i < len; i++) {
            let a = arts[i];
            let r = document.createElement('tr');
            r.classList.add("visib");

            let cat = (a.cat.length !== 0) ? a.cat : cats[0];
            for (let k = 0; k < categories.length; k++) {
                if (categories[k]._id === cat) {
                    cat = categories[k].cz;
                }
            }
            var u = url + "/clanek/" + printed + "/" + a._id + "/" + encodeURIComponent(a.tit);
            r.innerHTML = '<td><a href="' + u + '" target="_blank">' + a.tit + '</a></td><td>' + cat + '</td><td>' + new Date(a.dat).toLocaleDateString('cs-CZ', options) + '</td><td><input type="checkbox" value="' + a._id + '"></td>';
            b.appendChild(r);
        }

        tool.style.display = "block";
        block.style.display = "block";

        loading(false);
        
        //select all
        document.getElementById("selectAll").addEventListener("click", function() {
            var trs = document.getElementsByClassName("visib");
            var contin = true;
            var len = trs.length;

            for (let i = 0; i < len; i++) {
                let ch = trs[i].getElementsByTagName("input")[0];
                if (!ch.checked) {
                    ch.checked = true;
                    contin = false;
                }
            }
            //unselect all
            if (contin) {
                for (let i = 0; i < len; i++) {
                    trs[i].getElementsByTagName("input")[0].checked = false;
                }
            }
        });
    }

    //sort
    document.getElementById("sort").addEventListener("change", function(e) {
        var value = document.getElementById("sort").value;
        switch (value) {
            case "1":
                arts.sort((a,b) => new Date(b.dat).getTime() - new Date(a.dat).getTime());
                printArts();
                break;
            case "2":
                arts.sort((a,b) => new Date(a.dat).getTime() - new Date(b.dat).getTime());
                printArts();
                break;
            case "3":
                arts.sort(function(a, b){ return a.tit.localeCompare(b.tit); });
                printArts();
                break;
            case "4":
                arts.sort(function(a, b){ return b.tit.localeCompare(a.tit); });
                printArts();
                break;
            case "5":
                arts.sort(function(a, b){ return a.cat.localeCompare(b.cat); });
                printArts();
                break;
            case "6":
                arts.sort(function(a, b){ return b.cat.localeCompare(a.cat); });
                printArts();
                break;
            default:
                break;
        }
    });

    //delete all
    document.getElementById("remall").addEventListener("click", function(e) {
        var r = confirm("Opravdu chcete smazat všechny články deníku " + printed + " z databáze?");
        if (r === true) {
            var xhttpra = new XMLHttpRequest();
            xhttpra.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            if (isDefined(response.result.n)) {
                                alert("Články z deníku byly úspěšně smazány.\nPočet smazaných článků: " + response.result.n);
                            } else {
                                alert("Články z deníku byly úspěšně smazány.");
                            }
                            downloadArts(true);
                        } else {
                            if (isDefined(response.mess)) {
                                alert(mess);
                            } else {
                                alert("Smazání článků se nepovedlo.");
                            }
                        }
                    } else {
                        alert("Došlo k neočekávané chybě.\nZkuste to znovu.");
                    }
                }
            };
            xhttpra.open("POST", originPage + '/admin/remove/all', true);
            xhttpra.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttpra.send("params=" + JSON.stringify({ name: printed }));
        }
    });

    //delete selected rows
    document.getElementById("remsel").addEventListener("click", function() {
        var trs = document.getElementsByTagName("tr");
        var out = [], len = trs.length;
        for (let i = 1; i < len; i++) {
            if (trs[i].classList.contains("visib")) {
                let ch = trs[i].getElementsByTagName("input")[0];
                if (ch.checked) {
                    out.push(ch.value);
                }
            }
        }

        var r = confirm("Opravdu chcete smazat všechny označené články deníku " + printed + " z databáze?");
        if (r === true) {
            var xhttprb = new XMLHttpRequest();
            xhttprb.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok)) {
                        if (response.ok) {
                            if (isDefined(response.result.n)) {
                                alert("Články z deníku byly úspěšně smazány.\nPočet smazaných článků: " + response.result.n);
                            } else {
                                alert("Články z deníku byly úspěšně smazány.");
                            }
                            downloadArts(true);
                        } else {
                            if (isDefined(response.mess)) {
                                alert(mess);
                            } else {
                                alert("Smazání článků se nepovedlo.");
                            }
                        }
                    } else {
                        alert("Došlo k neočekávané chybě.\nZkuste to znovu.");
                    }
                }
            };
            xhttprb.open("POST", originPage + '/admin/remove', true);
            xhttprb.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhttprb.send("params=" + JSON.stringify({ name: printed, ids: out }));
        }
    });

    //search in articles
    document.getElementById("searb").addEventListener("click", function() {
        var term = document.getElementById("search").value.trim().toLowerCase();
        if (term.length > 0) {
            var trs = document.getElementsByTagName("tr");
            var len = trs.length;
            for (let i = 1; i < len; i++) {
                if (trs[i].getElementsByTagName("a")[0].textContent.toLowerCase().trim().indexOf(term) === -1) {
                    trs[i].classList.remove("visib");
                    trs[i].classList.add("hidden");
                } else {
                    trs[i].classList.remove("hidden");
                    trs[i].classList.add("visib");
                }
            }
        } else {
            alert("Zadejte nejprve hledaný výraz.");
        }
    });

    //return changes
    document.getElementById("delsear").addEventListener("click", function() {
        document.getElementById("search").value = "";
        var trs = document.getElementsByTagName("tr");
        var len = trs.length;
        for (let i = 1; i < len; i++) {
            trs[i].classList.remove("hidden");
            trs[i].classList.add("visib");
        }
    });
});