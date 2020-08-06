/*jshint esversion: 6 */
/* jshint browser: true */
/*jslint devel: true */

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

    window.addEventListener('load', onLoadEvent);
    // document.addEventListener('DOMContentLoaded', onLoadEvent);
    window.addEventListener('hashchange', onHashChangeEvent);
    window.addEventListener('popstate', onPopStateEvent);
    document.getElementById('theme').addEventListener('click', onThemeClicked);
    document.getElementById('go-to-top').addEventListener('click', onGoToTopClicked);

    function onLoadEvent() {
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

    function onHashChangeEvent(event) {
        rememberVerticalScrollPosition(getPage(event.oldURL));
        onLoadEvent();
    }

    function onPopStateEvent() {
        /* When the user navigates, remember the vertical scroll position. 
        If we the hashchange event, it reports the wrong vertical scroll postion when the user
        is close to the limits of the vertical scroll.
        Popstate is called before hashchange. */
        lastVerticalScrollPosition = window.scrollY;
    }

    /** Show the article based on the given page name.
    * 
    * @param String page
    */
    function showArticle(page) {
        try {
            if (typeof (page) !== 'string') {
                throw new Error(`The parameter page in the function showArticle 
            is undefined or not a string. Expected string, got ${typeof (page)}.`);
            }

            get(`https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/${page}.html`)
                .then((html) => showContent(html, false));
        } catch (error) {
            showError(error);
        }
    }

    /** Show the error page with the given error message.
    * 
    * @param String error
    */
    function showError(error) {
        if (typeof (error) !== 'string' && typeof (error) !== 'object') {
            throw new Error(`The parameter error in the function showError 
            is undefined or not a string or object. Expected string or object, got ${typeof (error)}.`);
        }

        controller.abort();
        /* Reset abort controller. */
        controller = new AbortController();
        signal = controller.signal;

        /* An error page should not rely on downloading a payload. If we use get, it will end up being an infinite loop. */
        showContent(`<div class="article"><div class="article-header"><h2 class="article-title">
        OOPS!</h2></div><div class="article-body"><p>Looks like something went wrong!</p><p>Don\'t 
        worry here\'s the error:</p></div></div>`, false);

        let articleBody = document.querySelector('.article-body');

        /* If we cannot append the error reason to the body, it means the document is corrupted. */
        if (articleBody) {
            articleBody.innerHTML += `<p>${error}<p>`;
            setTheme();
        } else {
            showCriticalErrorPage();
        }
    }

    function showHome() {
        get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json')
            .then((json) =>
                Promise.all(parseArticles(json), false)
                    .then(() => {
                        scrollToY(getPage(document.location.hash), verticalScrollPositionHistory);
                        setTheme();
                    })
            );

    }

    /** Parse the articles.json file and display it in content. Return a list of jobs. 
     * 
     * @param String json
     * 
     * @returns Promise[]
    */
    function parseArticles(json) {
        if (typeof (json) !== 'string') {
            throw new Error(`The parameter json in the function parseArticles 
            is undefined or not a string. Expected string, got ${typeof (json)}.`);
        }

        /* Clear out existing content. */
        showContent('', false);

        let jobs = [];
        try {
            JSON.parse(json).slice(0, limit).forEach(article =>
                jobs.push(get(article.url)
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
        if (typeof (html) !== 'string') {
            throw new Error(`The parameter html in the function showContent 
            is undefined or not a string. Expected string, got ${typeof (html)}.`);
        }

        if (typeof (append) !== 'boolean') {
            throw new Error(`The parameter append in the function showContent 
            is undefined or not a boolean. Expected boolean, got ${typeof (append)}.`);
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
                setTheme();
                scrollToY(getPage(document.location.hash), verticalScrollPositionHistory);
            }
        } catch (error) {
            /* An error here means that the document html is has been corrupted.
            A standalone error page must be shown becuase the normal error relies on this
            method. */
            console.error(error);
            showCriticalErrorPage();
        }
    }

    /** Scroll the the last known scroll y value given a hash and the hash history.
     * If hash is not in the hash history, then scroll to the top.
     * 
     * @param String page
     * @param Array history
    */
    function scrollToY(page, history) {
        if (typeof (page) !== 'string') {
            throw new Error(`The parameter page in the function scrollToY 
            is undefined or not a string. Expected string, got ${typeof (page)}.`);
        }

        if (typeof (history) !== 'object') {
            throw new Error(`The parameter history in the function scrollToY 
            is undefined or not a object. Expected object, got ${typeof (history)}.`);
        }

        try {
            if (page in history) {
                window.scrollTo(0, history[page]);
            } else {
                /* There is a bug in chrome where scrolling to the top somehow causes it the window.scrollY to
                be equal to window.scrollMaxY. This might be due to an overflow of some kind? */
                window.scrollTo(0, 1);
            }
        } catch (error) {
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
        if (typeof (url) !== 'string') {
            throw new Error(`The parameter url in the function get 
            is undefined or not a string. Expected string, got ${typeof (url)}.`);
        }

        return fetch(url, { signal })
            .then((response) => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error(`Failed to load ${url}.`);
                }
            })
            .catch((error) => {
                console.log(error);
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
        if (typeof (html) !== 'string') {
            throw new Error(`The parameter html in the function createHomeItem 
            is undefined or not a string. Expected string, got ${typeof (html)}.`);
        }

        if (typeof (url) !== 'string') {
            throw new Error(`The parameter url in the function createHomeItem 
            is undefined or not a string. Expected string, got ${typeof (url)}.`);
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
            showError(error);
        }
    }

    function showCriticalErrorPage() {
        controller.abort();
        /* Reset abort controller. */
        controller = new AbortController();
        signal = controller.signal;
        /* Show a standalone error page. This should only be used
        when we cannot show the normal error in the content element. 
        This means that the element used to show the content cannot be
        found. */
        window.location.href = 'html/critical.html';
    }

    function onGoToTopClicked() {
        /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY,
       the returned value is mostly scrollMaxY. To prevent this, we just need to set either at
       1 or window.scrollMaxY - 1. */
        window.scrollTo(0, 1);
    }

    function onThemeClicked() {
        const theme = getTheme(document.location.search);
        let newTheme = 'theme=dark';

        if (theme === 'dark') {
            newTheme = 'theme=light';
        }

        document.location.search = newTheme;
    }

    /** Store the vertical scroll postision.
    * 
    * @param String page
    */
    function rememberVerticalScrollPosition(page) {
        if (typeof (page) !== 'string') {
            throw new Error(`The parameter page in the function rememberVerticalScrollPosition 
            is undefined or not a string. Expected string, got ${typeof (page)}.`);
        }

        verticalScrollPositionHistory[page] =
            getVerticalScrollPosition(lastVerticalScrollPosition);
    }

    /** Return an adjusted vertical scroll postision value based on the
    * given vertical scroll postision;
    * 
    * @param String page
    * 
    * @returns String
    */
    function getVerticalScrollPosition(lastVerticalScrollPosition) {
        if (typeof (lastVerticalScrollPosition) !== 'number') {
            throw new Error(`The parameter lastVerticalScrollPosition in the 
            function getVerticalScrollPosition is undefined or not a number. 
            Expected number, got ${typeof (lastVerticalScrollPosition)}.`);
        }

        let verticalScrollPosition = 1;

        /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY,
       the returned value is mostly scrollMaxY. To prevent this, we just need to set either at
       1 or window.scrollMaxY - 1. */
        if (lastVerticalScrollPosition <= 0) {
            verticalScrollPosition = 1;
        } else if (lastVerticalScrollPosition >= window.scrollMaxY) {
            verticalScrollPosition = window.scrollMaxY - 1;
        } else {
            verticalScrollPosition = lastVerticalScrollPosition;
        }

        return verticalScrollPosition;
    }

    /** Return the title string from a given page value.
     * 
     * @param String page
     * 
     * @returns String
    */
    function getTitle(page) {
        if (typeof (page) !== 'string') {
            throw new Error(`The parameter page in the function setTitle is 
            undefined or not a string. Expected string, got ${typeof (page)}.`);
        }

        return `${toPascalCase(getPage(page).replace('_', ' '))} - Huy Nguyen`;
    }

    /** Convert a string to Pascal case.
     * 
     * @param String string
     * 
     * @returns String
    */
    function toPascalCase(string) {
        /* Source: https://stackoverflow.com/questions/4068573/convert-string-to-pascal-case-aka-uppercamelcase-in-javascript */
        if (typeof (string) !== 'string') {
            throw new Error(`The parameter string in the function toPascalCase 
            is undefined or not a string. Expected string, got ${typeof (string)}.`);
        }

        return string.replace(/\w+/g,
            function (word) { return word[0].toUpperCase() + word.slice(1).toLowerCase(); });
    }

    /** Return the page value from a given url.
     * 
     * @param String url
     * 
     * @returns String
    */
    function getPage(url) {
        if (typeof (url) !== 'string') {
            throw new Error(`The parameter url in the function getPage is 
            undefined or not a string. Expected string, got ${typeof (url)}.`);
        }

        return url.split('#').pop().split('?')[0];
    }

    /** Return the theme value from a given url.
     * 
     * @param String url
     * 
     * @returns String
    */
    function getTheme(url) {
        if (typeof (url) !== 'string') {
            throw new Error(`The parameter url in the function getTheme is 
            undefined or not a string. Expected string, got ${typeof (url)}.`);
        }

        const theme = url.split('?').pop();
        let value = '';

        if (theme.startsWith('theme=')) {
            const themeValue = theme.split('=').pop();

            if (themeValue === 'light' || themeValue === 'dark') {
                value = themeValue;
            }
        }

        return value;
    }

    function setTheme() {
        const elements = document.querySelectorAll('body, a, h2, p');
        const theme = getTheme(document.location.search);

        for (let i = 0; i < elements.length; i++) {
            if (theme === 'light') {
                elements[i].classList.remove("dark-mode");
            } else {
                elements[i].classList.add("dark-mode");
            }
        }
    }

    function setThemeButtonText() {
        const theme = getTheme(document.location.search);
        let themeText = '[Dark Mode]';

        if (theme === 'dark') {
            themeText = '[Light Mode]';
        }

        document.getElementById('theme').innerText = themeText;
    }
}());