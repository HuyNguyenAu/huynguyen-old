/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

let hist = [];
let y = 0;

window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);
window.onpopstate = function() {
    y = window.scrollY;
  };

function onHashChangeEvent(event) {
    
    let hash = '#' + event.oldURL.split('#').pop();
    hist[hash] = y;

    onLoadEvent();
}

function onLoadEvent() {
    let hash = document.location.hash;

    if (!hash) {
        document.location.hash = '#home';
    } else if (hash === '#home') {
        showHome();
    } else {
        showArticle(hash);
    }
}

function showArticle(hash) {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + hash.replace('#', '') + '.html')
        .then((html) => showContent(html)).then();
}

function showError(error) {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/error.html')
        .then((html) => showContent(html))
        .then(() => document.querySelector('.article-body').innerHTML += "<p>" + error + "<p>");
}

function showHome() {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
        .then((json) => {
            let jobs = [];

            JSON.parse(json).articles.forEach(article => jobs.push(get(article.url)
                .then((html) => createArticle(html, article.url))));
                
            Promise.all(jobs).then((content) => showContent(content.join('')));
        });
}

function showContent(html) {
    try {
        document.getElementById('content').innerHTML = html;

        let hash = document.location.hash;

        if (hash in hist) {
            window.scrollTo({
                top: hist[hash],
                left: 0,
                behavior: 'smooth'
              });
        } else {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
              });
        }
    } catch (e) {
        showCriticalError();
        console.error(e);
    }
}

function showCriticalError() {
    window.location.href = 'html/critical.html';
}

function get(url) {
    return fetch(url)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(response.status + '. Failed to load ' + url);
            }
        })
        .catch((e) => {
            showError(e);
        });
}

function createArticle(html, url) {
    try {
        let temp = document.createElement('temp');
        temp.innerHTML = html;

        let title = temp.querySelector('.article-title');
        /* Wrap the header in a link so it give the visual feedback of a link. */
        title.outerHTML = '<a class="article-title-link" href="#' + url.split('/').pop().replace('.html', '') + '">' + title.outerHTML + "</a>";

        let paragraphs = temp.querySelectorAll('.article-body p');

        /* Transform the article into an item. */
        for (let i = 0; i < paragraphs.length; i++) {
            if (i === 0) {
                paragraphs[i].classList.add('truncate');
            } else {
                paragraphs[i].remove();
            }
        }

        return temp.innerHTML;
    } catch (_) {
        showCriticalError();
    }
}
