/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

// (function () {
/* A dictionary that consists of the url(key), and the
vertical scrol position (value). */
let verticalScrollHistory = [];
/* Remember the last known vertical scrolling postion
using the popstate event because the hashchange event
reports the wrong vertical scrolling positon. */
let lastVerticalScrollPosition = 0;
/* The number of articles to load on the home page. */
const limit = 10;

window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);
window.addEventListener('popstate', onPopStateEvent);
document.getElementById('go-to-top').addEventListener('click', onGoToTopClicked);

/** This is called everytime the page is loaded and when the hash changes.
 * If the user is on the root page, then redirect the the home page.
*/
function onLoadEvent() {
    if (!document.location.hash) {
        document.location.hash = '#home';
    } else if (document.location.hash === '#home') {
        showHome();
    } else if (document.location.hash === '#archives') {
        // showHome();
    } else {
        showArticle(document.location.hash);
    }
}

/** When the user clicks on a link, the hash changes. When the hash changes, remember the
 * vertical scroll position of the current page before moving on to the next. If the user is at the
 * limits of the vertical scroll positon, then set the scroll position before the limits.
*/
function onHashChangeEvent(event) {
    // Debug.
    // console.log("onHashChangeEvent: " + '#' + event.oldURL.split('#').pop() + ", " + '#' + event.newURL.split('#').pop() + ", " + window.scrollY);

    let hash = '#' + event.oldURL.split('#').pop();

    /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY,
    the returned value is mostly scrollMaxY. To prevent this, we just need to set either at
    1 or window.scrollMaxY - 1. */
    if (lastVerticalScrollPosition <= 0) {
        verticalScrollHistory[hash] = 1;
    } else if (lastVerticalScrollPosition >= window.scrollMaxY) {
        verticalScrollHistory[hash] = window.scrollMaxY - 1;
    } else {
        verticalScrollHistory[hash] = lastVerticalScrollPosition;
    }

    onLoadEvent();
}

/** When the user navigates, remember the vertical scroll position. 
 * If we the hashchange event, it reports the wrong vertical scroll postion when the user
 * is close to the limits of the vertical scroll.
 * Popstate is called before hashchange.
*/
function onPopStateEvent() {
    // Debug.
    // console.log("onpopstate: " + document.location.hash + ", " + window.scrollY);
    lastVerticalScrollPosition = window.scrollY;
}

/** Show the article. */
function showArticle(hash) {
    get(`https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/${hash.replace('#', '')}.html`)
        .then((html) => showContent(html, false));
}

/** Show the error page with the error message. */
function showError(error) {
    /* An error page should not rely on downloading a payload. If we use get, it will end up being an infinite loop. */
    const html = '<div class="article"><div class="article-header"><h2 class="article-title">OOPS!</h2></div><div class="article-body"><p>Looks like something went wrong!</p><p>Don\'t worry here\'s the error:</p></div></div>';
    showContent(html, false);

    let articleBody = document.querySelector('.article-body');
    
    /* If we cannot append the error reason to the body, it means the document is corrupted. */
    if (articleBody) {
        articleBody.innerHTML += `<p>${error}<p>`;
    } else {
        showCriticalErrorPage();
    }
}

/** Show home. */
function showHome() {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
        .then((json) =>
            /* Only scroll to the last known y position when everything has been appended. */
            Promise.all(parseArticles(json)).then(() => scrollToY(document.location.hash, verticalScrollHistory)));
}

/** Parse the articles.json file and display it in content. Return a list of jobs. 
 * 
 * @param String json
 * 
 * @returns Promise[]
*/
function parseArticles(json) {
    /* Check the parameters. */
    if (typeof (json) !== 'string') {
        throw new Error(`The parameter html in the function parseArticles is undefined or not a string. Expected string, got ${typeof (json)}.`);
    }

    /* Clear out existing content. */
    showContent('', false);

    let jobs = [];

    try {
        JSON.parse(json).slice(0, limit).forEach(article => jobs.push(get(article.url)
            .then((html) => createHomeItem(html, article.url))
            .then((article) => showContent(article, true))));
    } catch (error) {
        /* An error here can still be displayed. */
        showError(error);
    }

    return jobs;
}

/** Replace inner html of content. Then scroll to the last known y position if
 * it exists.
 * 
 * @param String html
*/
function showContent(html, append) {
    /* Check the parameters. */
    if (typeof (html) !== 'string') {
        throw new Error(`The parameter html in the function showContent is undefined or not a string. Expected string, got ${typeof (html)}.`);
    }

    if (typeof (append) !== 'boolean') {
        throw new Error(`The parameter append in the function showContent is undefined or not a boolean. Expected boolean, got ${typeof (append)}.`);
    }

    try {
        let content = document.getElementById('content');

        if (!content) {
            throw new Error("Unable to find an element with the id content!");
        }

        if (append) {
            content.insertAdjacentHTML("afterbegin", html);
        } else {
            content.innerHTML = html;
            scrollToY(document.location.hash, verticalScrollHistory);
        }

    } catch (error) {
        console.error(error);
        /* An error here means that the document html is has been corrupted.
        A standalone error page must be shown becuase the normal error relies on this
        method. */
        showCriticalErrorPage();
    }
}

/** Scroll the the last known scroll y value given a hash and the hash history.
 * If hash is not in the hash history, then scroll to the top.
 * 
 * @param String hash
 * @param Array hashHistory
*/
function scrollToY(hash, hashHistory) {
    try {
        /* Check the parameters. */
        if (typeof (hash) !== 'string') {
            throw new Error(`The parameter hash in the function scrollToY is undefined or not a string. Expected string, got ${typeof (hash)}.`);
        }

        if (typeof (hashHistory) !== 'object') {
            throw new Error(`The parameter hashHistory in the function scrollToY is undefined or not a object. Expected object, got ${typeof (hashHistory)}.`);
        }

        /* If the hash is found, then scroll to the y value last known, else just scroll to the top. */
        if (hash in hashHistory) {
            window.scrollTo(0, hashHistory[hash]);
        } else {
            /* There is a bug in chrome where scrolling to the top somehow causes it the window.scrollY to
            be equal to window.scrollMaxY. This might be due to an overflow of some kind? */
            window.scrollTo(0, 1);
        }
    } catch (error) {
        /* An error here can still be displayed. */
        showError(error);
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
        throw new Error(`The parameter url in the function get is undefined or not a string. Expected string, got ${typeof (url)}.`);
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
        throw new Error(`The parameter html in the function createHomeItem is undefined or not a string. Expected string, got ${typeof (html)}.`);
    }

    if (typeof (url) !== 'string') {
        throw new Error(`The parameter url in the function createHomeItem is undefined or not a string. Expected string, got ${typeof (url)}.`);
    }

    try {
        /* Create a temp element so we can store the article inside and transform it into a home item. */
        let temp = document.createElement('temp');
        temp.insertAdjacentHTML('afterbegin', html);

        /* Wrap the header in a link so it give the visual feedback of a link. */
        let title = temp.querySelector('.article-title');

        if (!title) {
            throw new Error(`No title found in ${url}.`);
        }

        title.outerHTML = `<a class="article-title-link" href="#${url.split('/').pop().replace('.html', '')}">${title.outerHTML}</a>`;

        /* Transform the article into an item by removing all but the first paragraph. */
        let paragraphs = temp.querySelectorAll('.article-body p');

        if (!paragraphs) {
            throw new Error(`No paragraphs found in ${url}.`);
        }

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

function onGoToTopClicked() {
    window.scrollTo(0, 1);
}
// } ());