/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

'use strict';

window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);

function onHashChangeEvent(event) {
    onLoadEvent();
}

function onLoadEvent() {
    if (!document.location.hash) {
        document.location.hash = '#home';
    }

    switch (document.location.hash) {
        case '#home':
            showHome();
            break;
        default:
            get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + document.location.hash.replace('#', '') + '.html');
            break;
    }
}

function showError(error) {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/error.html')
    .then((html) => showContent(html))
    .then(() => document.querySelector('.article-body').innerHTML += "<p>" + error + "<p>");
}

function showHome() {
    document.getElementById('content').innerHTML = '';

    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
        .then((json) => {
            let jobs = [];

            JSON.parse(json).articles.forEach(article => jobs.push(get(article.url)
                .then((html) => createArticle(html, article.url))));

            Promise.all(jobs).then((content) => showContent(content.join()));
        });
}

function showContent(html) {
    document.getElementById('content').innerHTML = html;
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
            console.warn(e);
        });
}

function createArticle(html, url) {
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
}
