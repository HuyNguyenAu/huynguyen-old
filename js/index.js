window.addEventListener('load', function () {
    fetch("https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/index.html")
        .then((response) => response.text())
        .then((html) => {
            console.log(html);
        })
        .catch((error) => {
            console.warn(error);
        });
});