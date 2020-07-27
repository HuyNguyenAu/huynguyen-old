/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

let hist = [];
let y = 0;

window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);
window.addEventListener('popstate', onPopStateEvent);

function onLoadEvent() {
    if (!document.location.hash) {
        document.location.hash = '#home';
    } else if (document.location.hash === '#home') {
        showHome();
    } else {
        showArticle(document.location.hash);
    }
}

function onHashChangeEvent(event) {
    console.log("onHashChangeEvent: " + '#' + event.oldURL.split('#').pop() + ", " + '#' + event.newURL.split('#').pop() + ", " + window.scrollY);

    let hash = '#' + event.oldURL.split('#').pop();

    if (y <= 0) {
        hist[hash] = 1;
    } else if (y >= window.scrollMaxY) {
        hist[hash] = window.scrollMaxY - 1;
    } else {
        hist[hash] = y;
    }

    onLoadEvent();
}

function onPopStateEvent() {
    console.log("onpopstate: " + document.location.hash + ", " + window.scrollY);
    y = window.scrollY;
}

function showArticle(hash) {
    get(`https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/${hash.replace('#', '')}.html`)
        .then((html) => showContent(html)).then();
}

function showError(error) {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/error.html')
        .then((html) => showContent(html))
        .then(() => document.querySelector('.article-body').innerHTML += `<p>${error}<p>`);
}

function showHome() {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
        .then((json) => {
            let jobs = [];

            document.getElementById('content').innerHTML = '';
            JSON.parse(json).articles.forEach(article => jobs.push(get(article.url)
                .then((html) => { console.log(typeof (html), typeof (article.url)); return createHomeItem(html, article.url); }
                )));

            Promise.all(jobs).then((content) => showContent(content.join('')));
        });
}

function showContent(html) {
    try {
        document.getElementById('content').innerHTML = html;

        scrollToY(document.location.hash, hist);
    } catch (e) {
        showCriticalErrorPage();
        console.error(e);
    }
}

/** Scroll the the last known scroll y value given a hash and the hash history.
 * If hash is not in the hash history, then scroll to the top.
 * 
 * @param String hash
 * @param Array hashHistory
*/
function scrollToY(hash, hashHistory) {
    /* Check the parameters. */
    if (typeof (hash) !== 'string') {
        throw new Error('The parameter hash in the function scrollToY is undefined or not a string.');
    }

    if (typeof (url) !== 'object') {
        throw new Error('The parameter url in the function scrollToY is undefined or not a object.');
    }

    /* If the hash is found, then scroll to the y value last known, else just scroll to the top. */
    if (hash in hashHistory) {
        window.scrollTo(0, hist[hash]);
    } else {
        /* There is a bug in chrome where scrolling to the top somehow causes it the window.scrollY to
        be equal to window.scrollMaxY. This might be due to an overflow of some kind? */
        window.scrollTo(0, 1);
    }
}

/** Get a resource from the given url. Only returns something if it is successfull.
 * 
 * @param String url
 * 
 * @returns String
*/
function get(url) {
    /* Check the parameter. */
    if (typeof (url) !== 'string') {
        throw new Error('The parameter url in the function get is undefined or not a string.');
    }

    return fetch(url)
        .then((response) => {
            /* Make sure we only return when we get a successful response (status 200-299). */
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`Failed to load ${url}.`);
            }
        })
        .catch((error) => {
            /* An error here can still be displayed. */
            showError(error);
        });
}

/** Create a home item that is a shortened version of the actual
 * article.
 * 
 * @param String html
 * @param String url
 * 
 * @returns String
*/
function createHomeItem(html, url) {
    /* Check the parameters. */
    if (typeof (html) !== 'string') {
        throw new Error('The parameter html in the function createHomeItem is undefined or not a string.');
    }

    if (typeof (url) !== 'string') {
        throw new Error('The parameter url in the function createHomeItem is undefined or not a string.');
    }

    try {
        /* Create a temp element so we can store the article inside and transform it into a home item. */
        let temp = document.createElement('temp');
        temp.insertAdjacentHTML('afterbegin', html);

        /* Wrap the header in a link so it give the visual feedback of a link. */
        let title = temp.querySelector('.article-title');
        title.outerHTML = `<a class="article-title-link" href="#${url.split('/').pop().replace('.html', '')}">${title.outerHTML}</a>`;

        /* Transform the article into an item by removing all but the first paragraph. */
        let paragraphs = temp.querySelectorAll('.article-body p');
        for (let i = 0; i < paragraphs.length; i++) {
            if (i === 0) {
                paragraphs[i].classList.add('truncate');
            } else {
                paragraphs[i].remove();
            }
        }

        return temp.innerHTML;
    } catch (error) {
        /* An error here can still be displayed. */
        showError(error);
    }
}

/** Show the standalone critical error page. This should only be used
 * when the normal error page cannot be shown.
*/
function showCriticalErrorPage() {
    /* Show a standalone error page. This should only be used
    when we cannot show the normal error in the content element. 
    This means that the element used to show the content cannot be
    found. */
    window.location.href = 'html/critical.html';
}
