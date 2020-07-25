window.addEventListener('load', function () {
    load();
});

window.onhashchange  = function (event) {
    console.log(event.newURL.split('/').pop());
    if (event.newURL.split('/').pop() === 'index.html') {
        load();
    } else {
        showArticle('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + event.newURL.split('#').pop());
    }
};

async function get(url) {
    return fetch(url)
        .then((response) => response.text())
        .catch((error) => {
            console.warn(error);
        });
}

function getArticles() {
    return get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json');
}

function createItem(html, url) {
    let temp = document.createElement('temp');
    temp.innerHTML = html;

    console.log(title.outerHTML);

    let title = temp.querySelector('.article-title');
    title.setAttribute('link', url);
    title.outerHTML = '<a href="#' + url.split('/').pop() +'">' + title.outerHTML + "</a>";

    let paragraphs = temp.querySelectorAll('.article-body p');

    for (let i = 0; i < paragraphs.length; i++) {
        if (i === 0) {
            paragraphs[i].classList.add('truncate');
        } else {
            paragraphs[i].remove();
        }
    }

    return temp.innerHTML;
}

function showArticle(url) {
    get(url).then((html) => {
        document.getElementById('articles').innerHTML = html;
    });
}

function load() {
    document.getElementById('articles').innerHTML = '';

    if (document.location.hash.length > 0) {
        showArticle('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + document.location.hash.replace('#', ''));
    } else {
        getArticles().then((json) => {
            let articles = JSON.parse(json);
    
            articles.articles.forEach(url => {
                get(url).then((html) => {
                    document.getElementById('articles').innerHTML += createItem(html, url);
    
                    document.querySelectorAll('.article-title')[0].onclick = function() {
                        showArticle(this.getAttribute("link"));
                    };
                })
            });
        });
    }
}