document.addEventListener("DOMContentLoaded", function(event) {
    var originPage = window.location.origin;
    var symbols = /[&/\\#,-:()$~%.'\"*?<>{}]1234567890/;

    function toogle() {
        if (document.getElementsByClassName("fixed-block").length === 0) {
            let div = document.createElement("div");
            div.classList.add("fixed-block");
            div.innerHTML = '<div class="lds-dual-ring"></div>';
            document.body.appendChild(div);
        } else {
            let div = document.getElementsByClassName("fixed-block")[0];
            div.parentNode.removeChild(div);
        }
    }

    //is defined
    function isDefined(value) {
        return value !== undefined && value !== null;
    }

    //define actions
    function define() {
        //edit origin
        let itms = document.getElementsByClassName("items-1")[0].getElementsByClassName("cat-can");
        let xhttp1 = new Array();
        for (let i = 0; i < itms.length; i++) {
            let elem = itms[i].cloneNode(true);
            itms[i].parentNode.replaceChild(elem, itms[i]);
            xhttp1.push(new XMLHttpRequest());

            itms[i].addEventListener("click", function(e) {
                toogle();
                let val = e.target.value;
                let parent = e.target.parentNode;
                let nName = parent.getElementsByTagName("input")[0].value;
                let nAddr = parent.getElementsByTagName("input")[1].value;

                xhttp1[i].onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            var response = JSON.parse(this.responseText);
                            if (isDefined(response.ok)) {
                                if (response.ok) {
                                    parent.getElementsByTagName("input")[0].value = nName;
                                    parent.getElementsByTagName("input")[1].value = nAddr;
                                    alert("Změna proběhla úspěšně.");
                                } else {
                                    alert(response.mes);
                                }
                            }
                        } else {
                            alert("Došlo k neznámé chybě.");
                        }
                        toogle();
                    }
                };

                //ok, mes
                xhttp1[i].open("POST", originPage + '/admin/kategorie/upravit', true);
                xhttp1[i].setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhttp1[i].send("params=" + JSON.stringify({ val: val, nName: nName, nAddr: nAddr }));
            });
        }

        //edit own
        let items = document.getElementsByClassName("items-2")[0].getElementsByClassName("cat-can");
        let xhttps = new Array();
        for (let i = 0; i < items.length; i++) {
            let elem = items[i].cloneNode(true);
            items[i].parentNode.replaceChild(elem, items[i]);
            xhttps.push(new XMLHttpRequest());
            
            items[i].addEventListener("click", function(e) {
                toogle();
                let val = e.target.value;
                let parent = e.target.parentNode;
                let nName = parent.getElementsByTagName("input")[0].value;
                let nAddr = parent.getElementsByTagName("input")[1].value;
                
                xhttps[i].onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            var response = JSON.parse(this.responseText);
                            if (isDefined(response.ok)) {
                                if (response.ok) {
                                    parent.getElementsByTagName("input")[0].value = nName;
                                    parent.getElementsByTagName("input")[1].value = nAddr;
                                    alert("Změna proběhla úspěšně.");
                                } else {
                                    if (isDefined(response.mes)) {
                                        alert(response.mes);
                                    }
                                }
                            }
                        } else {
                            alert("Došlo k neznámé chybě.");
                        }
                        toogle();
                    }
                };
                //ok, mes
                xhttps[i].open("POST", originPage + '/admin/kategorie/upravit', true);
                xhttps[i].setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhttps[i].send("params=" + JSON.stringify({ val: val, nName: nName, nAddr: nAddr }));
            });
        }

        //remove own
        let items2 = document.getElementsByClassName("items-2")[0].getElementsByClassName("cat-del");
        let xhttps2 = new Array();
        for (let i = 0; i < items2.length; i++) {
            let elem = items2[i].cloneNode(true);
            items2[i].parentNode.replaceChild(elem, items2[i]);
            xhttps2.push(new XMLHttpRequest());
            
            items2[i].addEventListener("click", function(e) {
                toogle();
                let val = e.target.value;
                let r = confirm("Opravdu chcete smazat tuto kategorii?");
                if (r) {
                    xhttps2[i].onreadystatechange = function() {
                        if (this.readyState == 4) {
                            if (this.status == 200) {
                                var response = JSON.parse(this.responseText);
                                if (isDefined(response.ok)) {
                                    if (response.ok) {
                                        let blc = e.target.parentNode;
                                        blc.parentNode.removeChild(blc);
                                        alert("Smazání kategorie proběhlo úspěšně.");
                                    } else {
                                        if (isDefined(response.list)) {
                                            if (response.list.length === 0) {
                                                if (isDefined(response.mes)) {
                                                    alert(response.mes);
                                                } else {
                                                    alert("Neznámá chyba.");
                                                }
                                            } else {
                                                alert("Nelze smazat tuto kategorii, protože je použita v následujících denících:\n" + response.list.join(", "));
                                            }
                                        }
                                    }
                                }
                            } else {
                                alert("Došlo k neznámé chybě.");
                            }
                            toogle();
                        }
                    };
                    //ok, id, list, mes
                    xhttps2[i].open("POST", originPage + '/admin/kategorie/smazat', true);
                    xhttps2[i].setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhttps2[i].send("params=" + JSON.stringify({ val: val }));
                }
            });
        }
    }
    define();

    //request
    function contin(n, a) {
        toogle();
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    if (isDefined(response.ok) && isDefined(response.id)) {
                        if (response.ok) {
                            //null new
                            document.getElementById("i31").value = "";
                            document.getElementById("i32").value = "";

                            //add to categories
                            let div = document.createElement("div");
                            div.classList.add("item-block");
                            div.innerHTML = '<input type="text" value="' + n + '"><input type="text" value="' + a + '">'
                                + '<button class="cat-can" value="' + response.id + '">Upravit</button><button class="cat-del" value="' + response.id + '">Smazat</button>';

                            let items = document.getElementsByClassName("items-2")[0];

                            if (document.getElementsByClassName("item-block-empty").length !== 0) {
                                items.innerHTML = '<div class="item-block item-title"><span>Název kategorie</span><span>URL zápis</span><span>Akce</span></div>';
                            }
                            items.appendChild(div);

                            //add actions
                            define();
                        } else {
                            if (isDefined(response.mes)) {
                                alert(response.mes);
                            }
                        }
                    }
                    toogle();
                } else {
                    toogle();
                    alert("Došlo k neznámé chybě.");
                }
            }
        };
        //ok, mes
        xhttp.open("POST", originPage + '/admin/kategorie/pridat', true);
        xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhttp.send("params=" + JSON.stringify({ name: n, addr: a }));
    }
    //save category
    document.getElementById("cat-sav").addEventListener("click", function() {
        let name = document.getElementById("i31").value.trim();
        let addr = document.getElementById("i32").value.trim();
     
        if (name.length < 5 || name.length > 20) {
            alert("Název kateogorie musí mít délku 5-20 znaků.");
        } else if (addr.length < 5 || addr.length > 20) {
            alert("URL zápis musí mít délku 5-20 znaků.");
        } else {
            if (symbols.test(name)) {
                alert("Název kategorie může obsahovat pouze písmena.");
            } else {
                if (addr !== encodeURI(addr)) {
                    let r = confirm("URL zápis obsahuje nepovolené symboly.\nVáš zápis: " + encodeURI(addr) + "\nChcete pokračovat s tímto zápisem?");
                    if (r) {
                        contin(name, encodeURI(addr));
                    }
                } else {
                    contin(name, addr);
                }
            }
        }
    });
});