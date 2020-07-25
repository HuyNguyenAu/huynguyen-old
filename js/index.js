window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);

function onLoadEvent() {
    // Clear out any existing content.
    document.getElementById('content').innerHTML = '';

    if (document.location.hash.length > 0) {
        showArticle('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + document.location.hash.replace('#', ''));
    } else {
        showHome();
    }
}

function onHashChangeEvent(event) {
  // Debug
  console.log(event.newURL.split('/').pop());

  onLoadEvent();
}

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

function showHome() {
    getArticles().then((json) => {
        let articles = JSON.parse(json);

        articles.articles.forEach(url => {
            get(url).then((html) => {
                document.getElementById('content').innerHTML += createItem(html, url);
            })
        });
    });
}

function showArticle(url) {
    get(url).then((html) => {
        document.getElementById('content').innerHTML = html;
    });
}