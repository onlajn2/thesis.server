document.addEventListener("DOMContentLoaded", function(event) {
    var originPage = window.location.origin;
    var select = document.getElementById("mfile");

    //is defined
    function isDefined(value) {
        return value !== undefined && value !== null;
    }

    //load content
    function loadOptions() {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var response = JSON.parse(this.responseText);
                if (isDefined(response.names)) {
                    var names = response.names;
                    for (let i = 0; i < names.length; i++) {
                        var name = names[i].split(".")[0];
                        select.innerHTML += '<option value="' + name + '">' + name + '</option>';
                    }
                } else {
                    alert("Došlo k chybě při získávání logů.\nZkuste aktualizovat stránku.");
                }
            }
        };
        xhttp.open("GET", originPage + '/admin/get/logs', true);
        xhttp.send();
    }
    loadOptions();

    //click button
    document.getElementById("logbtn").addEventListener("click", function(e) {
        downloadLog();
    });

    function downloadLog() {
        var value = select.options[select.selectedIndex].value;
        var xhttps = new XMLHttpRequest();
        xhttps.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var res = this.responseText.split("| Info |").join('<span class="linfo">| Info |</span>').split("| Error |").join('<span class="lerror">| Error |</span>');
                res = res.split("' |").join("").split("'").join("") + "</span>";
                let t = new Date().getFullYear() + "_";
                res = res.split(t).join("</span><span>" + t).substr(7);
                document.getElementsByClassName("log-block")[0].innerHTML = res;
                document.getElementsByClassName("log-block")[0].style.display = "block";
            }
        };
        xhttps.open("GET", originPage + '/admin/get/log/' + value, true);
        xhttps.send();
    }
});