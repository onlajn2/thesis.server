document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementsByTagName("h3")[0].addEventListener("click", function() {
        if (document.getElementsByClassName("under")[0].style.display == "none") {
            document.getElementsByClassName("under")[0].style.display = "block";
        } else {
            document.getElementsByClassName("under")[0].style.display = "none";
        }
    });
    document.getElementsByTagName("h3")[1].addEventListener("click", function() {
        if (document.getElementsByClassName("under")[1].style.display == "none") {
            document.getElementsByClassName("under")[1].style.display = "block";
        } else {
            document.getElementsByClassName("under")[1].style.display = "none";
        }
    });
});