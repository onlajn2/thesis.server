document.addEventListener("DOMContentLoaded", function(event) {
    var aside = document.getElementById("hidden");
    //hidden menu
    document.getElementById("hidden-menu").addEventListener("click", function(e) {  
        e.stopPropagation();   
        if (aside.classList.contains("visib")) {
            aside.classList.remove("visib");
        } else {
            aside.classList.add("visib");
        }
    });
    document.getElementById("menu-cls").addEventListener("click", function(e) {
        e.stopPropagation();  
        if (aside.classList.contains("visib")) {
            aside.classList.remove("visib");
        } else {
            aside.classList.add("visib");
        }
    });
    document.addEventListener("click", function(e) {
        if (aside.classList.contains("visib")) {
            if (!aside.contains(e.target)) {
                aside.classList.remove("visib")
            }
        }
    });
    
});