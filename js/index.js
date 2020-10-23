/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

/** TODO
 * Fix content ghosting caused by image loading.
 */

(function () {
    /* Set the theme before the document loads to stop the page from
    flashing white. */
    setTheme();
    /* A dictionary that consists of the url(key), and the
    vertical scrol position (value). */
    let verticalScrollPositionHistory = [];
    /* Remember the last known vertical scrolling postion
    using the popstate event because the hashchange event
    reports the wrong vertical scrolling positon. */
    let lastVerticalScrollPosition = 0;
    /* The number of articles to load on the home page. */
    const limit = 10;
    let controller = new AbortController();
    let signal = controller.signal;

    window.addEventListener('load', onLoad);
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
    window.addEventListener('hashchange', onHashChangeEvent);
    window.addEventListener('popstate', onPopStateEvent);
    document.getElementById('theme').addEventListener('click', onThemeButtonClicked);

    function onLoad() {
        const page = getPage(document.location.hash);
        const theme = getTheme(document.location.search);

        if (!theme) {
            document.location.search = `theme=light`;
        } else {
            setThemeButtonText();
        }

        if (!page) {
            document.location.hash = '#home';
        }
        else if (page === 'home') {
            showHome();
        } else {
            showArticle(page);
        }

        document.title = getTitle(document.location.hash);
    }

    /** Only initialise the burger menu and go to top button once. */
    function onDOMContentLoaded() {
        initBurger();
        initNavbarItems();
        initGoToTopButton();
    }

    /** Add click listener tonavbar-burger button.
     * If an error occurs try to remove the navbar-burger button.
     */
    function initBurger() {
        try {
            document.querySelector('.navbar-burger').addEventListener('click', function (e) {
                e.currentTarget.classList.toggle('is-active');
                document.getElementById(e.currentTarget.dataset.target).classList.toggle('is-active');
            });
        } catch (e) {
            error(`Failed to initialise navbar-burger. ${e}.`);

            try {
                document.querySelector('.navbar-burger').remove();
            } catch (e) {
                error(`Failed to remove navbar-burger. ${e}.`);
            }
        }
    }

    /** When the user clicks on the logo or any of the navbar items, close
     * the burger menu.
      */
    function initNavbarItems() {
        try {
            Array.from(document.getElementsByClassName('navbar-item')).forEach(item => {
                item.addEventListener('click', function (e) {
                    const burger = document.querySelector('.navbar-burger');
                    burger.classList.remove('is-active');
                    document.getElementById(burger.dataset.target).classList.remove('is-active');
                });
            });
        } catch (e) {
            error(`Failed to remove navbar-burger. ${e}.`);
        }
    }

    /** Add click listener to go-to-top button.
     * If an error occurs try to remove the go-to-top button.
     */
    function initGoToTopButton() {
        try {
            document.getElementById('go-to-top').addEventListener('click', function () {
                /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY,
                the returned value is mostly scrollMaxY. To prevent this, we just need to set either at
                1 or window.scrollMaxY - 1. */
                window.scrollTo(0, 1);
            });
        } catch (e) {
            error(`Failed to initialise go-to-top button. ${e}.`);

            try {
                document.getElementById('go-to-top').remove();
            } catch (e) {
                error(`Failed to remove go-to-top button. ${e}.`);
            }
        }
    }

    /** Add click listeners to home items. If an error occurs, show the critical error page. */
    function initHome() {
        try {
            Array.from(document.getElementsByClassName('card')).forEach(card => {
                card.addEventListener('click', function (e) {
                    document.location.hash = e.currentTarget.getAttribute('url').split('/').pop().replace('.html', '');
                });
            });
        } catch (e) {
            error(`Failed to initialise home items. ${e}.`);
            errorCritical();
        }
    }

    /** Remember the scroll position and run onLoad. */
    function onHashChangeEvent(event) {
        rememberVerticalScrollPosition(getPage(event.oldURL), lastVerticalScrollPosition);
        onLoad();
    }

    /** When the user navigates, remember the vertical scroll position.
     * If we the hashchange event, it reports the wrong vertical scroll postion when the user
     * is close to the limits of the vertical scroll. Popstate is called before hashchange.
     */
    function onPopStateEvent() {
        lastVerticalScrollPosition = window.scrollY;
    }

    /** Show the article based on the given page name.
    * 
    * @param String page
    */
    function showArticle(page) {
        try {
            if (typeof (page) !== 'string') {
                errorParam('object', error, 'error', 'showError');
                showError(new Error(`Invalid page ${page}.`));
                return;
            }

            get(`https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/${page}.html`)
                .then((html) => showContent(html, false));
        } catch (e) {
            error(`Failed to show article with page ${page}. ${e}.`);
            showError(e);
        }
    }

    /** Show the error page with the given error message.
    * 
    * @param String error
    */
    function showError(error) {
        if (typeof (error) !== 'object') {
            errorParam('object', error, 'error', 'showError');
            errorCritical();
            return;
        }

        try {
            controller.abort();
            /* Reset abort controller. */
            controller = new AbortController();
            signal = controller.signal;
        } catch (e) {
            error(`Failed to abort and/or reset the AbortController ${controller} and signal ${signal}.`);
            errorCritical();
        }

        /* An error page should not rely on downloading a payload. If we use get, it will end up being an infinite loop. */
        showContent(`<div class="card m-6"> <div class="card-content"> <div class="media"> <div class="media-content"> <p class="title is-4">OOPS!</p> </div> </div> <div class="content"> <p>Looks like something went wrong!</p> <p id="error">Don't worry, here's the error:</p></div> </div> </div>`, false);

        try {
            let errorMessage = document.getElementById('error');

            /* If we cannot append the error reason to the body, it means the document is corrupted. */
            if (errorMessage) {
                errorMessage.insertAdjacentHTML('afterend', `<p>${error}<p>`);
                setTheme();
            } else {
                errorCritical();
            }
        } catch (e) {
            error(`Failed to show error. ${e}.`);
            errorCritical();
        }
    }

    /** Show the home page content.
     * Show the standalone critical error page if an error occurs.
    */
    function showHome() {
        try {
            get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
                .then((json) =>
                    Promise.all(parseArticles(json), false)
                        .then(() => {
                            setTheme();
                            scrollToY(getPage(document.location.hash), verticalScrollPositionHistory);
                            initHome();
                        })
                );
        } catch (e) {
            error(`Failed to show home content. ${e}.`);
            errorCritical();
        }
    }

    /** Parse the articles.json file and display it in content.
     * Returns an empty array on error.
     * 
     * @param String json
     * 
     * @return Promise[]
    */
    function parseArticles(json) {
        if (typeof (json) !== 'string') {
            errorParam('string', json, 'json', 'parseArticles');
            return [];
        }

        /* Clear out existing content. */
        showContent('', false);

        let jobs = [];

        try {
            JSON.parse(json).slice(0, limit).forEach(article =>
                jobs.push(get(article.url)
                    .then((html) => createHomeItem(html, article.url))
                    .then((article) => showContent(article, true)))
            );
            return jobs;
        } catch (e) {
            error(`Failed to parse articles with JSON ${json}. ${e}.`);
            showError(e);
        }

        return [];
    }

    /** Replace inner html of content with the new content html. Then scroll to the last known y position if it exists.
     * Shows critical error page if an error occurs.
     * 
     * @param String html
    */
    function showContent(html, append) {
        if (typeof (html) !== 'string') {
            errorParam('string', html, 'html', 'showContent');
            errorCritical();
            return;
        }

        if (typeof (append) !== 'boolean') {
            errorParam('boolean', append, 'append', 'showContent');
            errorCritical();
            return;
        }

        try {
            let content = document.getElementById('content');

            if (!content) {
                throw new Error("Unable to find an element with the id content");
            }

            if (append) {
                content.insertAdjacentHTML("afterbegin", html);
            } else {
                content.innerHTML = html;
                setTheme();
                scrollToY(getPage(document.location.hash), verticalScrollPositionHistory);
            }
        } catch (e) {
            /* An error here means that the document html has been corrupted.
            A standalone error page must be shown because the normal error relies on this
            method. */
            error(`Failed to show content with html ${html}, and append ${append}. ${e}.`);
            errorCritical();
        }
    }

    /** Scroll the the last known scroll y value given a hash and the hash history.
     * If hash is not in the hash history, then scroll to the top.
     * If an error occurs don't scroll.
     * 
     * @param String page
     * @param Object history
    */
    function scrollToY(page, history) {
        if (typeof (page) !== 'string') {
            errorParam('string', page, 'page', 'scrollToY');
            return;
        }

        if (typeof (history) !== 'object') {
            errorParam('object', history, 'history', 'scrollToY');
            return;
        }

        try {
            if (page in history) {
                window.scrollTo(0, history[page]);
            } else {
                /* There is a bug in chrome where scrolling to the top somehow causes it the window.scrollY to
                be equal to window.scrollMaxY. This might be due to an overflow of some kind? */
                window.scrollTo(0, 1);
            }
        } catch (e) {
            error(`Failed to scroll to Y on page ${page}, with history ${history}. ${e}.`);
        }
    }

    /** Get a resource from the given url.
     * Returns an empty string on error.
     * 
     * @param String url
     * 
     * @return String
    */
    function get(url) {
        if (typeof (url) !== 'string') {
            errorParam('string', url, 'url', 'get');
            return '';
        }

        return fetch(url, { signal })
            .then((response) => {
                if (response.ok) {
                    return response.text();
                } else {
                    error(`Failed to get from ${url}.`);
                    return '';
                }
            })
            .catch((e) => {
                error(`Failed to get from ${url}. ${e}.`);
                return '';
            });
    }

    /** Create a home item which is a shortened version of the actual article.
     * Returns an empty string on error.
     * 
     * @param String html
     * @param String url
     * 
     * @return String
    */
    function createHomeItem(html, url) {
        if (typeof (html) !== 'string') {
            errorParam('string', html, 'html', 'createHomeItem');
            return '';
        }

        if (typeof (url) !== 'string') {
            errorParam('string', url, 'url', 'createHomeItem');
            return '';
        }

        try {
            /* Create a temp element so we can store the article inside and transform it into a home item. */
            let temp = document.createElement('temp');
            temp.insertAdjacentHTML('afterbegin', html);

            /* Add interactive classes. */
            temp.querySelector('.card').classList.add('is-clickable', 'grow');

            /* Transform the article into a home item by removing all but the first paragraph. */
            let paragraphs = temp.querySelectorAll('.content p');

            for (let i = 0; i < paragraphs.length; i++) {
                if (i === 0) {
                    paragraphs[i].classList.add('truncate');
                } else {
                    paragraphs[i].remove();
                }
            }

            /* Add url as an attribute so that when they click on it, an event will allow them
            to navigate to the article. */
            temp.querySelector('.card').setAttribute('url', url);

            return temp.innerHTML;
        } catch (e) {
            error(`Failed to create home item with html ${html}, and url ${url}. ${e}.`);
        }

        return '';
    }

    /** Switch theme between light and dark when clicked.
    * Theme set to light when error occurs.
    */
    function onThemeButtonClicked() {
        const theme = getTheme(document.location.search);

        let newTheme = 'theme=light';

        if (theme === 'light') {
            newTheme = 'theme=dark';
        }

        document.location.search = newTheme;
    }

    /** Store the vertical scroll position.
    * Do nothing on error.
    * Set lastVerticalScrollPosition to 1 if not a number.
    * 
    * @param String page
    * @param Number lastVerticalScrollPosition
    */
    function rememberVerticalScrollPosition(page, lastVerticalScrollPosition) {
        if (typeof (page) !== 'string') {
            errorParam('string', page, 'page', 'rememberVerticalScrollPosition');
            return;
        }

        if (typeof (lastVerticalScrollPosition) !== 'number') {
            errorParam('number', lastVerticalScrollPosition, 'lastVerticalScrollPosition', 'rememberVerticalScrollPosition');
            lastVerticalScrollPosition = 1;
        }

        try {
            verticalScrollPositionHistory[page] = getVerticalScrollPosition(lastVerticalScrollPosition);
        } catch (e) {
            error(`Failed to set last vertical scroll position with value of ${lastVerticalScrollPosition} at page ${page}. ${e}.`);
        }
    }

    /** Get the adjusted vertical scroll position value based on the
    * given vertical scroll postision.
    * Returns 1 on error.
    * 
    * @param String lastVerticalScrollPosition
    * 
    * @return String
    */
    function getVerticalScrollPosition(lastVerticalScrollPosition) {
        if (typeof (lastVerticalScrollPosition) !== 'number') {
            errorParam('number', lastVerticalScrollPosition, 'lastVerticalScrollPosition', 'getVerticalScrollPosition');
            return 1;
        }

        try {
            /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY, then
           the returned value is mostly scrollMaxY. To prevent this, we just need to set either
           1 or window.scrollMaxY - 1. */
            if (lastVerticalScrollPosition <= 0) {
                return 1;
            } else if (lastVerticalScrollPosition >= window.scrollMaxY) {
                return window.scrollMaxY - 1;
            } else {
                return lastVerticalScrollPosition;
            }
        } catch (e) {
            error(`Failed to get last vertical scroll position with ${lastVerticalScrollPosition} at scrollMaxY value of ${window.scrollMaxY}. ${e}.`);
        }

        return 1;
    }

    /** Return the title string from a given page value.
     * Returns empty string on error.
     * 
     * @param String page
     * 
     * @return String
    */
    function getTitle(page) {
        if (typeof (page) !== 'string') {
            errorParam('string', page, 'page', 'getTitle');
            return '';
        }

        try {
            const title = toPascalCase(getPage(page).replace('_', ' '));

            if (title) {
                return `${title} - Huy Nguyen`;
            }
        } catch (e) {
            error(`Failed to get title from ${page}. ${e}.`);
        }

        return '';
    }

    /** Convert the given string to Pascal case.
     * Returns empty string on error.
     * Source: https://stackoverflow.com/questions/4068573/convert-string-to-pascal-case-aka-uppercamelcase-in-javascript
     * 
     * @param String value
     * 
     * @return String
    */
    function toPascalCase(value) {
        if (typeof (value) !== 'string') {
            errorParam('string', value, 'value', 'toPascalCase');
            return '';
        }

        try {
            return value.replace(/\w+/g, function (word) { return word[0].toUpperCase() + word.slice(1).toLowerCase(); });
        } catch (e) {
            error(`Failed to convert ${value} to Pascal case. ${e}.`);
        }

        return '';
    }

    /** Get the hash from the given url.
     * Returns empty string on error.
     * 
     * @param String url
     * 
     * @return String
    */
    function getPage(url) {
        if (typeof (url) !== 'string') {
            errorParam('string', url, 'url', 'getPage');
            return '';
        }

        try {
            return url.split('#').pop().split('?')[0];
        } catch (e) {
            error(`Failed to get page from ${url}. ${e}.`);
        }

        return '';
    }

    /** Get the theme from the given url.
     * Returns 'light' string on error.
     * 
     * @param String url
     * 
     * @return String
    */
    function getTheme(url) {
        if (typeof (url) !== 'string') {
            errorParam('string', url, 'url', 'getTheme');
            return 'light';
        }

        try {
            const theme = url.split('?').pop();

            if (theme.startsWith('theme=')) {
                const themeValue = theme.split('=').pop();

                if (themeValue === 'light' || themeValue === 'dark') {
                    return themeValue;
                }
            }
        } catch (e) {
            error(`Failed to get theme from ${url}. ${e}.`);
        }

        return 'light';
    }

    /** Set the theme based on the theme defined in the document.location.search. */
    function setTheme() {
        try {
            const elements = document.querySelectorAll('html, body, nav, footer, .card, .box, h1, p, button, a');
            const theme = getTheme(document.location.search);

            for (let i = 0; i < elements.length; i++) {
                if (theme === 'light') {
                    elements[i].classList.remove('has-background-dark', 'has-text-white');
                } else {
                    elements[i].classList.add('has-background-dark', 'has-text-white');
                }
            }
        } catch (e) {
            error(`Failed to set theme.`);
        }
    }

    /** Change the theme button text to current theme. */
    function setThemeButtonText() {
        try {
            const theme = getTheme(document.location.search);
            let themeText = 'Dark Mode';

            if (theme === 'dark') {
                themeText = 'Light Mode';
            }

            document.getElementById('theme').innerText = themeText;
        } catch (e) {
            error(`Failed to set themem buttion text with theme ${theme} and theme button ${document.getElementById('theme')}. ${e}.`);
        }
    }

    /** Write parameter error message.
     * 
     * @param String expected
     * @param any actual
     * @param String param
     * @param String method
     */
    function errorParam(expected, actual, param, method) {
        console.error(`Unexpected parameter ${param} in method ${method}. Expected ${expected}, got ${typeof (actual)}.`);
    }

    /** Write error message.
     * 
     * @param String message
     */
    function error(message) {
        console.error(message);
    }

    /** Show a standalone error page. This should only be used 
    * when we cannot show the normal error in the content element.
    * This means that the element used to show the content cannot be found.
    */
    function errorCritical() {
        /* Redirect user to critical error page. */
        window.location.href = 'html/critical.html';
    }
}());